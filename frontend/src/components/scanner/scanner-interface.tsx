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
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Monastic Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-4 mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800 border border-white/[0.06] text-white/50 text-xs font-semibold tracking-[0.2em] uppercase backdrop-blur-md">
          <Zap className="h-3 w-3 text-accent fill-current text-glow-accent" />
          Monastic Screening Room
        </div>
        <h1 className="text-4xl sm:text-5xl font-light tracking-[-0.02em] leading-tight text-white">
          On-Chain Forensic
          <br />
          <span className="bg-gradient-to-r from-[#00e5a0] to-emerald-400 bg-clip-text text-transparent text-glow-accent">
            Compliance.
          </span>
        </h1>
      </motion.div>

      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto mb-16"
      >
        <form onSubmit={handleScan} className="relative group">
          {/* Subtle accent glow border on focus/hover */}
          <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-accent/20 to-accent/5 blur-sm opacity-30 group-hover:opacity-50 transition duration-500" />
          
          <div className="relative flex flex-col sm:flex-row items-center gap-3 bg-liquid-800/80 border border-white/[0.06] p-2 rounded-xl shadow-2xl backdrop-blur-xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Paste target address (0x...)"
                className="w-full pl-12 h-12 text-base border-none bg-transparent focus-visible:ring-0 focus-visible:shadow-none font-mono placeholder:text-white/20 text-white/90"
                disabled={scanMutation.isPending}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full sm:w-auto h-12 px-8 font-semibold rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.3)] transition-all"
              disabled={scanMutation.isPending || !address}
            >
              {scanMutation.isPending ? "Screening Address..." : "Scan Wallet"}
            </Button>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-8 left-4 flex items-center text-red-400 text-xs font-semibold"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* 1. VISCOUS SCAN LOADING COMPLIANCE PROGRESS BAR & terminal blinking caret */}
        <AnimatePresence>
          {scanMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-10 max-w-md mx-auto space-y-4"
            >
              {/* ProgressBar Track & Fill */}
              <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#00e5a0] shadow-[0_0_10px_rgba(0,229,160,0.4)]"
                  style={{
                    width: `${((loadingMessageIndex + 1) / LOADING_MESSAGES.length) * 100}%`,
                    transition: "width 0.8s cubic-bezier(0.65, 0, 0.35, 1)"
                  }}
                />
              </div>

              {/* Status and blinking caret terminal indicator */}
              <div className="font-mono text-xs text-white/35 flex items-center justify-center tracking-wider uppercase">
                <span>{LOADING_MESSAGES[loadingMessageIndex]}</span>
                <span className="inline-block w-1.5 h-3.5 bg-accent/80 ml-1.5 animate-[blink_1s_infinite]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {scanMutation.data && (
          <motion.div 
            key={scanMutation.data.scan_id}
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12"
          >
            <Card className="bg-gradient-to-br from-liquid-800/80 to-liquid-900/90 backdrop-blur-[20px] saturate-[140%] border border-white/[0.06] overflow-hidden shadow-2xl rounded-[20px]">
              
              {/* Premium Header */}
              <div className="p-8 md:p-10 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <h2 className="text-2xl font-extrabold font-heading text-white">Scan Audited</h2>
                      <Badge className={`${TIER_BG_COLORS[scanMutation.data.risk_tier]} text-white px-4 py-1 text-xs font-bold border-none shadow-lg rounded-full`}>
                        {scanMutation.data.risk_tier} RISK
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/35 uppercase tracking-widest">Target Account</p>
                      <p className="font-mono text-white/80 text-sm md:text-base break-all select-all tracking-wider">
                        {scanMutation.data.address}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <Button 
                        variant="secondary" 
                        className="rounded-lg font-semibold border-white/[0.04]"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + "/report/" + scanMutation.data!.scan_id)
                          alert("Evidence link copied to clipboard!")
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4 text-white/60" />
                        Copy Link
                      </Button>
                      <Button 
                        className="rounded-lg font-semibold shadow-xl shadow-accent/15"
                        onClick={handleDownload} 
                        disabled={reportMutation.isPending}
                      >
                        {reportMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#020202]" />
                        ) : (
                          <Download className="mr-2 h-4 w-4 text-[#020202]" />
                        )}
                        Download PDF Audit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="shrink-0 scale-100 md:scale-105">
                    <RiskGauge score={scanMutation.data.risk_score} tier={scanMutation.data.risk_tier} />
                  </div>
                </div>
              </div>

              {/* Content Tabs */}
              <div className="p-8 md:p-10 bg-void/25">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="h-12 bg-void border border-white/[0.04] p-1 rounded-xl mb-10 w-full max-w-md mx-auto grid grid-cols-4">
                    <TabsTrigger value="overview" className="rounded-lg font-bold text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="flags" className="rounded-lg font-bold text-xs">
                      Flags
                      {scanMutation.data.flags.length > 0 && (
                        <span className="ml-1 bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                          {scanMutation.data.flags.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="rounded-lg font-bold text-xs">
                      AI Analysis
                    </TabsTrigger>
                    <TabsTrigger value="counterparties" className="rounded-lg font-bold text-xs">Network</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-12 outline-none">
                    <div className="grid gap-8">
                      <StatsRow summary={scanMutation.data.summary} />
                      
                      {scanMutation.data.flags.some(f => f.severity === "CRITICAL" || f.severity === "HIGH") ? (
                        <div className="space-y-6">
                          <h3 className="text-xl font-bold flex items-center gap-2.5 text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            Critical Flags Matrix
                          </h3>
                          <FlagsList flags={scanMutation.data.flags.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH")} />
                        </div>
                      ) : (
                        <div className="p-8 rounded-2xl border border-accent/20 bg-accent/5 flex flex-col items-center text-center space-y-4">
                          <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/20">
                            <ShieldCheck className="h-6 w-6 text-accent" />
                          </div>
                          <h3 className="text-lg font-bold text-white">No Critical Threats</h3>
                          <p className="text-xs sm:text-sm text-white/55 max-w-sm">
                            Target wallet does not exhibit direct OFAC sanctions or mixer hops.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="flags" className="outline-none">
                    <FlagsList flags={scanMutation.data.flags} />
                  </TabsContent>
                  
                  <TabsContent value="intelligence" className="outline-none">
                    {scanMutation.data.cri ? (
                      <div className="space-y-8">
                        {/* CRI Score Header */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-6 rounded-2xl border border-white/[0.04] bg-liquid-800/40 text-center">
                            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">CRI Score</p>
                            <p className={`text-4xl font-black font-heading ${
                              scanMutation.data.cri.scoring.final_cri_score >= 75 ? 'text-red-400' :
                              scanMutation.data.cri.scoring.final_cri_score >= 50 ? 'text-orange-400' :
                              scanMutation.data.cri.scoring.final_cri_score >= 25 ? 'text-yellow-400' : 'text-[#00e5a0]'
                            }`}>{scanMutation.data.cri.scoring.final_cri_score}</p>
                            <p className="text-[10px] text-white/20 mt-1 font-semibold">OF 100</p>
                          </div>
                          <div className="p-6 rounded-2xl border border-white/[0.04] bg-liquid-800/40 text-center">
                            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">Confidence</p>
                            <p className="text-4xl font-black font-heading text-white/90">{Math.round(scanMutation.data.cri.overall_confidence * 100)}%</p>
                            <p className="text-[10px] text-white/20 mt-1 font-semibold">SIGNAL STRENGTH</p>
                          </div>
                          <div className="p-6 rounded-2xl border border-white/[0.04] bg-liquid-800/40 text-center">
                            <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-2">Action Vector</p>
                            <p className={`text-sm font-black uppercase tracking-wider ${
                              scanMutation.data.cri.recommended_action === 'IMMEDIATE_ESCALATION' ? 'text-red-400' :
                              scanMutation.data.cri.recommended_action === 'MANUAL_REVIEW' ? 'text-orange-400' :
                              scanMutation.data.cri.recommended_action === 'ENHANCED_MONITORING' ? 'text-yellow-400' : 'text-[#00e5a0]'
                            }`}>{scanMutation.data.cri.recommended_action.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-white/20 mt-1.5 font-semibold">RECOMMENDED</p>
                          </div>
                        </div>

                        {/* Explanation */}
                        <div className="p-6 rounded-2xl border border-white/[0.04] bg-liquid-800/40 space-y-3">
                          <h4 className="font-extrabold text-white/90 text-base font-heading">AI Forensic Narrative</h4>
                          <p className="text-xs sm:text-sm text-white/55 leading-relaxed font-normal text-wrap-pretty">
                            {scanMutation.data.cri.explanation}
                          </p>
                          <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest pt-2">
                            Audit Engine: {scanMutation.data.cri.provider_used}
                          </p>
                        </div>

                        {/* Rules Fired */}
                        {scanMutation.data.cri.rules_fired.length > 0 && (
                          <div className="p-6 rounded-2xl border border-white/[0.04] bg-liquid-800/40 space-y-4">
                            <h4 className="font-extrabold text-white/90 text-base font-heading">Risk Vectors Triggered</h4>
                            <div className="space-y-3">
                              {scanMutation.data.cri.rules_fired.map((rule, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-void/50 border border-white/[0.04]">
                                  <div className="shrink-0 h-9 w-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                                    +{rule.score}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-white/90">{rule.rule_name}</span>
                                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-liquid-800 text-white/35">{rule.category}</span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 font-mono">{rule.evidence}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-12 rounded-2xl border border-dashed border-white/10 flex flex-col items-center text-center space-y-4 bg-void/35">
                        <div className="h-12 w-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
                          <Zap className="h-6 w-6 text-white/35" />
                        </div>
                        <h3 className="text-lg font-bold text-white/80">AI Reasoning Unavailable</h3>
                        <p className="text-xs sm:text-sm text-white/40 max-w-sm">
                          Configure a NVIDIA NIM or OpenRouter provider API key in your server environment to populate intelligence.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="counterparties" className="outline-none">
                    <CounterpartyTable counterparties={scanMutation.data.counterparties} />
                  </TabsContent>
                </Tabs>
              </div>

            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal caret blinking CSS definition */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>

    </div>
  )
}
