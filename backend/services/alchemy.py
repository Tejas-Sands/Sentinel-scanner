"""Alchemy API client for fetching Ethereum transaction data."""

import logging
import time
from typing import Any, Optional

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

# In-memory cache: address -> (data, timestamp)
_cache: dict[str, tuple[dict, float]] = {}


def _cache_key(address: str, direction: str) -> str:
    return f"{address.lower()}:{direction}"


def _get_cached(key: str) -> Optional[dict]:
    """Get cached data if still within TTL."""
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < get_settings().alchemy_cache_ttl:
            logger.debug("Cache hit for %s", key)
            return data
        del _cache[key]
    return None


def _set_cache(key: str, data: dict) -> None:
    """Store data in cache with current timestamp."""
    _cache[key] = (data, time.time())


async def get_asset_transfers(
    address: str,
    direction: str = "both",
    max_count: int = 100,
) -> list[dict[str, Any]]:
    """
    Fetch asset transfers for an address using alchemy_getAssetTransfers.

    Args:
        address: Ethereum address (0x-prefixed)
        direction: 'from', 'to', or 'both'
        max_count: Maximum number of results (up to 1000)

    Returns:
        List of transfer objects from Alchemy API
    """
    settings = get_settings()
    if not settings.alchemy_api_key:
        logger.warning("No Alchemy API key configured — returning empty transfers")
        return []

    all_transfers: list[dict] = []

    directions = []
    if direction in ("from", "both"):
        directions.append("from")
    if direction in ("to", "both"):
        directions.append("to")

    hex_count = hex(min(max_count, 1000))

    async with httpx.AsyncClient(timeout=15.0) as client:
        for d in directions:
            cache_key = _cache_key(address, d)
            cached = _get_cached(cache_key)
            if cached is not None:
                all_transfers.extend(cached.get("transfers", []))
                continue

            params: dict[str, Any] = {
                "fromBlock": "0x0",
                "toBlock": "latest",
                "category": ["external", "erc20"],
                "excludeZeroValue": True,
                "maxCount": hex_count,
                "order": "desc",
            }
            if d == "from":
                params["fromAddress"] = address
            else:
                params["toAddress"] = address

            payload = {
                "id": 1,
                "jsonrpc": "2.0",
                "method": "alchemy_getAssetTransfers",
                "params": [params],
            }

            try:
                resp = await client.post(
                    settings.alchemy_url,
                    json=payload,
                    headers={
                        "accept": "application/json",
                        "content-type": "application/json",
                    },
                )
                resp.raise_for_status()
                result = resp.json()

                if "result" in result and "transfers" in result["result"]:
                    transfers = result["result"]["transfers"]
                    _set_cache(cache_key, {"transfers": transfers})
                    all_transfers.extend(transfers)
                    logger.info(
                        "Fetched %d %s-transfers for %s",
                        len(transfers), d, address[:10],
                    )
                elif "error" in result:
                    logger.error("Alchemy API error: %s", result["error"])

            except httpx.TimeoutException:
                logger.error("Alchemy API timeout for %s (%s)", address[:10], d)
            except httpx.HTTPStatusError as e:
                logger.error("Alchemy HTTP error %d: %s", e.response.status_code, str(e))
            except Exception as e:
                logger.error("Alchemy unexpected error: %s", str(e))

    return all_transfers


async def get_eth_balance(address: str) -> Optional[float]:
    """Get current ETH balance for an address."""
    settings = get_settings()
    if not settings.alchemy_api_key:
        return None

    payload = {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [address, "latest"],
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.alchemy_url,
                json=payload,
                headers={"content-type": "application/json"},
            )
            resp.raise_for_status()
            result = resp.json()
            if "result" in result:
                # Convert from wei (hex) to ETH
                wei = int(result["result"], 16)
                return wei / 1e18
    except Exception as e:
        logger.error("Failed to get ETH balance: %s", str(e))

    return None


def clear_cache() -> None:
    """Clear the transfer cache."""
    _cache.clear()
