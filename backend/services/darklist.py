"""Service for checking addresses against the MEW and PhishFort community blacklists."""

import logging
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Set
from config import get_settings

logger = logging.getLogger(__name__)

# In-memory cache for the combined blacklists
_cached_darklist: Set[str] = set()
_last_fetch_time: datetime = datetime.min
_fetch_lock = asyncio.Lock()

async def get_mew_darklist() -> Set[str]:
    """Fetch and cache combined MEW and PhishFort blacklists from GitHub."""
    global _cached_darklist, _last_fetch_time
    
    settings = get_settings()
    
    # Refresh cache every hour
    if datetime.now() - _last_fetch_time < timedelta(hours=1) and _cached_darklist:
        return _cached_darklist
        
    async with _fetch_lock:
        # Double-check after acquiring lock
        if datetime.now() - _last_fetch_time < timedelta(hours=1) and _cached_darklist:
            return _cached_darklist
            
        try:
            logger.info("Fetching latest MEW & PhishFort darklists from GitHub...")
            new_list: Set[str] = set()
            
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                # 1. Fetch MEW Darklist
                try:
                    resp = await client.get(settings.mew_darklist_url)
                    resp.raise_for_status()
                    data = resp.json()
                    
                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, str):
                                new_list.add(item.lower())
                            elif isinstance(item, dict) and "address" in item:
                                new_list.add(item["address"].lower())
                        logger.info("Successfully loaded MEW darklist addresses")
                except Exception as mew_e:
                    logger.error("Failed to fetch MEW darklist: %s", mew_e)

                # 2. Fetch PhishFort Blacklist
                try:
                    phishfort_url = "https://raw.githubusercontent.com/phishfort/phishfort-lists/master/blacklists/addresses.json"
                    resp = await client.get(phishfort_url)
                    resp.raise_for_status()
                    pf_data = resp.json()
                    
                    if isinstance(pf_data, list):
                        for item in pf_data:
                            if isinstance(item, str):
                                new_list.add(item.lower())
                        logger.info("Successfully loaded PhishFort blacklist addresses")
                except Exception as pf_e:
                    logger.error("Failed to fetch PhishFort blacklist: %s", pf_e)
            
            if new_list:
                _cached_darklist = new_list
                _last_fetch_time = datetime.now()
                logger.info("Combined darklist successfully loaded with %d addresses", len(_cached_darklist))
            else:
                logger.warning("No new darklist addresses loaded; keeping existing cache")
                
        except Exception as e:
            logger.error("Failed to fetch combined darklist: %s", e)
            
    return _cached_darklist

async def is_on_mew_darklist(address: str) -> bool:
    """Check if an address is on the combined MEW / PhishFort blacklists."""
    darklist = await get_mew_darklist()
    return address.lower() in darklist
