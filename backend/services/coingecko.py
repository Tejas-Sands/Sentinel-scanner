"""CoinGecko API client for ETH price lookups."""

import logging
import time
from typing import Optional

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

# Price cache: date_str -> (price_usd, timestamp)
_price_cache: dict[str, tuple[float, float]] = {}


async def get_eth_price_at_date(date_str: str) -> float:
    """
    Get ETH price in USD at a specific date.

    Args:
        date_str: Date in 'dd-mm-yyyy' format (CoinGecko format)

    Returns:
        ETH price in USD, or fallback price if rate limited
    """
    settings = get_settings()

    # Check cache first
    if date_str in _price_cache:
        price, ts = _price_cache[date_str]
        # Cache for 1 hour
        if time.time() - ts < 3600:
            return price

    url = f"https://api.coingecko.com/api/v3/coins/ethereum/history"
    params = {"date": date_str, "localization": "false"}

    headers = {"accept": "application/json"}
    if settings.coingecko_api_key:
        headers["x-cg-demo-api-key"] = settings.coingecko_api_key

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)

            if resp.status_code == 429:
                logger.warning("CoinGecko rate limited — using fallback price $%.0f", settings.eth_price_fallback)
                return settings.eth_price_fallback

            resp.raise_for_status()
            data = resp.json()

            price = data.get("market_data", {}).get("current_price", {}).get("usd")
            if price is not None:
                _price_cache[date_str] = (price, time.time())
                return price

    except httpx.TimeoutException:
        logger.warning("CoinGecko timeout — using fallback price")
    except Exception as e:
        logger.warning("CoinGecko error: %s — using fallback price", str(e))

    return settings.eth_price_fallback


async def get_current_eth_price() -> float:
    """Get current ETH price in USD."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "ethereum", "vs_currencies": "usd"},
                headers={"accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("ethereum", {}).get("usd", get_settings().eth_price_fallback)
    except Exception as e:
        logger.warning("Failed to get current ETH price: %s", str(e))
        return get_settings().eth_price_fallback
