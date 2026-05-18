"""Scan endpoints — POST /scan and GET /scan/{scan_id}."""

import asyncio
import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request

from auth import get_current_user_id
from config import get_settings
from database import get_db
from models import (
    Counterparty,
    Flag,
    ScanRequest,
    ScanResponse,
    ScanSummary,
)
from services.alchemy import get_asset_transfers
from services.coingecko import get_current_eth_price
from services.goplus import check_address_security, check_tokens_batch, check_approval_security
from services.ofac import get_sanctions_set, get_mixer_set, get_sanctions_info, get_mixer_info
from services.risk_engine import score_address
from services.blockchain import check_stablecoin_blacklists
from services.darklist import is_on_mew_darklist
from services.enrichment import enrich
from services.llm_engine import run_llm_analysis
from services.etherscan import analyze_etherscan_data
from services.forta import get_forta_data
from services.ens import get_ens_data
from services.fourbyte import detect_mixer_signatures
from services.blockchair import get_address_stats

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
async def create_scan(
    body: ScanRequest,
    request: Request,
    user_id: Optional[int] = Depends(get_current_user_id),
) -> ScanResponse:
    """
    Scan an Ethereum address for compliance risk.

    Flow:
    1. Validate address format (done by Pydantic)
    2. Check user tier + scan limits
    3. Phase 1: Core intelligence (Alchemy + GoPlus + Stablecoins + Darklist + Forta + ENS)
    4. Phase 2: Enrichment intelligence (Etherscan + GoPlus Token/Approval + 4byte + Blockchair)
    5. Run risk scoring (22 rules)
    6. Enrich data + run LLM CRI analysis
    7. Store result
    8. Return scan response with CRI intelligence
    """
    settings = get_settings()
    address = body.address.lower()

    # --- Check scan limits for anonymous users ---
    if user_id is None:
        ip = request.client.host if request.client else "unknown"
        cache_key = f"anon_scan_count:{ip}"
        
        from services.cache_manager import get_cache, set_cache
        anon_count = await get_cache(cache_key) or 0
        
        if anon_count >= 2:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Anonymous scan limit reached. Please register or login to scan more addresses.",
                    "error_code": "ANON_LIMIT_EXCEEDED"
                }
            )
        
        # Store anon scan count for 24 hours
        await set_cache(cache_key, anon_count + 1, ttl_seconds=86400)

    # --- Check scan limits for authenticated users ---
    if user_id is not None:
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT tier, scans_used_this_month, scans_limit, month_reset FROM users WHERE id = ?",
                (user_id,),
            )
            user = await cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            current_month = datetime.now(timezone.utc).strftime("%Y-%m")
            month_reset = user[3] or ""

            # Reset counter if new month
            if month_reset != current_month:
                await db.execute(
                    "UPDATE users SET scans_used_this_month = 0, month_reset = ? WHERE id = ?",
                    (current_month, user_id),
                )
                await db.commit()
                scans_used = 0
            else:
                scans_used = user[1]

            scans_limit = user[2]

            tier = user[0]

            if scans_used >= scans_limit:
                if tier == "free":
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "message": "Free tier scan limit finished. Please subscribe to Pro to continue scanning addresses.",
                            "scans_used": scans_used,
                            "scans_limit": scans_limit,
                            "upgrade_url": f"{settings.frontend_url}/pricing",
                            "error_code": "FREE_TIER_LIMIT_EXCEEDED"
                        },
                    )
                else:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "message": "Monthly scan limit reached. Please upgrade to continue scanning addresses.",
                            "scans_used": scans_used,
                            "scans_limit": scans_limit,
                            "upgrade_url": f"{settings.frontend_url}/pricing",
                            "error_code": "LIMIT_EXCEEDED"
                        },
                    )
        finally:
            await db.close()

    # ================================================================== #
    #  PHASE 1: Core Intelligence Gathering (parallel)
    # ================================================================== #
    goplus_data = None
    stablecoin_status = None
    is_mew_darklisted = False
    forta_data = None
    ens_data = None
    etherscan_data = None
    blockchair_data = None
    
    phase1_tasks = [
        get_asset_transfers(address, direction="both", max_count=300),
        check_stablecoin_blacklists(address),
        is_on_mew_darklist(address),
        get_forta_data(address),
        get_ens_data(address),
    ]
    
    if settings.goplus_enabled:
        phase1_tasks.append(check_address_security(address))
    if settings.etherscan_enabled:
        phase1_tasks.append(analyze_etherscan_data(address))
    
    phase1_results = await asyncio.gather(*phase1_tasks, return_exceptions=True)
    
    # Unpack Phase 1 results safely
    idx = 0
    transfers = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else []; idx += 1
    stablecoin_status = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else None; idx += 1
    is_mew_darklisted = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else False; idx += 1
    forta_data = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else None; idx += 1
    ens_data = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else None; idx += 1
    if settings.goplus_enabled:
        goplus_data = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else None; idx += 1
    if settings.etherscan_enabled:
        etherscan_data = phase1_results[idx] if not isinstance(phase1_results[idx], Exception) else None; idx += 1

    # ================================================================== #
    #  PHASE 2: Enrichment Intelligence (depends on Phase 1 data)
    # ================================================================== #
    goplus_token_data = None
    goplus_approval_data = None
    mixer_sig_data = None

    phase2_tasks = []

    # GoPlus token security: check tokens found in Etherscan ERC-20 transfers
    token_addrs = []
    if etherscan_data and isinstance(etherscan_data, dict):
        token_addrs = etherscan_data.get("unique_token_addresses", [])
    if token_addrs:
        phase2_tasks.append(check_tokens_batch(token_addrs))
    else:
        async def _empty_token_data():
            return {"honeypot_count": 0, "dangerous_tokens": [], "tokens_checked": 0}
        phase2_tasks.append(_empty_token_data())

    # GoPlus approval security
    phase2_tasks.append(check_approval_security(address))

    # 4byte mixer signature detection from Etherscan normal txs
    normal_txs = []
    if etherscan_data and isinstance(etherscan_data, dict):
        normal_txs = etherscan_data.get("normal_txs", [])
    phase2_tasks.append(detect_mixer_signatures(normal_txs))

    # Blockchair (optional)
    phase2_tasks.append(get_address_stats(address))

    phase2_results = await asyncio.gather(*phase2_tasks, return_exceptions=True)
    
    goplus_token_data = phase2_results[0] if not isinstance(phase2_results[0], Exception) else None
    goplus_approval_data = phase2_results[1] if not isinstance(phase2_results[1], Exception) else None
    mixer_sig_data = phase2_results[2] if not isinstance(phase2_results[2], Exception) else None
    blockchair_data = phase2_results[3] if not isinstance(phase2_results[3], Exception) else None

    # --- Get current ETH price ---
    eth_price = await get_current_eth_price()

    # --- Run risk scoring (R001–R022) ---
    risk_score, risk_tier, flags, metadata = await score_address(
        address, transfers, eth_price, 
        goplus_data=goplus_data,
        stablecoin_status=stablecoin_status,
        is_mew_darklisted=is_mew_darklisted,
        etherscan_data=etherscan_data,
        forta_data=forta_data,
        goplus_token_data=goplus_token_data,
        goplus_approval_data=goplus_approval_data,
        ens_data=ens_data,
        mixer_sig_data=mixer_sig_data,
        blockchair_data=blockchair_data,
    )

    # --- Build summary and counterparties ---
    summary = _build_summary(address, transfers, eth_price)
    counterparties = await _build_counterparties(address, transfers, eth_price)

    # --- CRI v2.0: Enrich + LLM Analysis ---
    cri_report = None
    try:
        llm_input = enrich(address, body.chain, metadata, transfers, eth_price)
        cri_report = await run_llm_analysis(llm_input)
        logger.info(
            "CRI analysis complete: score=%s tier=%s provider=%s",
            cri_report.get("scoring", {}).get("final_cri_score"),
            cri_report.get("risk_tier"),
            cri_report.get("provider_used"),
        )
    except Exception as e:
        logger.error("CRI analysis failed (non-fatal): %s", str(e))
        # CRI failure is non-fatal — existing rule engine result still works

    # --- Generate scan ID and store ---
    scan_id = str(uuid.uuid4())

    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO scans
               (scan_id, user_id, address, chain, risk_score, risk_tier, flags,
                tx_count, first_seen, last_seen, total_inflow_usd, total_outflow_usd,
                largest_tx_usd, labels, counterparties, raw_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                scan_id,
                user_id,
                address,
                body.chain,
                risk_score,
                risk_tier,
                json.dumps([f.model_dump() for f in flags]),
                summary.tx_count,
                summary.first_seen,
                summary.last_seen,
                summary.total_inflow_usd,
                summary.total_outflow_usd,
                summary.largest_tx_usd,
                json.dumps(summary.labels),
                json.dumps([c.model_dump() for c in counterparties]),
                json.dumps(cri_report) if cri_report else "{}",
            ),
        )

        # Increment scan count for authenticated users
        if user_id is not None:
            await db.execute(
                "UPDATE users SET scans_used_this_month = scans_used_this_month + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (user_id,),
            )

        await db.commit()
    finally:
        await db.close()

    report_url = f"{settings.frontend_url}/report/{scan_id}"

    return ScanResponse(
        scan_id=scan_id,
        address=address,
        chain=body.chain,
        risk_score=risk_score,
        risk_tier=risk_tier,
        flags=flags,
        summary=summary,
        counterparties=counterparties[:10],  # Top 10
        report_url=report_url,
        created_at=datetime.now(timezone.utc).isoformat(),
        cri=cri_report,
    )


@router.get("/scan/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str) -> ScanResponse:
    """Get a scan result by ID. Public — no auth required."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT scan_id, address, chain, risk_score, risk_tier, flags,
                      tx_count, first_seen, last_seen, total_inflow_usd,
                      total_outflow_usd, largest_tx_usd, labels,
                      counterparties, created_at
               FROM scans WHERE scan_id = ?""",
            (scan_id,),
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Scan not found")

        settings = get_settings()
        report_url = f"{settings.frontend_url}/report/{row[0]}"

        return ScanResponse(
            scan_id=row[0],
            address=row[1],
            chain=row[2],
            risk_score=row[3],
            risk_tier=row[4],
            flags=[Flag(**f) for f in json.loads(row[5])],
            summary=ScanSummary(
                tx_count=row[6] or 0,
                first_seen=row[7],
                last_seen=row[8],
                total_inflow_usd=row[9] or 0,
                total_outflow_usd=row[10] or 0,
                largest_tx_usd=row[11] or 0,
                labels=json.loads(row[12]) if row[12] else [],
            ),
            counterparties=[Counterparty(**c) for c in json.loads(row[13])] if row[13] else [],
            report_url=report_url,
            created_at=row[14],
        )
    finally:
        await db.close()


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #

def _build_summary(
    address: str,
    transfers: list[dict],
    eth_price: float,
) -> ScanSummary:
    """Build summary statistics from transfer data."""
    if not transfers:
        return ScanSummary()

    timestamps: list[str] = []
    total_inflow = 0.0
    total_outflow = 0.0
    largest_tx = 0.0

    for tx in transfers:
        if not tx:
            continue
        metadata_obj = tx.get("metadata") or {}
        block_ts = metadata_obj.get("blockTimestamp", "")
        if block_ts:
            timestamps.append(block_ts)

        value = float(tx.get("value") or 0)
        asset = (tx.get("asset") or "").upper()

        if asset in ("ETH", "WETH", ""):
            usd_value = value * eth_price
        else:
            usd_value = value

        to_addr = (tx.get("to") or "").lower()
        from_addr = (tx.get("from") or "").lower()

        if to_addr == address:
            total_inflow += usd_value
        if from_addr == address:
            total_outflow += usd_value

        largest_tx = max(largest_tx, usd_value)

    timestamps.sort()
    first_seen = timestamps[0] if timestamps else None
    last_seen = timestamps[-1] if timestamps else None

    return ScanSummary(
        tx_count=len(transfers),
        first_seen=first_seen,
        last_seen=last_seen,
        total_inflow_usd=round(total_inflow, 2),
        total_outflow_usd=round(total_outflow, 2),
        largest_tx_usd=round(largest_tx, 2),
        labels=[],
    )


async def _build_counterparties(
    address: str,
    transfers: list[dict],
    eth_price: float,
) -> list[Counterparty]:
    """Build counterparty list from transfer data, sorted by volume."""
    if not transfers:
        return []

    sanctions_set = get_sanctions_set()
    mixer_set = get_mixer_set()

    # Aggregate by counterparty address
    cp_data: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"total_volume_usd": 0.0, "tx_count": 0}
    )

    for tx in transfers:
        if not tx:
            continue
        from_addr = (tx.get("from") or "").lower()
        to_addr = (tx.get("to") or "").lower()

        value = float(tx.get("value") or 0)
        asset = (tx.get("asset") or "").upper()
        usd_value = value * eth_price if asset in ("ETH", "WETH", "") else value

        # Determine counterparty
        cp_addr = None
        if from_addr == address and to_addr:
            cp_addr = to_addr
        elif to_addr == address and from_addr:
            cp_addr = from_addr

        if cp_addr:
            cp_data[cp_addr]["total_volume_usd"] += usd_value
            cp_data[cp_addr]["tx_count"] += 1

    # Build counterparty objects
    counterparties: list[Counterparty] = []
    for cp_addr, data in cp_data.items():
        label = None
        if cp_addr in sanctions_set:
            info = await get_sanctions_info(cp_addr)
            label = info.get("entity_name") if info else "Sanctioned"
        elif cp_addr in mixer_set:
            info = await get_mixer_info(cp_addr)
            label = info.get("name") if info else "Mixer"

        counterparties.append(Counterparty(
            address=cp_addr,
            total_volume_usd=round(data["total_volume_usd"], 2),
            tx_count=data["tx_count"],
            is_sanctioned=cp_addr in sanctions_set,
            is_mixer=cp_addr in mixer_set,
            label=label,
        ))

    # Sort by volume descending
    counterparties.sort(key=lambda c: c.total_volume_usd, reverse=True)

    return counterparties[:10]
