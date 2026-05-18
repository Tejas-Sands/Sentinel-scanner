"""Pydantic models for the CRI v2.0 LLM intelligence engine."""

from __future__ import annotations

from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
#  Wallet Classification
# --------------------------------------------------------------------------- #

class WalletType(str, Enum):
    eoa = "eoa"
    contract = "contract"
    cex_hot_wallet = "cex_hot_wallet"
    dex_router = "dex_router"
    verified_bridge = "verified_bridge"
    known_nft_treasury = "known_nft_treasury"


# --------------------------------------------------------------------------- #
#  LLM Input — built by the enrichment layer, sent to Claude/NIM/Groq
# --------------------------------------------------------------------------- #

class RecentTx(BaseModel):
    """A single recent transaction for LLM context."""
    hash: str = ""
    value_usd: float = 0.0
    direction: str = "in"  # "in" | "out"
    counterparty: str = ""
    timestamp: str = ""  # ISO8601


class SentinelLLMInput(BaseModel):
    """
    Complete wallet analysis bundle sent to the LLM reasoning engine.
    Built by services/enrichment.py from existing scan results + raw Alchemy data.
    """

    # ── Identity ──────────────────────────────────────────────────
    wallet_address: str
    chain: str = "ethereum"
    wallet_type: WalletType = WalletType.eoa

    # ── Rule Engine Results (pass through — do NOT re-derive) ────
    rule_engine_score: int = Field(default=0, ge=0, le=100)
    rule_engine_r001_fired: bool = False    # Direct OFAC hit
    rule_engine_r002_fired: bool = False    # Sanctions exposure
    rule_engine_r002_match_count: int = 0
    rule_engine_r003_fired: bool = False    # Mixer usage
    rule_engine_r004_fired: bool = False    # High velocity
    rule_engine_r005_fired: bool = False    # New wallet inflow
    rule_engine_r006_fired: bool = False    # GoPlus fraud flag
    goplus_enabled: bool = False

    # ── V4: Obfuscation Patterns ──────────────────────────────────
    peel_chain_detected: bool = False
    peel_chain_hops: int = 0
    fanout_detected: bool = False
    fanout_recipient_count: int = 0
    fanout_window_hours: float = 0.0

    # ── V5: Behavioral Anomalies ──────────────────────────────────
    wallet_age_days: int = 0
    tx_count_lifetime: int = 0
    tx_count_24h: int = 0
    volume_24h_usd: float = 0.0
    historical_avg_tx_usd: float = 0.0
    recent_max_tx_usd: float = 0.0
    days_since_last_tx: int = 0
    volume_spike_detected: bool = False

    # ── V6: Network Topology ──────────────────────────────────────
    unique_senders_count: int = 0
    unique_receivers_count: int = 0
    forwarding_ratio: float = 0.0
    flagged_counterparty_count: int = 0
    flagged_counterparty_labels: List[str] = Field(default_factory=list)

    # ── V7: Fraud Intelligence ────────────────────────────────────
    abuse_report_count: int = 0
    abuse_report_source: Optional[str] = None
    received_from_exploit: bool = False
    time_since_exploit_days: Optional[int] = None
    phishing_activity_detected: bool = False
    is_burn_address: bool = False
    is_extreme_volume: bool = False
    total_volume_usd: float = 0.0

    # ── V8: Smart Contract (only if wallet_type = "contract") ────
    is_verified: Optional[bool] = None
    contract_balance_usd: Optional[float] = None
    honeypot_detected: Optional[bool] = None

    # ── V9: Extended Threat Intelligence ──────────────────────────
    forta_scam_label: Optional[str] = None
    ens_name: Optional[str] = None
    ens_is_phishing: bool = False
    honeypot_tokens_held: int = 0
    dangerous_approvals_count: int = 0
    internal_tx_anomalies: bool = False
    unverified_contract_interactions: int = 0
    mixer_signatures_detected: bool = False
    dormancy_days_before_spike: int = 0

    # ── Graph Summary ─────────────────────────────────────────────
    counterparties_analyzed: int = 0
    flagged_counterparties: int = 0
    mixer_hops_detected: int = 0

    # ── Raw Context (last 10 txs for richer explanation) ──────────
    recent_tx_summary: List[RecentTx] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
#  LLM Output — parsed from the LLM JSON response
# --------------------------------------------------------------------------- #

class CRIScoring(BaseModel):
    rule_engine_score: int = 0
    vector_addition: int = 0
    correlation_multiplier: float = 1.0
    final_cri_score: int = 0
    triggered_categories: List[str] = Field(default_factory=list)


class CRIRuleFired(BaseModel):
    rule_id: str = ""
    rule_name: str = ""
    category: str = ""
    score: int = 0
    evidence: str = ""


class CRIGraphSummary(BaseModel):
    counterparties_analyzed: int = 0
    flagged_counterparties: int = 0
    mixer_hops_detected: int = 0
    peel_chain_hops: int = 0
    sanctions_degrees: int = -1  # 0=direct, 1=first-degree, -1=none


class CRIResponse(BaseModel):
    """
    Full CRI output from the LLM engine.
    Matches the exact JSON output schema from the system prompt.
    """
    wallet_address: str = ""
    chain: str = "ethereum"
    analysis_timestamp: str = ""

    scoring: CRIScoring = Field(default_factory=CRIScoring)

    risk_tier: str = "LOW"
    recommended_action: str = "NONE"
    overall_confidence: float = 0.5

    rules_fired: List[CRIRuleFired] = Field(default_factory=list)
    dominant_risk_factors: List[str] = Field(default_factory=list)

    explanation: str = ""
    low_score_audit: Optional[str] = None

    graph_summary: CRIGraphSummary = Field(default_factory=CRIGraphSummary)
    compliance_notes: Optional[str] = None

    # Meta — which provider was used
    provider_used: str = "fallback"
