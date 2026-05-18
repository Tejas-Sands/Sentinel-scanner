"""
Enrichment layer — converts existing scan results + raw Alchemy transfers
into SentinelLLMInput for the LLM reasoning engine.

All timestamp parsing uses Alchemy's metadata.blockTimestamp (ISO 8601).
All value parsing uses Alchemy's float ETH value (NOT Etherscan's wei integer).
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, List, Dict

from models.llm_models import SentinelLLMInput, RecentTx, WalletType
from services.ofac import get_sanctions_set, get_mixer_set

logger = logging.getLogger(__name__)


def enrich(
    address: str,
    chain: str,
    rule_engine_result: dict,
    raw_txs: List[Dict[str, Any]],
    eth_price_usd: float,
) -> SentinelLLMInput:
    """
    Build the full SentinelLLMInput from existing rule engine output
    and raw Alchemy transfer data.
    """
    txs = [tx for tx in (raw_txs or []) if tx is not None]
    addr = address.lower()

    # Parse all timestamps once
    parsed_txs = _parse_timestamps(txs)

    return SentinelLLMInput(
        wallet_address=addr,
        chain=chain,
        wallet_type=_classify_wallet_type(addr, txs),

        # Pass rule engine results through as-is
        rule_engine_score=rule_engine_result.get("score", 0),
        rule_engine_r001_fired=rule_engine_result.get("r001_fired", False),
        rule_engine_r002_fired=rule_engine_result.get("r002_fired", False),
        rule_engine_r002_match_count=rule_engine_result.get("r002_matches", 0),
        rule_engine_r003_fired=rule_engine_result.get("r003_fired", False),
        rule_engine_r004_fired=rule_engine_result.get("r004_fired", False),
        rule_engine_r005_fired=rule_engine_result.get("r005_fired", False),
        rule_engine_r006_fired=rule_engine_result.get("r006_fired", False),
        goplus_enabled=rule_engine_result.get("goplus_enabled", False),

        # V4: Obfuscation
        **_detect_peel_chain(parsed_txs, addr, eth_price_usd),
        **_detect_fanout(parsed_txs, addr),

        # V5: Behavioral
        wallet_age_days=_get_wallet_age_days(parsed_txs),
        tx_count_lifetime=len(txs),
        tx_count_24h=_count_txs_in_hours(parsed_txs, 24),
        volume_24h_usd=_sum_volume_in_hours(parsed_txs, 24, eth_price_usd),
        historical_avg_tx_usd=_calc_historical_avg(txs, eth_price_usd),
        recent_max_tx_usd=_get_recent_max(parsed_txs, 7, eth_price_usd),
        days_since_last_tx=_get_days_since_last_tx(parsed_txs),
        volume_spike_detected=_detect_volume_spike(parsed_txs, eth_price_usd),

        # V6: Network
        unique_senders_count=_count_unique_senders(txs, addr),
        unique_receivers_count=_count_unique_receivers(txs, addr),
        forwarding_ratio=_calc_forwarding_ratio(txs, addr, eth_price_usd),
        flagged_counterparty_count=rule_engine_result.get("flagged_counterparty_count", 0),
        flagged_counterparty_labels=rule_engine_result.get("flagged_counterparty_labels", []),

        # V7: Fraud (mapped from GoPlus / MEW / PhishFort / 2nd-degree hits)
        abuse_report_count=1 if (
            rule_engine_result.get("r006_fired", False) or 
            rule_engine_result.get("r010_fired", False) or 
            rule_engine_result.get("r012_fired", False)
        ) else 0,
        abuse_report_source=(
            "GoPlus Security" if rule_engine_result.get("r006_fired", False) else (
                "Community Blacklist (MEW/PhishFort)" if rule_engine_result.get("r010_fired", False) else (
                    "Indirect Compliance Ledger" if rule_engine_result.get("r012_fired", False) else None
                )
            )
        ),
        received_from_exploit=rule_engine_result.get("received_from_exploit", False),
        time_since_exploit_days=rule_engine_result.get("time_since_exploit_days"),
        phishing_activity_detected=_detect_phishing_patterns(parsed_txs, addr),
        is_burn_address=rule_engine_result.get("r009_fired", False),
        is_extreme_volume=rule_engine_result.get("r008_fired", False),
        total_volume_usd=rule_engine_result.get("total_vol_usd", 0.0),

        # V8: Smart Contract
        is_verified=rule_engine_result.get("etherscan_data", {}).get("contract_info", {}).get("is_verified") if rule_engine_result.get("etherscan_data", {}).get("contract_info") else None,
        honeypot_detected=rule_engine_result.get("r016_fired", False),

        # V9: Extended Threat Intelligence
        forta_scam_label=rule_engine_result.get("forta_data", {}).get("label"),
        ens_name=rule_engine_result.get("ens_data", {}).get("ens_name"),
        ens_is_phishing=rule_engine_result.get("r019_fired", False),
        honeypot_tokens_held=rule_engine_result.get("goplus_token_data", {}).get("honeypot_count", 0),
        dangerous_approvals_count=rule_engine_result.get("goplus_approval_data", {}).get("risky_approvals", 0),
        internal_tx_anomalies=rule_engine_result.get("r014_fired", False),
        unverified_contract_interactions=1 if rule_engine_result.get("r018_fired", False) else 0,
        mixer_signatures_detected=rule_engine_result.get("r020_fired", False),
        dormancy_days_before_spike=rule_engine_result.get("etherscan_data", {}).get("dormancy_days", 0),

        # Graph
        counterparties_analyzed=_count_unique_counterparties(txs, addr),
        flagged_counterparties=rule_engine_result.get("flagged_counterparties", 0),
        mixer_hops_detected=rule_engine_result.get("mixer_hops", 0),

        # Context
        recent_tx_summary=_build_tx_summary(parsed_txs[:10], addr, eth_price_usd),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  Alchemy-format timestamp parser
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_ts(tx: dict) -> datetime | None:
    """Parse Alchemy's metadata.blockTimestamp to datetime."""
    meta = tx.get("metadata") or {}
    block_ts = meta.get("blockTimestamp")
    if not block_ts:
        return None
    try:
        return datetime.fromisoformat(block_ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _parse_timestamps(txs: list[dict]) -> list[dict]:
    """Add a parsed '_ts' key to each tx dict."""
    result = []
    for tx in txs:
        tx_copy = dict(tx)
        tx_copy["_ts"] = _parse_ts(tx)
        result.append(tx_copy)
    return result


def _tx_value_usd(tx: dict, eth_price: float) -> float:
    """Get USD value of an Alchemy transfer."""
    value = float(tx.get("value") or 0)
    asset = (tx.get("asset") or "").upper()
    if asset in ("ETH", "WETH", ""):
        return value * eth_price
    return value  # ERC20 — approximate as face value


# ═══════════════════════════════════════════════════════════════════════════════
#  V4: Obfuscation Pattern Detectors
# ═══════════════════════════════════════════════════════════════════════════════

def _detect_peel_chain(parsed_txs: list[dict], address: str, eth_price: float) -> dict:
    """
    V4-R1: Peel chain detection.
    Sequential outgoing txs where each sends ~85-99% of received amount
    to a different address, retaining a small 'peel'. Detect ≥4 hops.
    """
    outgoing = [
        tx for tx in parsed_txs
        if (tx.get("from") or "").lower() == address and tx.get("_ts")
    ]
    outgoing.sort(key=lambda t: t["_ts"])

    if len(outgoing) < 4:
        return {"peel_chain_detected": False, "peel_chain_hops": 0}

    hops = 0
    max_hops = 0
    prev_value = None

    for tx in outgoing:
        value = _tx_value_usd(tx, eth_price)
        if prev_value and prev_value > 0 and value > 0:
            ratio = value / prev_value
            if 0.80 <= ratio <= 0.99:
                hops += 1
                max_hops = max(max_hops, hops)
            else:
                hops = 0
        prev_value = value

    return {
        "peel_chain_detected": max_hops >= 4,
        "peel_chain_hops": max_hops,
    }


def _detect_fanout(parsed_txs: list[dict], address: str) -> dict:
    """
    V4-R2: Rapid fan-out detection.
    ≥10 outgoing txs to unique addresses within 2 hours.
    """
    outgoing = [
        tx for tx in parsed_txs
        if (tx.get("from") or "").lower() == address and tx.get("_ts")
    ]
    if len(outgoing) < 10:
        return {"fanout_detected": False, "fanout_recipient_count": 0, "fanout_window_hours": 0.0}

    outgoing.sort(key=lambda t: t["_ts"])
    window = timedelta(hours=2)
    max_recipients = 0

    for i, tx in enumerate(outgoing):
        ts_start = tx["_ts"]
        window_recipients = set()
        for j in range(i, len(outgoing)):
            if outgoing[j]["_ts"] <= ts_start + window:
                to_addr = (outgoing[j].get("to") or "").lower()
                if to_addr:
                    window_recipients.add(to_addr)
            else:
                break
        max_recipients = max(max_recipients, len(window_recipients))

    return {
        "fanout_detected": max_recipients >= 10,
        "fanout_recipient_count": max_recipients,
        "fanout_window_hours": 2.0 if max_recipients >= 10 else 0.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  V5: Behavioral Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _get_wallet_age_days(parsed_txs: list[dict]) -> int:
    timestamps = [tx["_ts"] for tx in parsed_txs if tx.get("_ts")]
    if not timestamps:
        return 0
    earliest = min(timestamps)
    return max(0, int((datetime.now(timezone.utc) - earliest).total_seconds() // 86400))


def _count_txs_in_hours(parsed_txs: list[dict], hours: int) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return sum(1 for tx in parsed_txs if tx.get("_ts") and tx["_ts"] >= cutoff)


def _sum_volume_in_hours(parsed_txs: list[dict], hours: int, eth_price: float) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    total = sum(
        _tx_value_usd(tx, eth_price)
        for tx in parsed_txs
        if tx.get("_ts") and tx["_ts"] >= cutoff
    )
    return round(total, 2)


def _calc_historical_avg(txs: list[dict], eth_price: float) -> float:
    if not txs:
        return 0.0
    values = [_tx_value_usd(tx, eth_price) for tx in txs]
    return round(sum(values) / len(values), 2)


def _get_recent_max(parsed_txs: list[dict], days: int, eth_price: float) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    recent = [
        _tx_value_usd(tx, eth_price)
        for tx in parsed_txs
        if tx.get("_ts") and tx["_ts"] >= cutoff
    ]
    return round(max(recent), 2) if recent else 0.0


def _get_days_since_last_tx(parsed_txs: list[dict]) -> int:
    timestamps = [tx["_ts"] for tx in parsed_txs if tx.get("_ts")]
    if not timestamps:
        return 9999
    latest = max(timestamps)
    return max(0, int((datetime.now(timezone.utc) - latest).total_seconds() // 86400))


def _detect_volume_spike(parsed_txs: list[dict], eth_price: float) -> bool:
    """True if 24h volume > 3× the 30-day daily average."""
    vol_24h = _sum_volume_in_hours(parsed_txs, 24, eth_price)
    vol_30d = _sum_volume_in_hours(parsed_txs, 720, eth_price)
    avg_daily_30d = vol_30d / 30 if vol_30d > 0 else 0
    if avg_daily_30d <= 0:
        return False
    return vol_24h > (avg_daily_30d * 3)


# ═══════════════════════════════════════════════════════════════════════════════
#  V6: Network Topology Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _count_unique_senders(txs: list[dict], address: str) -> int:
    return len(set(
        (tx.get("from") or "").lower()
        for tx in txs
        if (tx.get("to") or "").lower() == address
           and (tx.get("from") or "").lower() != address
    ))


def _count_unique_receivers(txs: list[dict], address: str) -> int:
    return len(set(
        (tx.get("to") or "").lower()
        for tx in txs
        if (tx.get("from") or "").lower() == address
           and (tx.get("to") or "").lower() != address
    ))


def _calc_forwarding_ratio(txs: list[dict], address: str, eth_price: float) -> float:
    total_in = sum(
        _tx_value_usd(tx, eth_price)
        for tx in txs
        if (tx.get("to") or "").lower() == address
    )
    total_out = sum(
        _tx_value_usd(tx, eth_price)
        for tx in txs
        if (tx.get("from") or "").lower() == address
    )
    return round(total_out / total_in, 3) if total_in > 0 else 0.0


def _count_unique_counterparties(txs: list[dict], address: str) -> int:
    parties = set()
    for tx in txs:
        from_addr = (tx.get("from") or "").lower()
        to_addr = (tx.get("to") or "").lower()
        if from_addr and from_addr != address:
            parties.add(from_addr)
        if to_addr and to_addr != address:
            parties.add(to_addr)
    return len(parties)


def _detect_phishing_patterns(parsed_txs: list[dict], address: str) -> bool:
    """
    V7-R4: Phishing/Dusting detection.
    Flags wallets with high frequency of low-value outgoing txs to unique addresses.
    Pattern: ≥5 unique recipients in 1 hour with value < 0.001 ETH.
    """
    outgoing = [
        tx for tx in parsed_txs
        if (tx.get("from") or "").lower() == address and tx.get("_ts")
    ]
    if len(outgoing) < 5:
        return False

    outgoing.sort(key=lambda t: t["_ts"])
    window = timedelta(hours=1)

    for i, tx in enumerate(outgoing):
        ts_start = tx["_ts"]
        unique_recipients = set()
        
        for j in range(i, len(outgoing)):
            if outgoing[j]["_ts"] <= ts_start + window:
                val = float(outgoing[j].get("value") or 0)
                # Only count "dust" or tiny transactions
                if val < 0.001:
                    to_addr = (outgoing[j].get("to") or "").lower()
                    if to_addr:
                        unique_recipients.add(to_addr)
            else:
                break
                
        if len(unique_recipients) >= 5:
            return True
            
    return False


# ═══════════════════════════════════════════════════════════════════════════════
#  Classification & Context
# ═══════════════════════════════════════════════════════════════════════════════

def _classify_wallet_type(address: str, txs: list[dict]) -> WalletType:
    """
    Basic wallet type classification.
    Extend with your own label store / known address lists.
    """
    # For now, default to EOA — extend later with contract detection
    return WalletType.eoa


def _build_tx_summary(
    parsed_txs: list[dict],
    address: str,
    eth_price: float,
) -> List[RecentTx]:
    """Build last 10 transactions as RecentTx models for LLM context."""
    result = []
    for tx in parsed_txs[:10]:
        value_usd = round(_tx_value_usd(tx, eth_price), 2)
        from_addr = (tx.get("from") or "").lower()
        to_addr = (tx.get("to") or "").lower()

        direction = "out" if from_addr == address else "in"
        counterparty = to_addr if direction == "out" else from_addr

        ts = tx.get("_ts")
        ts_str = ts.isoformat() if ts else ""

        result.append(RecentTx(
            hash=tx.get("hash", ""),
            value_usd=value_usd,
            direction=direction,
            counterparty=counterparty,
            timestamp=ts_str,
        ))
    return result
