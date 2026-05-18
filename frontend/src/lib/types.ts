// TypeScript representations of the backend Pydantic models

export interface Flag {
  id: string
  name: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  description: string
  evidence: Record<string, unknown>
}

export interface Counterparty {
  address: string
  total_volume_usd: number
  tx_count: number
  is_sanctioned: boolean
  is_mixer: boolean
  label: string | null
}

export interface ScanSummary {
  tx_count: number
  first_seen: string | null
  last_seen: string | null
  total_inflow_usd: number
  total_outflow_usd: number
  largest_tx_usd: number
  labels: string[]
}

export interface ScanResponse {
  scan_id: string
  address: string
  chain: string
  risk_score: number
  risk_tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  flags: Flag[]
  summary: ScanSummary
  counterparties: Counterparty[]
  report_url: string | null
  created_at: string | null
  cri?: CRIResponse | null
}

// CRI v2.0 Intelligence Report
export interface CRIScoring {
  rule_engine_score: number
  vector_addition: number
  correlation_multiplier: number
  final_cri_score: number
  triggered_categories: string[]
}

export interface CRIRuleFired {
  rule_id: string
  rule_name: string
  category: string
  score: number
  evidence: string
}

export interface CRIGraphSummary {
  counterparties_analyzed: number
  flagged_counterparties: number
  mixer_hops_detected: number
  peel_chain_hops: number
  sanctions_degrees: number
}

export interface CRIResponse {
  wallet_address: string
  chain: string
  analysis_timestamp: string
  scoring: CRIScoring
  risk_tier: string
  recommended_action: string
  overall_confidence: number
  rules_fired: CRIRuleFired[]
  dominant_risk_factors: string[]
  explanation: string
  low_score_audit: string | null
  graph_summary: CRIGraphSummary
  compliance_notes: string | null
  provider_used: string
}

export interface User {
  id: number
  email: string
  tier: "free" | "pro" | "api"
  scans_used_this_month: number
  scans_limit: number
  scans_remaining: number
  created_at: string | null
}

export interface AuthResponse {
  user: User
  token: string
  token_type: string
}
