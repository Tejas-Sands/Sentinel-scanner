"""Unified Cache Manager supporting in-memory caching and Upstash Serverless Redis REST API.

Provides seamless local-to-production migration with zero extra dependencies
by leveraging Upstash's highly performant HTTPS REST interface.
"""

import json
import logging
import time
from typing import Any, Optional

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

# Local in-memory fallback cache: key -> (json_string, expiry_timestamp)
_local_cache: dict[str, tuple[str, float]] = {}


async def get_cache(key: str) -> Optional[Any]:
    """
    Retrieve an item from the cache.
    Tries Upstash Redis if configured; falls back to in-memory cache.
    """
    settings = get_settings()

    # 1. Attempt Upstash Redis lookup
    if settings.redis_url and settings.redis_token:
        try:
            base_url = settings.redis_url.rstrip("/")
            url = f"{base_url}/get/{key}"
            headers = {"Authorization": f"Bearer {settings.redis_token}"}

            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    res_json = resp.json()
                    result = res_json.get("result")
                    if result is not None:
                        # Upstash returns the exact string value stored
                        return json.loads(result)
        except Exception as e:
            logger.debug("Upstash Redis get failed for %s: %s (falling back to memory)", key, e)

    # 2. Local In-Memory Fallback
    if key in _local_cache:
        val_str, expiry = _local_cache[key]
        if expiry == 0 or time.time() < expiry:
            try:
                return json.loads(val_str)
            except Exception:
                pass
        else:
            del _local_cache[key]
            
    return None


async def set_cache(key: str, value: Any, ttl_seconds: int = 3600) -> None:
    """
    Write an item to the cache with a Time-To-Live (TTL).
    Saves to local memory and attempts to write to Upstash Redis if configured.
    """
    settings = get_settings()
    val_str = json.dumps(value)

    # 1. Store in Local In-Memory Cache
    expiry = time.time() + ttl_seconds if ttl_seconds > 0 else 0
    _local_cache[key] = (val_str, expiry)

    # 2. Store in Upstash Redis Cache
    if settings.redis_url and settings.redis_token:
        try:
            base_url = settings.redis_url.rstrip("/")
            url = f"{base_url}/set/{key}"
            headers = {"Authorization": f"Bearer {settings.redis_token}"}

            # Upstash REST params: ex = expiry in seconds
            params = {}
            if ttl_seconds > 0:
                params["ex"] = str(ttl_seconds)

            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(url, content=val_str, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.debug("Upstash Redis set responded with non-200: %s", resp.text)
        except Exception as e:
            logger.debug("Upstash Redis set failed for %s: %s", key, e)
