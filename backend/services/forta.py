"""Forta Network threat intelligence — static GitHub labelled datasets.

Loads scam, phishing, and exploit address labels from the Forta labelled-datasets
GitHub repository. The GraphQL API requires a paid subscription, so we use the
publicly available CSV/JSON datasets instead.
"""

import asyncio
import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Set, Dict, Any, Optional

import httpx
from config import get_settings

logger = logging.getLogger(__name__)

# In-memory cache for labelled addresses
_forta_labels: Dict[str, str] = {}  # address -> label (scam, phishing, exploit, etc.)
_last_fetch_time: datetime = datetime.min
_fetch_lock = asyncio.Lock()

# Forta labelled-datasets GitHub URLs (CSV format)
FORTA_DATASET_URLS = [
    # Malicious smart contracts on Ethereum
    "https://raw.githubusercontent.com/forta-network/labelled-datasets/main/labels/malicious-smart-contracts/ethereum.csv",
    # Phishing scams
    "https://raw.githubusercontent.com/forta-network/labelled-datasets/main/labels/phishing/ethereum.csv",
]

# Fallback: direct raw list of known scam addresses maintained by the community
FORTA_FALLBACK_URLS = [
    "https://raw.githubusercontent.com/forta-network/labelled-datasets/main/labels/1/malicious_smart_contracts.csv",
    "https://raw.githubusercontent.com/forta-network/labelled-datasets/main/labels/1/phishing_scams.csv",
]


async def load_forta_labels() -> Dict[str, str]:
    """Fetch and cache Forta labelled datasets from GitHub."""
    global _forta_labels, _last_fetch_time

    settings = get_settings()
    if not settings.forta_labels_enabled:
        return {}

    # Refresh cache every hour
    if datetime.now() - _last_fetch_time < timedelta(hours=1) and _forta_labels:
        return _forta_labels

    async with _fetch_lock:
        # Double-check after acquiring lock
        if datetime.now() - _last_fetch_time < timedelta(hours=1) and _forta_labels:
            return _forta_labels

        new_labels: Dict[str, str] = {}

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # Try primary URLs first, then fallbacks
            all_urls = FORTA_DATASET_URLS + FORTA_FALLBACK_URLS

            for url in all_urls:
                try:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue

                    content = resp.text
                    
                    # Determine label type from URL
                    if "malicious" in url.lower():
                        default_label = "malicious_contract"
                    elif "phishing" in url.lower():
                        default_label = "phishing"
                    elif "exploit" in url.lower():
                        default_label = "exploit"
                    else:
                        default_label = "scam"

                    # Parse CSV content
                    reader = csv.DictReader(io.StringIO(content))
                    for row in reader:
                        # CSV columns vary but typically have 'address' or 'contract_address'
                        addr = (
                            row.get("address", "")
                            or row.get("contract_address", "")
                            or row.get("addr", "")
                            or row.get("Address", "")
                        ).strip().lower()

                        if addr and addr.startswith("0x") and len(addr) >= 40:
                            label = row.get("tag", row.get("label", row.get("category", default_label)))
                            new_labels[addr] = label

                    logger.info("Forta dataset loaded from %s: %d addresses", url.split("/")[-1], len(new_labels))

                except Exception as e:
                    logger.debug("Failed to fetch Forta dataset %s: %s", url.split("/")[-1], e)
                    continue

        if new_labels:
            _forta_labels = new_labels
            _last_fetch_time = datetime.now()
            logger.info("Forta labels loaded: %d total addresses", len(_forta_labels))
        else:
            logger.warning("No Forta labels loaded; keeping existing cache (%d)", len(_forta_labels))

    return _forta_labels


async def is_forta_flagged(address: str) -> Optional[str]:
    """
    Check if an address is in the Forta labelled datasets.
    
    Returns the label string (e.g., 'scam', 'phishing', 'exploit') if found,
    or None if not flagged.
    """
    labels = await load_forta_labels()
    return labels.get(address.lower())


async def get_forta_data(address: str) -> Dict[str, Any]:
    """
    Get comprehensive Forta intelligence for an address.
    
    Returns dict with:
        is_flagged: bool
        label: str or None
        source: str
    """
    label = await is_forta_flagged(address)
    return {
        "is_flagged": label is not None,
        "label": label,
        "source": "Forta Network Labelled Datasets (GitHub)",
        "total_labels_loaded": len(_forta_labels),
    }
