"""Etherscan API client — internal txs, ERC-20 transfers, contract verification.

Free tier: 5 calls/sec, 1000 records/page.
Uses Etherscan V2 unified API with chainid=1 for Ethereum Mainnet.
"""

import asyncio
import logging
import time
from typing import Any, Optional

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

# Rate limiter: 5 concurrent requests max
_semaphore = asyncio.Semaphore(5)

from services.cache_manager import get_cache, set_cache

_CACHE_TTL = 300  # 5 minutes
BASE_URL = "https://api.etherscan.io/v2/api"


def _cache_key(address: str, action: str) -> str:
    return f"etherscan:{address.lower()}:{action}"


async def _etherscan_request(params: dict) -> Optional[dict]:
    """Make a rate-limited request to the Etherscan API."""
    settings = get_settings()
    if not settings.etherscan_api_key:
        return None

    params["apikey"] = settings.etherscan_api_key
    params["chainid"] = "1"

    async with _semaphore:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(BASE_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "1" or data.get("message") == "OK":
                        return data
                    # Some endpoints return status=0 with a valid empty result
                    if data.get("message") == "No transactions found":
                        return {"result": []}
                    logger.debug("Etherscan non-OK response: %s", data.get("message"))
                    return data
                else:
                    logger.warning("Etherscan HTTP %d", resp.status_code)
        except Exception as e:
            logger.error("Etherscan request failed: %s", e)
    return None


async def get_internal_transactions(address: str, max_results: int = 100) -> list[dict]:
    """Fetch internal transactions for an address (delegatecalls, self-destructs, value transfers)."""
    key = _cache_key(address, "txlistinternal")
    cached = await get_cache(key)
    if cached is not None:
        return cached

    params = {
        "module": "account",
        "action": "txlistinternal",
        "address": address,
        "startblock": "0",
        "endblock": "99999999",
        "page": "1",
        "offset": str(min(max_results, 1000)),
        "sort": "desc",
    }
    data = await _etherscan_request(params)
    result = data.get("result", []) if data and isinstance(data.get("result"), list) else []
    await set_cache(key, result, _CACHE_TTL)
    return result


async def get_erc20_transfers(address: str, max_results: int = 100) -> list[dict]:
    """Fetch ERC-20 token transfer events for an address."""
    key = _cache_key(address, "tokentx")
    cached = await get_cache(key)
    if cached is not None:
        return cached

    params = {
        "module": "account",
        "action": "tokentx",
        "address": address,
        "startblock": "0",
        "endblock": "99999999",
        "page": "1",
        "offset": str(min(max_results, 1000)),
        "sort": "desc",
    }
    data = await _etherscan_request(params)
    result = data.get("result", []) if data and isinstance(data.get("result"), list) else []
    await set_cache(key, result, _CACHE_TTL)
    return result


async def get_normal_transactions(address: str, max_results: int = 100) -> list[dict]:
    """Fetch normal (external) transaction history for dormancy analysis."""
    key = _cache_key(address, "txlist")
    cached = await get_cache(key)
    if cached is not None:
        return cached

    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": "0",
        "endblock": "99999999",
        "page": "1",
        "offset": str(min(max_results, 1000)),
        "sort": "desc",
    }
    data = await _etherscan_request(params)
    result = data.get("result", []) if data and isinstance(data.get("result"), list) else []
    await set_cache(key, result, _CACHE_TTL)
    return result


async def get_contract_info(address: str) -> Optional[dict]:
    """Check if a contract is verified and get its source code status."""
    key = _cache_key(address, "getabi")
    cached = await get_cache(key)
    if cached is not None:
        return cached

    # First check if it's a contract by getting its ABI
    params = {
        "module": "contract",
        "action": "getabi",
        "address": address,
    }
    data = await _etherscan_request(params)
    if not data:
        return None

    is_verified = data.get("status") == "1"

    # Get source code info
    src_params = {
        "module": "contract",
        "action": "getsourcecode",
        "address": address,
    }
    src_data = await _etherscan_request(src_params)
    
    source_info = {}
    if src_data and isinstance(src_data.get("result"), list) and src_data["result"]:
        src = src_data["result"][0]
        source_info = {
            "contract_name": src.get("ContractName", ""),
            "compiler": src.get("CompilerVersion", ""),
            "optimization": src.get("OptimizationUsed", ""),
            "is_proxy": bool(src.get("Implementation", "")),
        }

    result = {
        "is_verified": is_verified,
        "is_contract": True,  # If we got here via contract endpoints
        **source_info,
    }
    await set_cache(key, result, _CACHE_TTL)
    return result


async def analyze_etherscan_data(address: str) -> dict[str, Any]:
    """
    Run all Etherscan analyses in parallel and return a consolidated result.
    
    Returns dict with:
        internal_txs: list of internal transactions
        erc20_transfers: list of ERC-20 transfers
        normal_txs: list of normal transactions
        contract_info: dict or None
        has_internal_self_destruct: bool
        has_delegatecall: bool
        dormancy_days: int (days between last two activity periods)
        unique_tokens_interacted: int
    """
    settings = get_settings()
    if not settings.etherscan_enabled or not settings.etherscan_api_key:
        return {"enabled": False}

    # Run all queries in parallel
    internal_txs, erc20_transfers, normal_txs, contract_info = await asyncio.gather(
        get_internal_transactions(address),
        get_erc20_transfers(address),
        get_normal_transactions(address),
        get_contract_info(address),
    )

    # Analyze internal txs for suspicious patterns
    has_self_destruct = any(
        tx.get("type", "").lower() == "suicide" or tx.get("type", "").lower() == "selfdestruct"
        for tx in internal_txs
    )
    has_delegatecall = any(
        tx.get("type", "").lower() == "delegatecall"
        for tx in internal_txs
    )

    # Analyze dormancy patterns from normal txs
    dormancy_days = 0
    if normal_txs and len(normal_txs) >= 2:
        try:
            timestamps = sorted([int(tx.get("timeStamp", "0")) for tx in normal_txs if tx.get("timeStamp")])
            if len(timestamps) >= 2:
                # Find the largest gap between consecutive transactions
                max_gap = 0
                for i in range(1, len(timestamps)):
                    gap = timestamps[i] - timestamps[i - 1]
                    max_gap = max(max_gap, gap)
                dormancy_days = max_gap // 86400
        except (ValueError, TypeError):
            pass

    # Count unique tokens
    unique_tokens = set()
    for tx in erc20_transfers:
        token_addr = tx.get("contractAddress", "")
        if token_addr:
            unique_tokens.add(token_addr.lower())

    return {
        "enabled": True,
        "internal_txs": internal_txs[:50],
        "erc20_transfers": erc20_transfers[:50],
        "normal_txs": normal_txs[:50],
        "contract_info": contract_info,
        "has_internal_self_destruct": has_self_destruct,
        "has_delegatecall": has_delegatecall,
        "dormancy_days": dormancy_days,
        "unique_tokens_interacted": len(unique_tokens),
        "unique_token_addresses": list(unique_tokens)[:20],
        "internal_tx_count": len(internal_txs),
        "erc20_tx_count": len(erc20_transfers),
    }
