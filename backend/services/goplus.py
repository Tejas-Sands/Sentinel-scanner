"""GoPlus Security API client — free fraud/phishing detection for Ethereum addresses."""

import logging
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

# In-memory cache: address -> (data, timestamp)
_goplus_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 300  # 5 minutes


def _get_cached(address: str) -> Optional[dict]:
    if address in _goplus_cache:
        data, ts = _goplus_cache[address]
        if time.time() - ts < _CACHE_TTL:
            return data
        del _goplus_cache[address]
    return None


async def check_address_security(address: str) -> dict[str, Any]:
    """
    Query GoPlus Security API for address risk indicators.

    Returns dict with keys:
        is_malicious: bool
        phishing_activities: bool
        blacklist_doubt: bool
        honeypot_related_address: bool
        data_source: str
        raw: dict (full GoPlus response)

    GoPlus API is free and requires no API key.
    Docs: https://docs.gopluslabs.com/reference/address-security
    """
    addr_lower = address.lower()

    cached = _get_cached(addr_lower)
    if cached is not None:
        logger.debug("GoPlus cache hit for %s", addr_lower[:10])
        return cached

    result = {
        "is_malicious": False,
        "phishing_activities": False,
        "blacklist_doubt": False,
        "honeypot_related_address": False,
        "stealing_attack": False,
        "cybercrime": False,
        "money_laundering": False,
        "financial_crime": False,
        "malicious_mining_activities": False,
        "mixer_address": False,
        "data_source": "gopluslabs.com",
        "raw": {}
    }

    # GoPlus API requires a chain_id parameter (1 for Ethereum Mainnet)
    params = {"chain_id": "1"}

    # Attempt both V1 and V3 endpoints
    urls = [
        f"https://api.gopluslabs.com/api/v1/address_security/{addr_lower}",
        f"https://api.gopluslabs.com/api/v3/address_security/{addr_lower}"
    ]

    for try_url in urls:
        try:
            # permissive SSL context to avoid SNI issues
            async with httpx.AsyncClient(verify=False, timeout=12.0, follow_redirects=True) as client:
                resp = await client.get(try_url, params=params)
                
                if resp.status_code == 200:
                    data = resp.json()
                    # Schema check
                    res = data.get("result", {})
                    if not res and isinstance(data, dict):
                        # Some versions return the result at the top level
                        res = data
                    
                    if res:
                        result = {
                            "is_malicious": any([
                                res.get("phishing_activities") == "1",
                                res.get("blacklisted") == "1",
                                res.get("malicious_address") == "1",
                                res.get("honeypot_related_address") == "1",
                                res.get("stealing_attack") == "1",
                                res.get("cybercrime") == "1",
                                res.get("money_laundering") == "1"
                            ]),
                            "phishing_activities": res.get("phishing_activities") == "1",
                            "blacklist_doubt": res.get("blacklist_doubt") == "1",
                            "honeypot_related_address": res.get("honeypot_related_address") == "1",
                            "stealing_attack": res.get("stealing_attack") == "1",
                            "cybercrime": res.get("cybercrime") == "1",
                            "money_laundering": res.get("money_laundering") == "1",
                            "financial_crime": res.get("financial_crime") == "1",
                            "malicious_mining_activities": res.get("malicious_mining_activities") == "1",
                            "mixer_address": res.get("mixer_address") == "1" or res.get("mixer") == "1",
                            "data_source": "gopluslabs.com",
                            "raw": res
                        }
                        break
        except Exception as e:
            logger.debug("GoPlus attempt failed for %s: %s", try_url, e)
            continue

    _goplus_cache[addr_lower] = (result, time.time())
    return result


# --------------------------------------------------------------------------- #
#  Token Security — honeypot detection, mint authority, blacklist functions
# --------------------------------------------------------------------------- #

_token_cache: dict[str, tuple[dict, float]] = {}


async def check_token_security(contract_address: str, chain_id: str = "1") -> dict[str, Any]:
    """
    Query GoPlus Token Security API for a token contract.
    Detects honeypots, hidden mints, trading cooldowns, blacklist mechanisms.
    Free, no key required.
    """
    addr_lower = contract_address.lower()
    cache_key = f"token:{addr_lower}"

    if cache_key in _token_cache:
        data, ts = _token_cache[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return data

    result = {
        "is_honeypot": False,
        "has_mint_function": False,
        "can_blacklist": False,
        "has_trading_cooldown": False,
        "buy_tax": 0.0,
        "sell_tax": 0.0,
        "is_open_source": False,
        "is_proxy": False,
        "holder_count": 0,
    }

    try:
        url = f"https://api.gopluslabs.com/api/v1/token_security/{chain_id}"
        async with httpx.AsyncClient(verify=False, timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, params={"contract_addresses": addr_lower})
            if resp.status_code == 200:
                data = resp.json()
                token_data = data.get("result", {}).get(addr_lower, {})
                if token_data:
                    result = {
                        "is_honeypot": token_data.get("is_honeypot") == "1",
                        "has_mint_function": token_data.get("is_mintable") == "1",
                        "can_blacklist": token_data.get("is_blacklisted") == "1",
                        "has_trading_cooldown": token_data.get("trading_cooldown") == "1",
                        "buy_tax": float(token_data.get("buy_tax", "0") or "0"),
                        "sell_tax": float(token_data.get("sell_tax", "0") or "0"),
                        "is_open_source": token_data.get("is_open_source") == "1",
                        "is_proxy": token_data.get("is_proxy") == "1",
                        "holder_count": int(token_data.get("holder_count", "0") or "0"),
                    }
    except Exception as e:
        logger.debug("GoPlus token security failed for %s: %s", addr_lower[:10], e)

    _token_cache[cache_key] = (result, time.time())
    return result


async def check_tokens_batch(token_addresses: list[str], chain_id: str = "1") -> dict[str, dict]:
    """Check multiple tokens and return a summary of dangerous tokens held."""
    if not token_addresses:
        return {"honeypot_count": 0, "dangerous_tokens": [], "tokens_checked": 0}

    # Limit to 10 tokens to avoid rate limiting
    tokens_to_check = token_addresses[:10]
    honeypots = []

    for token_addr in tokens_to_check:
        data = await check_token_security(token_addr, chain_id)
        if data.get("is_honeypot") or data.get("sell_tax", 0) > 0.5:
            honeypots.append({
                "address": token_addr,
                "is_honeypot": data.get("is_honeypot"),
                "sell_tax": data.get("sell_tax"),
            })

    return {
        "honeypot_count": len(honeypots),
        "dangerous_tokens": honeypots,
        "tokens_checked": len(tokens_to_check),
    }


# --------------------------------------------------------------------------- #
#  Approval Security — dangerous outstanding token approvals
# --------------------------------------------------------------------------- #

_approval_cache: dict[str, tuple[dict, float]] = {}


async def check_approval_security(address: str, chain_id: str = "1") -> dict[str, Any]:
    """
    Query GoPlus Approval Security API for dangerous token approvals.
    Detects unlimited approvals to unverified contracts, known scam approvals.
    Free, no key required.
    """
    addr_lower = address.lower()
    cache_key = f"approval:{addr_lower}"

    if cache_key in _approval_cache:
        data, ts = _approval_cache[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return data

    result = {
        "total_approvals": 0,
        "risky_approvals": 0,
        "risky_items": [],
    }

    try:
        url = f"https://api.gopluslabs.com/api/v2/token_approval_security/{chain_id}"
        async with httpx.AsyncClient(verify=False, timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, params={"addresses": addr_lower})
            if resp.status_code == 200:
                data = resp.json()
                approvals = data.get("result", {})

                if isinstance(approvals, list):
                    result["total_approvals"] = len(approvals)
                    risky = []
                    for item in approvals:
                        if isinstance(item, dict):
                            # Flag unlimited approvals or approvals to unverified contracts
                            if (item.get("approved_amount") == "unlimited"
                                    or item.get("is_contract_verified") == "0"
                                    or item.get("is_malicious") == "1"):
                                risky.append({
                                    "spender": item.get("approved_contract", ""),
                                    "amount": item.get("approved_amount", ""),
                                    "is_malicious": item.get("is_malicious") == "1",
                                })
                    result["risky_approvals"] = len(risky)
                    result["risky_items"] = risky[:5]

    except Exception as e:
        logger.debug("GoPlus approval security failed for %s: %s", addr_lower[:10], e)

    _approval_cache[cache_key] = (result, time.time())
    return result
