"""ENS reverse resolution and phishing domain cross-reference.

Uses Alchemy RPC for ENS lookups. Cross-references against MetaMask's
eth-phishing-detect domain blocklist.
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any, Set

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

from services.cache_manager import get_cache, set_cache

_ENS_CACHE_TTL = 86400  # 24 hours

_phishing_domains: Set[str] = set()
_domains_last_fetch: float = 0
_domains_lock = asyncio.Lock()

METAMASK_PHISHING_URL = "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json"


async def _load_phishing_domains() -> Set[str]:
    global _phishing_domains, _domains_last_fetch
    if time.time() - _domains_last_fetch < 3600 and _phishing_domains:
        return _phishing_domains
    async with _domains_lock:
        if time.time() - _domains_last_fetch < 3600 and _phishing_domains:
            return _phishing_domains
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(METAMASK_PHISHING_URL)
                if resp.status_code == 200:
                    data = resp.json()
                    new_domains: Set[str] = set()
                    for domain in data.get("blocklist", []):
                        if isinstance(domain, str):
                            new_domains.add(domain.lower().strip())
                    for domain in data.get("fuzzylist", []):
                        if isinstance(domain, str):
                            new_domains.add(domain.lower().strip())
                    if new_domains:
                        _phishing_domains = new_domains
                        _domains_last_fetch = time.time()
                        logger.info("MetaMask phishing domains loaded: %d", len(_phishing_domains))
        except Exception as e:
            logger.error("Failed to fetch MetaMask phishing domains: %s", e)
    return _phishing_domains


async def resolve_ens_name(address: str) -> Optional[str]:
    """Reverse-resolve an Ethereum address to its primary ENS name via Alchemy."""
    addr_lower = address.lower()
    cache_key = f"ens:{addr_lower}"
    cached = await get_cache(cache_key)
    if cached is not None:
        return cached if cached != "" else None

    settings = get_settings()
    if not settings.alchemy_api_key:
        return None
    try:
        url = f"https://eth-mainnet.g.alchemy.com/v2/{settings.alchemy_api_key}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            payload = {"jsonrpc": "2.0", "id": 1, "method": "alchemy_resolveName", "params": [addr_lower]}
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("result")
                if result and isinstance(result, str) and "." in result:
                    await set_cache(cache_key, result, _ENS_CACHE_TTL)
                    return result
        # Cache negative resolution for 1 hour to prevent Alchemy RPC spam
        await set_cache(cache_key, "", 3600)
        return None
    except Exception as e:
        logger.debug("ENS resolution failed for %s: %s", address[:10], e)
        return None


def is_phishing_domain(domain: str) -> bool:
    if not domain or not _phishing_domains:
        return False
    domain_lower = domain.lower().strip()
    if domain_lower in _phishing_domains:
        return True
    base = domain_lower.replace(".eth", "").replace(".xyz", "").replace(".com", "")
    if base in _phishing_domains:
        return True
    for phish in _phishing_domains:
        if phish in domain_lower and len(phish) > 4:
            return True
    return False


async def get_ens_data(address: str) -> Dict[str, Any]:
    """Get ENS intelligence: name resolution + phishing domain check."""
    _, ens_name = await asyncio.gather(_load_phishing_domains(), resolve_ens_name(address))
    is_phishing = False
    if ens_name:
        is_phishing = is_phishing_domain(ens_name)
    return {
        "ens_name": ens_name,
        "has_ens": ens_name is not None,
        "is_phishing": is_phishing,
        "phishing_match": ens_name if is_phishing else None,
    }
