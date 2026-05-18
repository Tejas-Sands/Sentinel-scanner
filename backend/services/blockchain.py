"""Blockchain service for direct smart contract queries (Tether/Circle blacklists)."""

import logging
from typing import Optional
import httpx
from config import get_settings

logger = logging.getLogger(__name__)

# Method IDs for common blacklist functions
# isBlacklisted(address) -> USDC, BUSD, etc.
IS_BLACKLISTED_LOWER = "0xfe575a87" 
# isBlackListed(address) -> USDT (Tether uses capital L)
IS_BLACKLISTED_UPPER = "0xe47d3032"

# Stablecoin Mainnet Addresses
STABLECOINS = {
    "USDT": ("0xdAC17F958D2ee523a2206206994597C13D831ec7", IS_BLACKLISTED_UPPER),
    "USDC": ("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48", IS_BLACKLISTED_LOWER),
    "BUSD": ("0x4Fabb145d64652a948d72533023f6E7A623C7C53", IS_BLACKLISTED_LOWER),
}

async def check_stablecoin_blacklists(address: str) -> dict[str, bool]:
    """
    Directly query stablecoin smart contracts to see if the address is frozen.
    """
    settings = get_settings()
    addr_clean = address.lower().replace("0x", "").zfill(64)
    
    results = {
        "USDT": False,
        "USDC": False,
        "BUSD": False,
        "any_blacklisted": False
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        for name, (contract, sig) in STABLECOINS.items():
            try:
                data = f"{sig}{addr_clean}"
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "eth_call",
                    "params": [{"to": contract, "data": data}, "latest"]
                }
                
                resp = await client.post(settings.alchemy_url, json=payload)
                resp.raise_for_status()
                json_resp = resp.json()
                
                if "result" in json_resp:
                    res_val = json_resp["result"]
                    # If result is "0x" (empty) or "0x00...0" (false/zero), it's not blacklisted
                    if res_val and res_val != "0x" and int(res_val, 16) != 0:
                        results[name] = True
                        results["any_blacklisted"] = True
                        logger.warning("STABLECOIN BLACKLIST HIT: %s on %s", address, name)
            
            except Exception as e:
                logger.debug("Failed to query %s blacklist for %s (non-fatal): %s", name, address, e)

    return results
