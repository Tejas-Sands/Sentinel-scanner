"""4byte.directory — function selector decoder for mixer signature detection.

Decodes contract function selectors to detect mixer interactions by function
signature even when the contract address isn't in the mixer registry.
Free API, no authentication required.
"""

import logging
import time
from typing import Dict, Any, List, Set, Optional

import httpx

logger = logging.getLogger(__name__)

# In-memory cache: selector -> text_signature
_selector_cache: Dict[str, str] = {}
_CACHE_TTL = 86400  # 24 hours

# Known mixer function selectors (pre-computed to minimize API calls)
KNOWN_MIXER_SELECTORS: Dict[str, str] = {
    "0xb214faa5": "deposit(bytes32)",  # Tornado Cash deposit
    "0x21a0adb6": "withdraw(bytes,bytes32,address,address,uint256,uint256)",  # Tornado Cash withdraw
    "0x13d98d13": "withdraw(address,uint256)",  # Generic mixer withdraw
    "0x97fc007c": "createWallet()",  # Wasabi Wallet
    "0x9e5faafc": "attack()",  # Flash loan attack pattern
    "0xd0e30db0": "deposit()",  # Could be mixer
    "0xe9e05c42": "depositTransaction(address,uint256,uint64,bool,bytes)",  # Bridge/mixer
    "0x00f714ce": "withdraw(uint256,address)",  # Cyclone withdraw
    "0x4e71d92d": "claim()",  # Mixer claim
}

# Known mixer-related function name patterns
MIXER_FUNCTION_PATTERNS = [
    "tornado", "cyclone", "typhoon", "mixer", "tumbler",
    "anonymize", "obfuscate", "shielded", "private_transfer",
    "railgun", "aztec", "zkmixer",
]

FOURBYTE_API = "https://www.4byte.directory/api/v1/signatures/"


async def decode_selector(selector: str) -> Optional[str]:
    """Decode a 4-byte function selector using 4byte.directory API."""
    if not selector or len(selector) < 10:
        return None

    hex_sig = selector[:10].lower()

    # Check known selectors first
    if hex_sig in KNOWN_MIXER_SELECTORS:
        return KNOWN_MIXER_SELECTORS[hex_sig]

    # Check cache
    if hex_sig in _selector_cache:
        return _selector_cache[hex_sig]

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(FOURBYTE_API, params={"hex_signature": hex_sig})
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    # Take the most popular (first) result
                    text_sig = results[0].get("text_signature", "")
                    _selector_cache[hex_sig] = text_sig
                    return text_sig
    except Exception as e:
        logger.debug("4byte lookup failed for %s: %s", hex_sig, e)

    _selector_cache[hex_sig] = ""
    return None


def _is_mixer_signature(text_sig: str) -> bool:
    """Check if a decoded function signature matches known mixer patterns."""
    if not text_sig:
        return False
    sig_lower = text_sig.lower()
    return any(pattern in sig_lower for pattern in MIXER_FUNCTION_PATTERNS)


async def detect_mixer_signatures(transfers: list[dict]) -> Dict[str, Any]:
    """
    Analyze transaction input data for mixer function signatures.
    
    Args:
        transfers: List of transaction dicts (Etherscan or Alchemy format)
    
    Returns dict with:
        mixer_sig_detected: bool
        mixer_signatures: list of matched signatures
        unique_selectors_checked: int
    """
    # Collect unique selectors from transaction input data
    selectors: Set[str] = set()
    for tx in transfers:
        input_data = tx.get("input", tx.get("data", ""))
        if input_data and len(input_data) >= 10 and input_data != "0x":
            selectors.add(input_data[:10].lower())

    if not selectors:
        return {"mixer_sig_detected": False, "mixer_signatures": [], "unique_selectors_checked": 0}

    # Check known selectors first (instant, no API calls)
    mixer_matches = []
    unknown_selectors = []

    for sel in selectors:
        if sel in KNOWN_MIXER_SELECTORS:
            mixer_matches.append({"selector": sel, "function": KNOWN_MIXER_SELECTORS[sel], "source": "known_db"})
        elif sel in _selector_cache:
            if _is_mixer_signature(_selector_cache[sel]):
                mixer_matches.append({"selector": sel, "function": _selector_cache[sel], "source": "cache"})
        else:
            unknown_selectors.append(sel)

    # Decode unknown selectors via API (limit to 10 to avoid rate limiting)
    for sel in unknown_selectors[:10]:
        text_sig = await decode_selector(sel)
        if text_sig and _is_mixer_signature(text_sig):
            mixer_matches.append({"selector": sel, "function": text_sig, "source": "4byte_api"})

    return {
        "mixer_sig_detected": len(mixer_matches) > 0,
        "mixer_signatures": mixer_matches,
        "unique_selectors_checked": len(selectors),
    }
