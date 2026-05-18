"""
Risk scoring engine — 22 rules, additive scoring, max 100.

Rules:
  R001:  Direct Sanctions Hit           → 100 (instant override)
  R002:  1st-Degree Sanctions Exposure  → 40/match, max 80
  R003:  Mixer Interaction              → 60
  R004:  High Transaction Velocity      → 40
  R005:  Large New Wallet Inflow        → 30
  R006:  GoPlus Fraud/Phishing Flag     → 50
  R007:  Stablecoin Asset Freeze        → 100 (instant override)
  R008:  Extreme Volume Anomaly         → 90
  R009:  System / Burn / Null Address   → 50
  R010:  Community Darklist Match       → 90
  R012:  Indirect Exposure (2nd-Degree) → 20/match, max 40
  R013:  Forta Scam Label Match         → 70
  R014:  Suspicious Internal Txs        → 30
  R015:  Dormant Wallet Reactivation    → 25
  R016:  Honeypot Token Holdings        → 40
  R017:  Dangerous Token Approvals      → 35
  R018:  Unverified Contract Interaction→ 20
  R019:  ENS Phishing Identity          → 60
  R020:  Mixer Function Sig Detection   → 45
  R021:  Dormancy Volume Spike          → 30
  R022:  Cross-Chain Risk Context       → 25
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from models import Flag
from services.ofac import get_sanctions_set, get_mixer_set, get_sanctions_info, get_mixer_info

logger = logging.getLogger(__name__)

# Risk tier thresholds
TIERS = {
    (0, 25): {"label": "LOW", "color": "#22c55e", "description": "No significant risk indicators detected."},
    (26, 50): {"label": "MEDIUM", "color": "#eab308", "description": "Some risk indicators present. Recommend enhanced due diligence."},
    (51, 75): {"label": "HIGH", "color": "#f97316", "description": "Multiple risk indicators. Investigation recommended."},
    (76, 100): {"label": "CRITICAL", "color": "#ef4444", "description": "Severe risk indicators. Potential sanctions exposure or mixer usage. Immediate action advised."},
}


def get_risk_tier(score: int) -> dict:
    """Get risk tier info for a given score."""
    for (low, high), tier in TIERS.items():
        if low <= score <= high:
            return tier
    return TIERS[(76, 100)]


async def score_address(
    address: str,
    transfers: list[dict[str, Any]],
    eth_price_usd: float = 3000.0,
    goplus_data: dict[str, Any] | None = None,
    stablecoin_status: dict[str, bool] | None = None,
    is_mew_darklisted: bool = False,
    etherscan_data: dict[str, Any] | None = None,
    forta_data: dict[str, Any] | None = None,
    goplus_token_data: dict[str, Any] | None = None,
    goplus_approval_data: dict[str, Any] | None = None,
    ens_data: dict[str, Any] | None = None,
    mixer_sig_data: dict[str, Any] | None = None,
    blockchair_data: dict[str, Any] | None = None,
) -> tuple[int, str, list[Flag], dict]:
    """
    Score an Ethereum address for compliance risk.

    Args:
        address: The target Ethereum address (lowercase)
        transfers: List of Alchemy transfer objects
        eth_price_usd: Current ETH price for USD conversion

    Returns:
        Tuple of (score, tier_label, flags, metadata)
    """
    sanctions_set = get_sanctions_set()
    mixer_set = get_mixer_set()
    flags: list[Flag] = []
    metadata: dict[str, Any] = {}

    address_lower = address.lower()

    # ------------------------------------------------------------------ #
    # R001: Direct Sanctions Hit
    # ------------------------------------------------------------------ #
    if address_lower in sanctions_set:
        info = await get_sanctions_info(address_lower)
        evidence = {
            "list_name": info.get("list_name", "OFAC SDN") if info else "OFAC SDN",
            "entity_name": info.get("entity_name", "Unknown") if info else "Unknown",
            "program": info.get("program", "") if info else "",
            "ofac_url": "https://www.treasury.gov/ofac/downloads/sdnlist.txt",
        }
        flags.append(Flag(
            id="R001",
            name="Direct Sanctions Hit",
            severity="CRITICAL",
            description=f"This address is listed on the {evidence['list_name']} sanctions list as '{evidence['entity_name']}'. Any transaction with this address is a compliance violation.",
            evidence=evidence,
        ))
        tier = get_risk_tier(100)
        return 100, tier["label"], flags, metadata

    # ------------------------------------------------------------------ #
    # R001b: Direct Mixer Hit (address itself is a mixer)
    # ------------------------------------------------------------------ #
    if address_lower in mixer_set:
        info = await get_mixer_info(address_lower)
        mixer_name = info.get("name", "Unknown Mixer") if info else "Unknown Mixer"
        evidence = {"mixer_name": mixer_name}

        # Also check if it's sanctioned (some mixers are on OFAC)
        if address_lower in sanctions_set:
            flags.append(Flag(
                id="R001",
                name="Direct Sanctions Hit",
                severity="CRITICAL",
                description=f"This address is a known mixer ({mixer_name}) and is on the OFAC sanctions list.",
                evidence=evidence,
            ))
            tier = get_risk_tier(100)
            return 100, tier["label"], flags, metadata

        flags.append(Flag(
            id="R003",
            name="Known Mixer Address",
            severity="HIGH",
            description=f"This address is identified as a known mixer: {mixer_name}. Transactions involving this address indicate obfuscation of fund origins.",
            evidence=evidence,
        ))

    # Collect scores from remaining rules
    total_score = 60 if (address_lower in mixer_set) else 0

    # Extract counterparty addresses from transfers
    counterparties: set[str] = set()
    for tx in transfers:
        if not tx:
            continue
        from_addr = (tx.get("from") or "").lower()
        to_addr = (tx.get("to") or "").lower()
        if from_addr and from_addr != address_lower:
            counterparties.add(from_addr)
        if to_addr and to_addr != address_lower:
            counterparties.add(to_addr)

    # ------------------------------------------------------------------ #
    # R002: First-Degree Sanctions Exposure
    # ------------------------------------------------------------------ #
    sanctioned_counterparties = counterparties & sanctions_set
    if sanctioned_counterparties:
        r002_score = min(len(sanctioned_counterparties) * 40, 80)
        total_score += r002_score

        # Gather evidence
        cp_evidence = []
        for sc_addr in list(sanctioned_counterparties)[:5]:  # Limit evidence to 5
            sc_info = await get_sanctions_info(sc_addr)
            matching_txs = [
                tx for tx in transfers
                if (tx.get("from") or "").lower() == sc_addr or (tx.get("to") or "").lower() == sc_addr
            ]
            cp_evidence.append({
                "address": sc_addr,
                "entity": sc_info.get("entity_name", "Unknown") if sc_info else "Unknown",
                "program": sc_info.get("program", "") if sc_info else "",
                "tx_count": len(matching_txs),
                "tx_hashes": [tx.get("hash", "") for tx in matching_txs[:3]],
            })

        flags.append(Flag(
            id="R002",
            name="First-Degree Sanctions Exposure",
            severity="HIGH",
            description=f"This address has transacted with {len(sanctioned_counterparties)} sanctioned address(es). Direct exposure to sanctioned entities detected.",
            evidence={
                "sanctioned_counterparties": cp_evidence,
                "match_count": len(sanctioned_counterparties),
            },
        ))

    # ------------------------------------------------------------------ #
    # R003: Mixer Interaction (via counterparties)
    # ------------------------------------------------------------------ #
    if address_lower not in mixer_set:  # Don't double-count if address itself is a mixer
        mixer_counterparties = counterparties & mixer_set
        if mixer_counterparties:
            total_score += 60

            mixer_evidence = []
            for mx_addr in list(mixer_counterparties)[:5]:
                mx_info = await get_mixer_info(mx_addr)
                matching_txs = [
                    tx for tx in transfers
                    if (tx.get("from") or "").lower() == mx_addr or (tx.get("to") or "").lower() == mx_addr
                ]
                mixer_evidence.append({
                    "address": mx_addr,
                    "name": mx_info.get("name", "Unknown Mixer") if mx_info else "Unknown Mixer",
                    "tx_count": len(matching_txs),
                    "tx_hashes": [tx.get("hash", "") for tx in matching_txs[:3]],
                })

            flags.append(Flag(
                id="R003",
                name="Mixer Interaction",
                severity="HIGH",
                description=f"This address has interacted with {len(mixer_counterparties)} known mixing service(s). Mixers are used to obscure the origin of funds.",
                evidence={
                    "mixer_counterparties": mixer_evidence,
                    "match_count": len(mixer_counterparties),
                },
            ))

    # ------------------------------------------------------------------ #
    # R004: High Transaction Velocity
    # ------------------------------------------------------------------ #
    if transfers:
        velocity_flag = _check_velocity(transfers, eth_price_usd)
        if velocity_flag:
            total_score += 40
            flags.append(velocity_flag)

    # ------------------------------------------------------------------ #
    # R005: Large New Wallet Inflow
    # ------------------------------------------------------------------ #
    if transfers:
        inflow_flag = _check_large_new_wallet_inflow(address_lower, transfers, eth_price_usd)
        if inflow_flag:
            total_score += 30
            flags.append(inflow_flag)

    # ------------------------------------------------------------------ #
    # R006: GoPlus Fraud/Phishing Flag
    # ------------------------------------------------------------------ #
    r006_fired = False
    if goplus_data and goplus_data.get("is_malicious"):
        total_score += 50
        r006_fired = True

        # Build evidence from GoPlus flags
        goplus_flags = []
        for key in ["phishing_activities", "blacklist_doubt", "stealing_attack",
                     "cybercrime", "money_laundering", "financial_crime"]:
            if goplus_data.get(key):
                goplus_flags.append(key.replace("_", " ").title())

        flags.append(Flag(
            id="R006",
            name="Fraud/Phishing Detection (GoPlus)",
            severity="HIGH",
            description=f"GoPlus Security API flagged this address as malicious. Detected: {', '.join(goplus_flags) or 'General malicious activity'}.",
            evidence={
                "source": "gopluslabs.com",
                "flags_triggered": goplus_flags,
                "is_malicious": True,
            },
        ))

    # ------------------------------------------------------------------ #
    # R007: Stablecoin Blacklist Hit
    # ------------------------------------------------------------------ #
    r007_fired = False
    if stablecoin_status and stablecoin_status.get("any_blacklisted"):
        total_score += 100
        r007_fired = True
        
        frozen_on = [name for name in ["USDT", "USDC"] if stablecoin_status.get(name)]
        
        flags.append(Flag(
            id="R007",
            name="Stablecoin Asset Freeze",
            severity="CRITICAL",
            description=f"Address is explicitly blacklisted/frozen by custodial stablecoin providers: {', '.join(frozen_on)}.",
            evidence={
                "contracts_checked": ["USDT", "USDC"],
                "frozen_on": frozen_on,
                "status": "BLACK-LISTED",
            },
        ))

    # ------------------------------------------------------------------ #
    # R008: Extreme Volume Anomaly
    # ------------------------------------------------------------------ #
    # If volume > $1 Billion and not a known entity, it's a massive red flag
    total_vol = 0.0
    for t in transfers:
        raw_val = t.get("value")
        if raw_val:
            try:
                # Alchemy returns value as a float or hex string
                val_float = float(raw_val)
                total_vol += val_float * eth_price_usd
            except:
                continue

    if total_vol > 1_000_000_000: # $1 Billion
        total_score += 90
        flags.append(Flag(
            id="R008",
            name="Extreme Volume Anomaly",
            severity="CRITICAL",
            description=f"This address has processed an astronomical volume of assets (${total_vol:,.0f}). Unless this is a verified exchange or protocol, this level of activity is highly indicative of institutional-scale money laundering or system exploitation.",
            evidence={"total_volume_usd": total_vol, "threshold": 1_000_000_000},
        ))

    # ------------------------------------------------------------------ #
    # R009: System / Burn / Null Address
    # ------------------------------------------------------------------ #
    # Flag addresses like 0x0...0 or 0x0...18 which are "black holes"
    is_burn = False
    if address.startswith("0x000000000000000000000000000000000000"):
        is_burn = True
        total_score += 50
        flags.append(Flag(
            id="R009",
            name="System / Burn Address",
            severity="HIGH",
            description="This is a Null, Burn, or Precompiled Ethereum address. It is not a standard user wallet. Assets sent here are permanently destroyed or inaccessible. Scammers often use these for address poisoning or to hide funds.",
            evidence={"type": "burn_address", "pattern": "0x000..."},
        ))

    # ------------------------------------------------------------------ #
    # R010: MEW Darklist Hit
    # ------------------------------------------------------------------ #
    if is_mew_darklisted:
        total_score += 90
        flags.append(Flag(
            id="R010",
            name="Community Darklist Match",
            severity="HIGH",
            description="Address is present on the MyEtherWallet (MEW) community darklist. This list contains verified phishing, scam, and fraudulent addresses identified by the Ethereum community.",
            evidence={"source": "MEW Darklist / GitHub"},
        ))

    # ------------------------------------------------------------------ #
    # R012: Indirect Exposure to High-Risk Entities (2nd-Degree Taint)
    # ------------------------------------------------------------------ #
    second_degree_hits = []
    if counterparties:
        try:
            from database import get_db
            db = await get_db()
            placeholders = ",".join("?" for _ in counterparties)
            query = f"SELECT address, risk_score, risk_tier FROM scans WHERE address IN ({placeholders}) AND risk_score >= 50"
            cursor = await db.execute(query, list(counterparties))
            rows = await cursor.fetchall()
            for row in rows:
                second_degree_hits.append({
                    "address": row["address"],
                    "risk_score": row["risk_score"],
                    "risk_tier": row["risk_tier"]
                })
        except Exception as e:
            logger.debug("Failed to query 2nd-degree exposure: %s", e)
        finally:
            try:
                await db.close()
            except:
                pass

    if second_degree_hits:
        count = len(second_degree_hits)
        boost = min(count * 20, 40)
        total_score += boost
        
        flags.append(Flag(
            id="R012",
            name="Indirect High-Risk Exposure (2nd-Degree)",
            severity="HIGH" if any(h["risk_score"] >= 76 for h in second_degree_hits) else "MEDIUM",
            description=f"Address has transacted with {count} counterparty/counterparties that have high-risk compliance profiles (score >= 50). This indicates indirect (2nd-degree) exposure to sanctioned entities, mixers, or community blacklists.",
            evidence={
                "high_risk_counterparties": second_degree_hits[:5],
                "match_count": count,
                "source": "Local Compliance Ledger"
            },
        ))

    # ------------------------------------------------------------------ #
    # R013: Forta Scam Label Match
    # ------------------------------------------------------------------ #
    if forta_data and forta_data.get("is_flagged"):
        total_score += 70
        flags.append(Flag(
            id="R013",
            name="Forta Scam Label Match",
            severity="HIGH",
            description=f"Address is flagged in Forta Network threat datasets as '{forta_data.get('label', 'scam')}'. Forta's decentralized bot network has identified this address in active exploit, phishing, or scam campaigns.",
            evidence={"label": forta_data.get("label"), "source": forta_data.get("source", "Forta Network")},
        ))

    # ------------------------------------------------------------------ #
    # R014: Suspicious Internal Transactions
    # ------------------------------------------------------------------ #
    if etherscan_data and etherscan_data.get("enabled"):
        if etherscan_data.get("has_internal_self_destruct") or etherscan_data.get("has_delegatecall"):
            total_score += 30
            evidence_items = []
            if etherscan_data.get("has_internal_self_destruct"):
                evidence_items.append("self-destruct")
            if etherscan_data.get("has_delegatecall"):
                evidence_items.append("delegatecall")
            flags.append(Flag(
                id="R014",
                name="Suspicious Internal Transactions",
                severity="MEDIUM",
                description=f"Address has internal transactions with suspicious patterns: {', '.join(evidence_items)}. These patterns are commonly associated with exploit contracts, proxy abuse, or fund extraction.",
                evidence={"patterns": evidence_items, "internal_tx_count": etherscan_data.get("internal_tx_count", 0), "source": "Etherscan"},
            ))

    # ------------------------------------------------------------------ #
    # R015: Dormant Wallet Reactivation
    # ------------------------------------------------------------------ #
    if etherscan_data and etherscan_data.get("enabled"):
        dormancy = etherscan_data.get("dormancy_days", 0)
        if dormancy >= 180:  # 6+ months dormant then sudden activity
            total_score += 25
            flags.append(Flag(
                id="R015",
                name="Dormant Wallet Reactivation",
                severity="MEDIUM",
                description=f"Wallet had a dormancy period of {dormancy} days followed by reactivation. Long-dormant wallets that suddenly become active may indicate compromised keys, delayed laundering, or post-exploit fund movement.",
                evidence={"dormancy_days": dormancy, "source": "Etherscan"},
            ))

    # ------------------------------------------------------------------ #
    # R016: Honeypot Token Holdings
    # ------------------------------------------------------------------ #
    if goplus_token_data and goplus_token_data.get("honeypot_count", 0) > 0:
        total_score += 40
        flags.append(Flag(
            id="R016",
            name="Honeypot Token Holdings",
            severity="HIGH",
            description=f"Address holds or has interacted with {goplus_token_data['honeypot_count']} honeypot/scam token(s). These tokens have sell restrictions, hidden mints, or extremely high sell taxes designed to trap victims.",
            evidence={"honeypot_count": goplus_token_data["honeypot_count"], "tokens": goplus_token_data.get("dangerous_tokens", [])[:3], "source": "GoPlus Token Security"},
        ))

    # ------------------------------------------------------------------ #
    # R017: Dangerous Token Approvals
    # ------------------------------------------------------------------ #
    if goplus_approval_data and goplus_approval_data.get("risky_approvals", 0) > 0:
        total_score += 35
        flags.append(Flag(
            id="R017",
            name="Dangerous Token Approvals",
            severity="MEDIUM",
            description=f"Address has {goplus_approval_data['risky_approvals']} risky outstanding token approvals (unlimited amounts to unverified or malicious contracts). These approvals can be exploited for unauthorized token draining.",
            evidence={"risky_count": goplus_approval_data["risky_approvals"], "total": goplus_approval_data.get("total_approvals", 0), "items": goplus_approval_data.get("risky_items", [])[:3], "source": "GoPlus Approval Security"},
        ))

    # ------------------------------------------------------------------ #
    # R018: Unverified Contract Interaction
    # ------------------------------------------------------------------ #
    if etherscan_data and etherscan_data.get("enabled"):
        contract_info = etherscan_data.get("contract_info")
        if contract_info and not contract_info.get("is_verified", True):
            total_score += 20
            flags.append(Flag(
                id="R018",
                name="Unverified Contract Interaction",
                severity="MEDIUM",
                description="This address is an unverified smart contract — its source code has not been published or verified on Etherscan. Unverified contracts cannot be audited and may contain hidden malicious logic.",
                evidence={"is_verified": False, "source": "Etherscan Contract Verification"},
            ))

    # ------------------------------------------------------------------ #
    # R019: ENS Phishing Identity
    # ------------------------------------------------------------------ #
    if ens_data and ens_data.get("is_phishing"):
        total_score += 60
        flags.append(Flag(
            id="R019",
            name="ENS Phishing Identity",
            severity="HIGH",
            description=f"This address has an ENS name ('{ens_data.get('ens_name')}') that matches a known phishing domain from MetaMask's blocklist. The ENS name is designed to impersonate a legitimate service and trick users into sending funds.",
            evidence={"ens_name": ens_data.get("ens_name"), "phishing_match": ens_data.get("phishing_match"), "source": "ENS + MetaMask eth-phishing-detect"},
        ))

    # ------------------------------------------------------------------ #
    # R020: Mixer Function Signature Detection
    # ------------------------------------------------------------------ #
    if mixer_sig_data and mixer_sig_data.get("mixer_sig_detected"):
        total_score += 45
        sigs = mixer_sig_data.get("mixer_signatures", [])
        flags.append(Flag(
            id="R020",
            name="Mixer Function Signature Detection",
            severity="HIGH",
            description=f"Transaction calldata contains {len(sigs)} function signature(s) matching known mixing protocols (e.g., Tornado Cash deposit/withdraw). This address has called mixer contracts even if the contract address is not in our registry.",
            evidence={"signatures": sigs[:5], "source": "4byte.directory + Local Mixer DB"},
        ))

    # ------------------------------------------------------------------ #
    # R021: Dormancy Volume Spike
    # ------------------------------------------------------------------ #
    if etherscan_data and etherscan_data.get("enabled"):
        dormancy = etherscan_data.get("dormancy_days", 0)
        if dormancy >= 90 and len(transfers) > 20:
            total_score += 30
            flags.append(Flag(
                id="R021",
                name="Dormancy Volume Spike",
                severity="MEDIUM",
                description=f"After {dormancy} days of inactivity, this address suddenly executed {len(transfers)} transactions. This dormancy-then-burst pattern is a strong indicator of compromised wallets, delayed laundering, or coordinated fund movement.",
                evidence={"dormancy_days": dormancy, "tx_burst_count": len(transfers), "source": "Etherscan + Alchemy"},
            ))

    # ------------------------------------------------------------------ #
    # R022: Cross-Chain Risk Context (Blockchair)
    # ------------------------------------------------------------------ #
    if blockchair_data:
        bc_tx_count = blockchair_data.get("tx_count", 0)
        bc_call_count = blockchair_data.get("call_count", 0)
        # Flag if extremely high activity that diverges from our Alchemy data
        if bc_tx_count > 10000 and bc_call_count > 5000:
            total_score += 25
            flags.append(Flag(
                id="R022",
                name="Cross-Chain Risk Context",
                severity="MEDIUM",
                description=f"Blockchair reports {bc_tx_count:,} transactions and {bc_call_count:,} contract calls for this address — indicating institutional-scale activity. Cross-chain analysis suggests this address operates across multiple protocols at high volume.",
                evidence={"tx_count": bc_tx_count, "call_count": bc_call_count, "source": "Blockchair"},
            ))

    # Cap at 100
    final_score = min(total_score, 100)
    tier = get_risk_tier(final_score)

    # Build rule metadata for the enrichment layer
    metadata["r001_fired"] = any(f.id == "R001" for f in flags)
    metadata["r002_fired"] = any(f.id == "R002" for f in flags)
    metadata["r002_matches"] = len(sanctioned_counterparties) if 'sanctioned_counterparties' in dir() else 0
    metadata["r003_fired"] = any(f.id == "R003" for f in flags)
    metadata["r004_fired"] = any(f.id == "R004" for f in flags)
    metadata["r005_fired"] = any(f.id == "R005" for f in flags)
    metadata["r006_fired"] = any(f.id == "R006" for f in flags)
    metadata["r007_fired"] = r007_fired
    metadata["r008_fired"] = any(f.id == "R008" for f in flags)
    metadata["r009_fired"] = any(f.id == "R009" for f in flags)
    metadata["r010_fired"] = any(f.id == "R010" for f in flags)
    metadata["r011_fired"] = False
    metadata["r012_fired"] = any(f.id == "R012" for f in flags)
    metadata["r013_fired"] = any(f.id == "R013" for f in flags)
    metadata["r014_fired"] = any(f.id == "R014" for f in flags)
    metadata["r015_fired"] = any(f.id == "R015" for f in flags)
    metadata["r016_fired"] = any(f.id == "R016" for f in flags)
    metadata["r017_fired"] = any(f.id == "R017" for f in flags)
    metadata["r018_fired"] = any(f.id == "R018" for f in flags)
    metadata["r019_fired"] = any(f.id == "R019" for f in flags)
    metadata["r020_fired"] = any(f.id == "R020" for f in flags)
    metadata["r021_fired"] = any(f.id == "R021" for f in flags)
    metadata["r022_fired"] = any(f.id == "R022" for f in flags)
    metadata["goplus_enabled"] = goplus_data is not None
    metadata["score"] = final_score
    metadata["total_vol_usd"] = total_vol

    # Extended intelligence metadata
    metadata["etherscan_data"] = etherscan_data or {}
    metadata["forta_data"] = forta_data or {}
    metadata["ens_data"] = ens_data or {}
    metadata["goplus_token_data"] = goplus_token_data or {}
    metadata["goplus_approval_data"] = goplus_approval_data or {}
    metadata["mixer_sig_data"] = mixer_sig_data or {}

    # Count flagged counterparties for enrichment
    if 'sanctioned_counterparties' in dir():
        metadata["flagged_counterparty_count"] = len(sanctioned_counterparties)
        metadata["flagged_counterparties"] = len(sanctioned_counterparties)
    else:
        metadata["flagged_counterparty_count"] = 0
        metadata["flagged_counterparties"] = 0
    metadata["flagged_counterparty_labels"] = []
    metadata["mixer_hops"] = 0

    return final_score, tier["label"], flags, metadata


def _check_velocity(
    transfers: list[dict],
    eth_price_usd: float,
) -> Flag | None:
    """
    R004: Check for high transaction velocity.
    If ≥5 transactions within any 1-hour window AND total value ≥ $10,000.
    """
    if len(transfers) < 5:
        return None

    # Parse timestamps and values
    timed_txs: list[tuple[datetime, float]] = []
    for tx in transfers:
        if not tx:
            continue
        # Alchemy returns metadata.blockTimestamp
        metadata_obj = tx.get("metadata") or {}
        block_ts = metadata_obj.get("blockTimestamp")
        if not block_ts:
            continue

        try:
            ts = datetime.fromisoformat(block_ts.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue

        value = float(tx.get("value") or 0)
        asset = (tx.get("asset") or "").upper()

        # Convert ETH to USD
        if asset in ("ETH", "WETH", ""):
            usd_value = value * eth_price_usd
        else:
            usd_value = value  # ERC20 — approximate as face value

        timed_txs.append((ts, usd_value))

    if len(timed_txs) < 5:
        return None

    # Sort by time
    timed_txs.sort(key=lambda x: x[0])

    # Sliding window check
    for i in range(len(timed_txs)):
        window_start = timed_txs[i][0]
        window_end = window_start + timedelta(hours=1)

        window_txs = [(ts, val) for ts, val in timed_txs[i:] if ts <= window_end]

        if len(window_txs) >= 5:
            total_value = sum(val for _, val in window_txs)
            if total_value >= 10_000:
                return Flag(
                    id="R004",
                    name="High Transaction Velocity",
                    severity="MEDIUM",
                    description=f"Detected {len(window_txs)} transactions within a 1-hour window totaling ${total_value:,.2f}. This pattern may indicate automated trading, laundering, or wash trading.",
                    evidence={
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                        "tx_count_in_window": len(window_txs),
                        "total_usd_value": round(total_value, 2),
                    },
                )

    return None


def _check_large_new_wallet_inflow(
    address: str,
    transfers: list[dict],
    eth_price_usd: float,
) -> Flag | None:
    """
    R005: Large inflow to new wallet.
    IF first transaction < 7 days ago AND total_inflow > $10,000
    AND total_outflow > 70% of total_inflow.
    """
    # Find earliest transaction timestamp
    timestamps: list[datetime] = []
    for tx in transfers:
        if not tx:
            continue
        metadata_obj = tx.get("metadata") or {}
        block_ts = metadata_obj.get("blockTimestamp")
        if block_ts:
            try:
                timestamps.append(datetime.fromisoformat(block_ts.replace("Z", "+00:00")))
            except (ValueError, AttributeError):
                continue

    if not timestamps:
        return None

    earliest = min(timestamps)
    wallet_age = datetime.now(timezone.utc) - earliest

    if wallet_age > timedelta(days=7):
        return None

    # Calculate inflows and outflows
    total_inflow = 0.0
    total_outflow = 0.0

    for tx in transfers:
        value = float(tx.get("value") or 0)
        asset = (tx.get("asset") or "").upper()

        if asset in ("ETH", "WETH", ""):
            usd_value = value * eth_price_usd
        else:
            usd_value = value

        to_addr = (tx.get("to") or "").lower()
        from_addr = (tx.get("from") or "").lower()

        if to_addr == address:
            total_inflow += usd_value
        if from_addr == address:
            total_outflow += usd_value

    if total_inflow < 10_000:
        return None

    outflow_ratio = total_outflow / total_inflow if total_inflow > 0 else 0

    if outflow_ratio < 0.7:
        return None

    return Flag(
        id="R005",
        name="Large New Wallet Inflow",
        severity="MEDIUM",
        description=f"This wallet is {wallet_age.days} days old with ${total_inflow:,.2f} in inflows and {outflow_ratio:.0%} already moved out. New wallets with large rapid throughput are a common laundering indicator.",
        evidence={
            "wallet_age_days": wallet_age.days,
            "total_inflow_usd": round(total_inflow, 2),
            "total_outflow_usd": round(total_outflow, 2),
            "outflow_ratio": round(outflow_ratio, 4),
        },
    )
