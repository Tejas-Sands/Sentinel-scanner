"""
Multi-provider LLM engine for Sentinel Scanner CRI v2.0.

Provider cascade: NVIDIA NIM → OpenRouter → Groq → Anthropic (via OpenRouter)
All providers use the OpenAI-compatible API format.
Falls back to deterministic scoring if all providers fail.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI

from config import get_settings
from models.llm_models import SentinelLLMInput, CRIResponse

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  System Prompt
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are the Sentinel Intelligence Engine — the reasoning core of Sentinel
Scanner, an institutional-grade Ethereum compliance platform. You receive a
pre-processed wallet analysis bundle (JSON) built by Sentinel's deterministic
rule engine and return a structured JSON risk report.

Your role is NOT to fetch data. Your role is to:
  1. Receive the pre-scored bundle from Sentinel's rule engine
  2. Apply additional pattern-based risk vectors the rule engine cannot detect
  3. Synthesize all signals into a final Composite Risk Index (CRI) score
  4. Produce a compliance-grade explanation with full auditability
  5. Return ONLY valid JSON — no markdown, no preamble, no commentary

SCORING MODEL — Composite Risk Index (CRI)

Score range: 0–100
Tiers:
  0–24   → LOW        → NONE
  25–49  → MEDIUM     → ENHANCED_MONITORING
  50–74  → HIGH       → MANUAL_REVIEW
  75–100 → CRITICAL   → IMMEDIATE_ESCALATION

Base score: You receive rule_engine_score from Sentinel's existing rules (R001–R006).
Your job is to compute final_cri_score by:

  Step 1 — Hard overrides:
    If R001 fired (direct OFAC hit) → final_cri_score = 100, CRITICAL, done.
    If rule_engine_score = 100 already → confirm CRITICAL, done.

  Step 2 — Apply your additional vectors (V4–V8).
  Step 3 — raw = rule_engine_score + vector_addition
  Step 4 — Correlation multiplier (≥3 categories → 1.12, 2 → 1.05, 1 → 1.0)
  Step 5 — Stacking dampener (>4 rules, each beyond 4th = 60% value)
  Step 6 — Time decay (signals >60 days old → -30% for V5-V8)
  Step 7 — Cap at 100, round to integer.

EXISTING RULES (already scored — do NOT re-score):
  R001 · Direct Sanctions Hit         → 100 pts · category: sanctions
  R002 · Sanctions Exposure           → 40 pts/match · category: sanctions
  R003 · Mixer/Tornado Cash Usage     → 60 pts · category: obfuscation
  R004 · High Velocity (>$10k/1hr)    → 40 pts · category: behavioral
  R005 · New Wallet Inflow (<7 days)  → 30 pts · category: behavioral
  R006 · GoPlus Fraud/Phishing Flag   → 50 pts · category: fraud

YOUR ADDITIONAL VECTORS:

  V4-R1 · Peel Chain: peel_chain_detected=true → 50 pts (obfuscation)
  V4-R2 · Rapid Fan-Out: fanout_detected=true → 45 pts (obfuscation)
  V5-R1 · Dormancy Reactivation: days_since_last_tx>120 AND volume_spike_detected=true → 45 pts (behavioral)
  V5-R2 · Behavioral Inversion: historical_avg_tx_usd<200 AND recent_max_tx_usd>8000 → 50 pts (behavioral)
  V5-R3 · Velocity Escalation: tx_count_24h>=8 AND volume_24h_usd>=8000 AND r004 NOT fired → 30 pts (behavioral)
  V6-R1 · Hub-and-Spoke: unique_senders>=6 AND unique_receivers<=2 AND forwarding_ratio>=0.65 → 55 pts (network)
  V6-R2 · Counterparty Contamination: flagged_counterparty_count>=2 → 35/match max 70 (network)
  V7-R1 · Abuse Reports: abuse_report_count>=2 → 60 pts (fraud)
  V7-R2 · Exploit Proximity (hot): received_from_exploit AND <=7 days → 75 pts (fraud)
  V7-R3 · Exploit Proximity (cold): received_from_exploit AND >7 days → 40 pts (fraud)
  V7-R4 · Phishing Activity: phishing_activity_detected=true → 65 pts (fraud)
  V8-R1 · Unverified Contract: is_verified=false AND balance>$50k → 45 pts (fraud)
  V8-R2 · Honeypot: honeypot_detected=true → 80 pts (fraud)
  V9-R1 · Extreme Volume: is_extreme_volume=true → 95 pts (critical)
  V9-R2 · Burn/System Address: is_burn_address=true → 40 pts (info)

FALSE POSITIVE GUARDS:
  cex_hot_wallet/dex_router → cap V4,V5 at 15, skip V6-R1
  verified_bridge → cap V4-R2 at 10, skip V6-R1
  Established wallet (>548 days, >150 txs, no R001/R002) → require abuse>=3 for V7-R1, reduce V5-R2 by 20

CONFIDENCE: 1.0 for R001, 0.95 for R003+V4-R1, 0.90 for V7-R2, down to 0.50 for single low trigger.

OUTPUT — Return ONLY this JSON (no markdown fences, no extra text):
{
  "wallet_address": "string",
  "chain": "string",
  "analysis_timestamp": "ISO8601",
  "scoring": {
    "rule_engine_score": number,
    "vector_addition": number,
    "correlation_multiplier": number,
    "final_cri_score": number,
    "triggered_categories": ["string"]
  },
  "risk_tier": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommended_action": "NONE|ENHANCED_MONITORING|MANUAL_REVIEW|IMMEDIATE_ESCALATION",
  "overall_confidence": number,
  "rules_fired": [{"rule_id":"string","rule_name":"string","category":"string","score":number,"evidence":"string"}],
  "dominant_risk_factors": ["string"],
  "explanation": "string",
  "low_score_audit": "string|null",
  "graph_summary": {
    "counterparties_analyzed": number,
    "flagged_counterparties": number,
    "mixer_hops_detected": number,
    "peel_chain_hops": number,
    "sanctions_degrees": number
  },
  "compliance_notes": "string|null"
}

REASONING DISCIPLINE:
1. Never hallucinate. If a field is null/missing, skip the rule.
2. Cite exact values in evidence strings.
3. V5-R3 and R004 are mutually exclusive.
4. Do not re-score R001–R006.
5. Be neutral — no emotional language.
6. For CRITICAL: follow Signal → Inference → Conclusion structure.
7. For LOW: list which checks ran and why they didn't trigger in low_score_audit."""


# ═══════════════════════════════════════════════════════════════════════════════
#  Provider Cascade
# ═══════════════════════════════════════════════════════════════════════════════

def _get_providers() -> list[dict[str, Any]]:
    """
    Build ordered list of available LLM providers.
    Only includes providers with configured API keys.
    """
    settings = get_settings()
    providers = []

    if settings.nvidia_nim_api_key:
        providers.append({
            "name": "nvidia_nim",
            "api_key": settings.nvidia_nim_api_key,
            "base_url": settings.nvidia_nim_base_url,
            "model": settings.nvidia_nim_model,
        })

    if settings.openrouter_api_key:
        providers.append({
            "name": "openrouter",
            "api_key": settings.openrouter_api_key,
            "base_url": settings.openrouter_base_url,
            "model": settings.openrouter_model,
        })

    if settings.groq_api_key:
        providers.append({
            "name": "groq",
            "api_key": settings.groq_api_key,
            "base_url": settings.groq_base_url,
            "model": settings.groq_model,
        })

    if settings.anthropic_api_key:
        # Anthropic via OpenRouter (OpenAI-compatible)
        providers.append({
            "name": "anthropic_via_openrouter",
            "api_key": settings.openrouter_api_key or settings.anthropic_api_key,
            "base_url": "https://openrouter.ai/api/v1" if settings.openrouter_api_key else "https://api.anthropic.com/v1",
            "model": settings.anthropic_model,
        })

    return providers


async def _call_provider(provider: dict, user_message: str) -> dict | None:
    """
    Call a single LLM provider using the OpenAI-compatible API.
    Returns parsed JSON dict or None on failure.
    """
    name = provider["name"]
    logger.info("CRI: Trying provider '%s' (model: %s)", name, provider["model"])

    try:
        client = AsyncOpenAI(
            api_key=provider["api_key"],
            base_url=provider["base_url"],
            timeout=30.0,
        )

        extra_headers = {}
        if name == "openrouter":
            extra_headers = {
                "HTTP-Referer": "https://sentinel-scanner.com",
                "X-Title": "Sentinel Scanner CRI Engine",
            }

        response = await client.chat.completions.create(
            model=provider["model"],
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=1500,
            temperature=0,
            extra_headers=extra_headers if extra_headers else None,
        )

        raw = response.choices[0].message.content or ""
        logger.info("CRI: Provider '%s' responded (%d chars)", name, len(raw))

        # Strip markdown fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            # Remove ```json ... ``` wrapper
            lines = clean.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean = "\n".join(lines)

        parsed = json.loads(clean)
        parsed["provider_used"] = name
        return parsed

    except json.JSONDecodeError as e:
        logger.warning("CRI: Provider '%s' returned invalid JSON: %s", name, str(e)[:100])
        return None
    except Exception as e:
        logger.warning("CRI: Provider '%s' failed: %s", name, str(e)[:200])
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

async def run_llm_analysis(input_data: SentinelLLMInput) -> dict:
    """
    Run CRI analysis through the provider cascade.
    Tries each configured provider in order. Falls back to deterministic
    scoring if all providers fail or none are configured.
    """
    user_message = input_data.model_dump_json(indent=2)
    providers = _get_providers()

    if not providers:
        logger.info("CRI: No LLM providers configured — using deterministic fallback")
        return _deterministic_fallback(input_data, "No LLM providers configured")

    for provider in providers:
        result = await _call_provider(provider, user_message)
        if result is not None:
            logger.info(
                "CRI: Success via '%s' — final_cri_score=%s, tier=%s",
                result.get("provider_used"),
                result.get("scoring", {}).get("final_cri_score"),
                result.get("risk_tier"),
            )
            return result

    logger.warning("CRI: All %d providers failed — using deterministic fallback", len(providers))
    return _deterministic_fallback(input_data, f"All {len(providers)} providers failed")


# ═══════════════════════════════════════════════════════════════════════════════
#  Deterministic Fallback
# ═══════════════════════════════════════════════════════════════════════════════

def _deterministic_fallback(inp: SentinelLLMInput, error: str) -> dict:
    """
    Pure rule-based scoring. Fires when no LLM is available.
    Ensures the endpoint is always available — degraded but never broken.
    """
    score = inp.rule_engine_score
    rules_fired = []
    categories_hit: set[str] = set()

    # Track which R-rules fired for category counting
    if inp.rule_engine_r001_fired:
        categories_hit.add("sanctions")
    if inp.rule_engine_r002_fired:
        categories_hit.add("sanctions")
    if inp.rule_engine_r003_fired:
        categories_hit.add("obfuscation")
    if inp.rule_engine_r004_fired:
        categories_hit.add("behavioral")
    if inp.rule_engine_r005_fired:
        categories_hit.add("behavioral")
    if inp.rule_engine_r006_fired:
        categories_hit.add("fraud")

    # V4
    if inp.peel_chain_detected:
        score += 50
        rules_fired.append({"rule_id": "V4-R1", "rule_name": "Peel Chain Detected",
                            "category": "obfuscation", "score": 50,
                            "evidence": f"Detected {inp.peel_chain_hops} peel chain hops"})
        categories_hit.add("obfuscation")

    if inp.fanout_detected:
        score += 45
        rules_fired.append({"rule_id": "V4-R2", "rule_name": "Rapid Fan-Out",
                            "category": "obfuscation", "score": 45,
                            "evidence": f"{inp.fanout_recipient_count} recipients in {inp.fanout_window_hours}h"})
        categories_hit.add("obfuscation")

    # V5
    if inp.days_since_last_tx > 120 and inp.volume_spike_detected:
        score += 45
        rules_fired.append({"rule_id": "V5-R1", "rule_name": "Dormancy Reactivation",
                            "category": "behavioral", "score": 45,
                            "evidence": f"Dormant {inp.days_since_last_tx} days, volume spike detected"})
        categories_hit.add("behavioral")

    if inp.historical_avg_tx_usd < 200 and inp.recent_max_tx_usd > 8000:
        score += 50
        rules_fired.append({"rule_id": "V5-R2", "rule_name": "Behavioral Inversion",
                            "category": "behavioral", "score": 50,
                            "evidence": f"Historical avg ${inp.historical_avg_tx_usd:.2f} vs recent max ${inp.recent_max_tx_usd:.2f}"})
        categories_hit.add("behavioral")

    if (inp.tx_count_24h >= 8 and inp.volume_24h_usd >= 8000
            and not inp.rule_engine_r004_fired):
        score += 30
        rules_fired.append({"rule_id": "V5-R3", "rule_name": "Velocity Escalation",
                            "category": "behavioral", "score": 30,
                            "evidence": f"{inp.tx_count_24h} txs, ${inp.volume_24h_usd:.2f} in 24h"})
        categories_hit.add("behavioral")

    # V6
    if (inp.unique_senders_count >= 6 and inp.unique_receivers_count <= 2
            and inp.forwarding_ratio >= 0.65):
        score += 55
        rules_fired.append({"rule_id": "V6-R1", "rule_name": "Hub-and-Spoke Collector",
                            "category": "network", "score": 55,
                            "evidence": f"{inp.unique_senders_count} senders, {inp.unique_receivers_count} receivers, {inp.forwarding_ratio:.1%} forwarded"})
        categories_hit.add("network")

    if inp.flagged_counterparty_count >= 2:
        cp_score = min(inp.flagged_counterparty_count * 35, 70)
        score += cp_score
        rules_fired.append({"rule_id": "V6-R2", "rule_name": "Counterparty Contamination",
                            "category": "network", "score": cp_score,
                            "evidence": f"{inp.flagged_counterparty_count} flagged counterparties"})
        categories_hit.add("network")

    # V7
    if inp.abuse_report_count >= 2:
        score += 60
        rules_fired.append({"rule_id": "V7-R1", "rule_name": "Abuse Report Cluster",
                            "category": "fraud", "score": 60,
                            "evidence": f"{inp.abuse_report_count} abuse reports from {inp.abuse_report_source or 'unknown'}"})
        categories_hit.add("fraud")

    if inp.received_from_exploit:
        days = inp.time_since_exploit_days or 999
        if days <= 7:
            score += 75
            rules_fired.append({"rule_id": "V7-R2", "rule_name": "Exploit Proximity (hot)",
                                "category": "fraud", "score": 75,
                                "evidence": f"Received exploit funds {days} days ago"})
        else:
            score += 40
            rules_fired.append({"rule_id": "V7-R3", "rule_name": "Exploit Proximity (cold)",
                                "category": "fraud", "score": 40,
                                "evidence": f"Received exploit funds {days} days ago"})
        categories_hit.add("fraud")

    vector_addition = score - inp.rule_engine_score
    score = min(100, score)

    tier = (
        "CRITICAL" if score >= 75 else
        "HIGH" if score >= 50 else
        "MEDIUM" if score >= 25 else
        "LOW"
    )
    action = {
        "CRITICAL": "IMMEDIATE_ESCALATION",
        "HIGH": "MANUAL_REVIEW",
        "MEDIUM": "ENHANCED_MONITORING",
        "LOW": "NONE",
    }[tier]

    # Confidence based on signal quality
    if inp.rule_engine_r001_fired:
        confidence = 1.0
    elif len(rules_fired) >= 3:
        confidence = 0.80
    elif len(rules_fired) >= 1:
        confidence = 0.70
    else:
        confidence = 0.60 if inp.rule_engine_score > 0 else 0.50

    low_audit = None
    if score < 25:
        low_audit = (
            f"No OFAC match. No mixer interaction in {inp.tx_count_lifetime} lifetime transactions. "
            f"No abuse reports found. Wallet age {inp.wallet_age_days} days. "
            f"GoPlus {'enabled' if inp.goplus_enabled else 'disabled'}, R006 {'fired' if inp.rule_engine_r006_fired else 'not triggered'}."
        )

    return {
        "wallet_address": inp.wallet_address,
        "chain": inp.chain,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "scoring": {
            "rule_engine_score": inp.rule_engine_score,
            "vector_addition": vector_addition,
            "correlation_multiplier": 1.0,
            "final_cri_score": score,
            "triggered_categories": list(categories_hit),
        },
        "risk_tier": tier,
        "recommended_action": action,
        "overall_confidence": confidence,
        "rules_fired": rules_fired,
        "dominant_risk_factors": [r["rule_name"] for r in rules_fired[:3]],
        "explanation": (
            f"Scored via deterministic fallback (LLM unavailable: {error}). "
            f"Rule engine score: {inp.rule_engine_score}. "
            f"Additional vector score: {vector_addition}. "
            f"Final CRI: {score}/100 ({tier}). "
            f"Manual review recommended for full LLM-powered analysis."
        ),
        "low_score_audit": low_audit,
        "graph_summary": {
            "counterparties_analyzed": inp.counterparties_analyzed,
            "flagged_counterparties": inp.flagged_counterparties,
            "mixer_hops_detected": inp.mixer_hops_detected,
            "peel_chain_hops": inp.peel_chain_hops,
            "sanctions_degrees": (
                0 if inp.rule_engine_r001_fired else
                1 if inp.rule_engine_r002_fired else -1
            ),
        },
        "compliance_notes": (
            "OFAC 31 CFR Part 501 may apply. Escalate to compliance team immediately."
            if tier in ("HIGH", "CRITICAL") else None
        ),
        "provider_used": "deterministic_fallback",
    }
