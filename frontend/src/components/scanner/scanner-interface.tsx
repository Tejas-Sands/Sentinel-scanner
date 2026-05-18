"use client"

import { useState, useEffect } from "react"
import { useScan, useGenerateReport } from "@/hooks/use-scan"
import { RiskGauge } from "./risk-gauge"
import { FlagsList } from "./flags-list"
import { StatsRow } from "./stats-row"
import { CounterpartyTable } from "./counterparty-table"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Download, Share2, AlertCircle, ShieldCheck, Zap } from "lucide-react"
import { TIER_BG_COLORS } from "@/lib/display"
import { motion, AnimatePresence } from "framer-motion"

export function ScannerInterface() {
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  
  const scanMutation = useScan()
  const reportMutation = useGenerateReport()

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const LOADING_MESSAGES = [
    "Analyzing transaction history...",
    "Consulting OFAC SDN database...",
    "Auditing USDT/USDC blacklists...",
    "Tracing transaction graph hops...",
    "NVIDIA NIM reasoning in progress...",
    "Evaluating behavioral anomalies...",
    "Generating composite risk index...",
    "Finalizing compliance report..."
  ]

  // Cycle loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (scanMutation.isPending) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 1500)
    } else {
      setLoadingMessageIndex(0)
    }
    return () => clearInterval(interval)
  }, [scanMutation.isPending])

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Please enter a valid Ethereum address")
      return
    }

    scanMutation.mutate(address, {
      onError: (err) => {
        setError(err.message)
      }
    })
  }

  const handleDownload = () => {
    if (!scanMutation.data) return
    reportMutation.mutate(scanMutation.data.scan_id, {
      onSuccess: (url) => {
        window.open(url, "_blank")
      }
    })
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6 mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <Zap className="h-3 w-3 fill-current" />
          Institutional Grade
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-heading leading-tight">
          Compliance screening <br />
          <span className="text-primary">made simple.</span>
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">
          Paste any ETH address and get a detailed risk report in seconds.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-3xl mx-auto mb-16"
      >
        <form onSubmit={handleScan} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col md:flex-row items-center gap-4 bg-card border border-border/50 p-2 rounded-2xl shadow-2xl glass">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Paste Ethereum address (0x...)"
                className="w-full pl-12 h-14 text-lg border-none bg-transparent focus-visible:ring-0 font-mono placeholder:text-muted-foreground/50"
                disabled={scanMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="w-full md:w-auto h-14 px-8 text-base font-bold shadow-lg shadow-primary/20 rounded-xl"
              disabled={scanMutation.isPending || !address}
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {LOADING_MESSAGES[loadingMessageIndex]}
                </>
              ) : (
                "Scan Wallet"
              )}
            </Button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-8 left-4 flex items-center text-destructive text-sm font-semibold"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {scanMutation.data && (
          <motion.div 
            key={scanMutation.data.scan_id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-20"
          >
            <Card className="glass border-border/50 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-3xl">
              {/* Premium Header */}
              <div className="p-8 md:p-12 border-b border-border/50 bg-primary/5">
                <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <h2 className="text-3xl font-extrabold font-heading">Scan Result</h2>
                      <Badge className={`${TIER_BG_COLORS[scanMutation.data.risk_tier]} text-white px-4 py-1 text-sm font-bold border-none shadow-lg`}>
                        {scanMutation.data.risk_tier} RISK
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target Address</p>
                      <p className="font-mono text-foreground text-lg break-all selection:bg-primary/30">
                        {scanMutation.data.address}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <Button 
                        variant="secondary" 
                        size="lg"
                        className="rounded-xl font-bold border border-border/50"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + "/report/" + scanMutation.data!.scan_id)
                          alert("Link copied to clipboard!")
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Report
                      </Button>
                      <Button 
                        size="lg"
                        className="rounded-xl font-bold shadow-xl shadow-primary/20"
                        onClick={handleDownload} 
                        disabled={reportMutation.isPending}
                      >
                        {reportMutation.isPending ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download PDF
                      </Button>
                    </div>
                  </div>
                  
                  <div className="shrink-0 scale-110">
                    <RiskGauge score={scanMutation.data.risk_score} tier={scanMutation.data.risk_tier} />
                  </div>
                </div>
              </div>

              {/* Content Tabs */}
              <div className="p-8 md:p-12">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="h-14 bg-muted/30 p-1.5 rounded-2xl mb-10 w-full max-w-lg mx-auto grid grid-cols-4">
                    <TabsTrigger value="overview" className="rounded-xl font-bold text-xs md:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="flags" className="rounded-xl font-bold text-xs md:text-sm">
                      Flags
                      {scanMutation.data.flags.length > 0 && (
                        <span className="ml-1 bg-destructive text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {scanMutation.data.flags.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="rounded-xl font-bold text-xs md:text-sm">
                      Intelligence
                      {scanMutation.data.cri && (
                        <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="counterparties" className="rounded-xl font-bold text-xs md:text-sm">Network</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-12">
                    <div className="grid gap-8">
                      <StatsRow summary={scanMutation.data.summary} />
                      
                      {scanMutation.data.flags.some(f => f.severity === "CRITICAL" || f.severity === "HIGH") ? (
                        <div className="space-y-6">
                          <h3 className="text-2xl font-extrabold font-heading flex items-center gap-3 text-destructive">
                            <ShieldCheck className="h-6 w-6" />
                            Critical Risk Indicators
                          </h3>
                          <FlagsList flags={scanMutation.data.flags.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH")} />
                        </div>
                      ) : (
                        <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5 flex flex-col items-center text-center space-y-4">
                          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold">No Critical Threats</h3>
                          <p className="text-muted-foreground max-w-md">
                            We didn&apos;t find any direct sanctions or mixer interactions for this wallet.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="flags">
                    <FlagsList flags={scanMutation.data.flags} />
                  </TabsContent>
                  
                  <TabsContent value="intelligence">
                    {scanMutation.data.cri ? (
                      <div className="space-y-8">
                        {/* CRI Score Header */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass text-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">CRI Score</p>
                            <p className={`text-5xl font-black font-heading ${
                              scanMutation.data.cri.scoring.final_cri_score >= 75 ? 'text-red-500' :
                              scanMutation.data.cri.scoring.final_cri_score >= 50 ? 'text-orange-500' :
                              scanMutation.data.cri.scoring.final_cri_score >= 25 ? 'text-yellow-500' : 'text-green-500'
                            }`}>{scanMutation.data.cri.scoring.final_cri_score}</p>
                            <p className="text-xs text-muted-foreground mt-1">of 100</p>
                          </div>
                          <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass text-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Confidence</p>
                            <p className="text-5xl font-black font-heading">{Math.round(scanMutation.data.cri.overall_confidence * 100)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">signal quality</p>
                          </div>
                          <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass text-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Action</p>
                            <p className={`text-lg font-black font-heading ${
                              scanMutation.data.cri.recommended_action === 'IMMEDIATE_ESCALATION' ? 'text-red-500' :
                              scanMutation.data.cri.recommended_action === 'MANUAL_REVIEW' ? 'text-orange-500' :
                              scanMutation.data.cri.recommended_action === 'ENHANCED_MONITORING' ? 'text-yellow-500' : 'text-green-500'
                            }`}>{scanMutation.data.cri.recommended_action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground mt-1">recommended</p>
                          </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass space-y-4">
                          <h4 className="font-extrabold font-heading text-lg">Score Breakdown</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Rule Engine</p>
                              <p className="text-2xl font-black font-heading">{scanMutation.data.cri.scoring.rule_engine_score}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">AI Vectors</p>
                              <p className="text-2xl font-black font-heading text-primary">+{scanMutation.data.cri.scoring.vector_addition}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Multiplier</p>
                              <p className="text-2xl font-black font-heading">×{scanMutation.data.cri.scoring.correlation_multiplier}</p>
                            </div>
                          </div>
                          {scanMutation.data.cri.scoring.triggered_categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                              {scanMutation.data.cri.scoring.triggered_categories.map(cat => (
                                <span key={cat} className="px-3 py-1 rounded-full bg-muted text-xs font-bold uppercase tracking-widest">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Explanation */}
                        <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass space-y-3">
                          <h4 className="font-extrabold font-heading text-lg">Analysis</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            {scanMutation.data.cri.explanation}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest pt-2">
                            Provider: {scanMutation.data.cri.provider_used}
                          </p>
                        </div>

                        {/* Rules Fired */}
                        {scanMutation.data.cri.rules_fired.length > 0 && (
                          <div className="p-6 rounded-3xl border border-border/50 bg-card/50 glass space-y-4">
                            <h4 className="font-extrabold font-heading text-lg">Vectors Triggered</h4>
                            <div className="space-y-3">
                              {scanMutation.data.cri.rules_fired.map((rule, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
                                  <div className="shrink-0 h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-black text-xs">
                                    {rule.score}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm">{rule.rule_name}</span>
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted tracking-widest">{rule.category}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 font-mono">{rule.evidence}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Compliance Notes */}
                        {scanMutation.data.cri.compliance_notes && (
                          <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 space-y-2">
                            <h4 className="font-extrabold font-heading text-lg text-red-500">⚠ Compliance Alert</h4>
                            <p className="text-sm text-muted-foreground font-medium">{scanMutation.data.cri.compliance_notes}</p>
                          </div>
                        )}

                        {/* Low Score Audit */}
                        {scanMutation.data.cri.low_score_audit && (
                          <div className="p-6 rounded-3xl border border-primary/20 bg-primary/5 space-y-2">
                            <h4 className="font-extrabold font-heading text-lg text-primary">✓ Clean Wallet Audit</h4>
                            <p className="text-sm text-muted-foreground font-medium">{scanMutation.data.cri.low_score_audit}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-12 rounded-3xl border-2 border-dashed border-muted flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Zap className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold">Intelligence Unavailable</h3>
                        <p className="text-muted-foreground max-w-md">
                          No LLM providers are configured. Add a NVIDIA NIM, OpenRouter, or Groq API key to enable AI-powered risk analysis.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="counterparties">
                    <CounterpartyTable counterparties={scanMutation.data.counterparties} />
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
