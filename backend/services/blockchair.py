"""Blockchair API client — optional cross-chain address context.

Requires a free API key (apply at blockchair.com). If no key is configured,
all functions gracefully return None. Rate limit: 30 req/min.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(2)  # Conservative rate limiting
_cache: Dict[str, tuple[Any, float]] = {}
_CACHE_TTL = 600  # 10 minutes


async def get_address_stats(address: str) -> Optional[Dict[str, Any]]:
    """
    Fetch address stats from Blockchair (balance, tx count, first/last seen).
    Attempts a keyless query if blockchair_api_key is not configured, falling back gracefully on rate limits.
    """
    settings = get_settings()
    
    cache_key = address.lower()
    if cache_key in _cache:
        data, ts = _cache[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return data

    async with _semaphore:
        try:
            url = f"https://api.blockchair.com/ethereum/dashboards/address/{address}"
            params = {}
            if settings.blockchair_api_key:
                params["key"] = settings.blockchair_api_key

            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    addr_data = data.get("data", {}).get(address.lower(), {})
                    address_info = addr_data.get("address", {})

                    result = {
                        "balance_usd": address_info.get("balance_usd", 0),
                        "balance_eth": float(address_info.get("balance", 0)) / 1e18,
                        "tx_count": address_info.get("transaction_count", 0),
                        "first_seen": address_info.get("first_seen_receiving"),
                        "last_seen": address_info.get("last_seen_receiving"),
                        "call_count": address_info.get("call_count", 0),
                        "source": "blockchair.com",
                    }
                    _cache[cache_key] = (result, time.time())
                    return result
                elif resp.status_code in (402, 429, 430):
                    logger.warning("Blockchair rate limit hit or blocked (HTTP %d). Bypassing gracefully...", resp.status_code)
                else:
                    logger.debug("Blockchair HTTP %d for %s", resp.status_code, address[:10])

        except Exception as e:
            logger.debug("Blockchair keyless/api request failed gracefully: %s", e)

    return None
