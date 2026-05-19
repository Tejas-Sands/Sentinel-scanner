"use client"

import { useState, useEffect } from "react"
import { motion, useSpring, useTransform } from "framer-motion"

function AnimatedNumber({ value }: { value: string }) {
  const numValue = parseInt(value.replace(/[^0-9]/g, ""))
  const hasString = value.match(/[^0-9]/)
  const animatedValue = useSpring(0, { bounce: 0, duration: 1500 })
  const displayValue = useTransform(animatedValue, (latest) => Math.round(latest).toString() + (hasString ? value.replace(/[0-9]/g, "") : ""))
  
  useEffect(() => {
    if (!isNaN(numValue)) {
      animatedValue.set(numValue)
    }
  }, [numValue, animatedValue])

  if (isNaN(numValue)) return <>{value}</>
  return <motion.span>{displayValue}</motion.span>
}
import { 
  BarChart3, 
  History, 
  ShieldCheck, 
  CreditCard, 
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Lock,
  ArrowRight,
  Loader2,
  FileCheck,
  Network,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
// Progress bar rendered manually with liquid styling
import { Badge } from "@/components/ui/badge"
import { LiquidCard } from "@/components/ui/liquid-card"
import Link from "next/link"
import { api } from "@/lib/api"
import { User } from "@/lib/types"
import { LoginDialog } from "@/components/auth/login-dialog"

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scans, setScans] = useState<Record<string, any>[]>([])
  const [totalScans, setTotalScans] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("sentinel_token")
    if (token) {
      Promise.all([api.getMe(), api.getUserScans(10, 0)])
        .then(([userData, scanData]) => {
          setUser(userData)
          setScans(scanData.scans || [])
          setTotalScans(scanData.total || 0)
        })
        .catch((err) => {
          console.error("Dashboard data fetch error:", err)
          localStorage.removeItem("sentinel_token")
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  // Calculate statistics from real data
  const criticalCount = scans.filter(s => s.risk_tier === "CRITICAL").length
  const highCount = scans.filter(s => s.risk_tier === "HIGH").length
  const totalFlags = criticalCount + highCount
  const cleanCount = scans.filter(s => s.risk_tier === "LOW").length

  const stats = user ? [
    { label: "Scan Volume", value: totalScans.toString(), icon: <BarChart3 className="h-5 w-5 text-accent" />, color: "accent" as const, trend: "+12%" },
    { label: "Critical Flags", value: totalFlags.toString(), icon: <AlertTriangle className="h-5 w-5 text-red-400" />, color: "danger" as const, trend: "RED" },
    { label: "Clean Passes", value: cleanCount.toString(), icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />, color: "accent" as const, trend: "CLEAN" },
    { label: "Month Reset", value: `${user.scans_limit - user.scans_used_this_month} Left`, icon: <CreditCard className="h-5 w-5 text-white/55" />, color: "default" as const, trend: "RESET" },
  ] : []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-void">
        <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
        <p className="text-white/50 text-xs uppercase tracking-widest font-mono">Synthesizing workspace logs...</p>
      </div>
    )
  }

  // --- 1. UNAUTHENTICATED / EMPTY STATE ---
  if (!user) {
    return (
      <div className="relative min-h-[calc(100vh-5rem)] py-16 px-6 overflow-hidden flex flex-col justify-center bg-void" data-page="dashboard">
        {/* Background breathing orb decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] bg-accent/[0.03] blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative">
          
          {/* Left: Value Proposition */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800 border border-white/[0.06] text-white/55 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md">
              <Lock className="h-3.5 w-3.5 text-accent/60" />
              Secure Compliance Environment
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-light tracking-[-0.03em] leading-tight text-white">
              Unlock Your Monastic
              <br />
              <span className="bg-gradient-to-r from-[#00e5a0] to-emerald-400 bg-clip-text text-transparent text-glow-accent">
                Compliance Control Room.
              </span>
            </h1>

            <p className="text-white/55 text-base sm:text-lg leading-relaxed font-normal text-wrap-pretty max-w-xl">
              Sentinel accounts provide cryptographic audit vaults, real-time counters, 
              watermark signature generation, and enterprise scan allocations.
            </p>

            {/* Why Register Grid - styled under Liquid Noir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              {[
                {
                  icon: <History className="h-5 w-5 text-accent/60" />,
                  title: "Persistent Scan History",
                  desc: "Keep a permanent encrypted audit log of all screened addresses. Share links securely."
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-accent/60" />,
                  title: "Expanded Threshold Limits",
                  desc: "Scale capacity limits up to 500 scans/month. Avoid strict public reset caps."
                },
                {
                  icon: <FileCheck className="h-5 w-5 text-accent/60" />,
                  title: "Audit-Ready Evidence",
                  desc: "Download official PDF reports stamped with verifiable compliance keys."
                },
                {
                  icon: <Network className="h-5 w-5 text-accent/60" />,
                  title: "Proximity Forensics",
                  desc: "In-depth analytics on interaction hops, Tornado routers, and sanctioned targets."
                }
              ].map((item, index) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-4 p-5 rounded-xl border border-white/[0.04] bg-liquid-800/40 backdrop-blur-md"
                >
                  <div className="shrink-0 p-2.5 rounded-xl bg-void border border-white/[0.04] h-10 w-10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white/90 text-sm font-heading">{item.title}</h3>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: PREMIUM BLURRED PREVIEW OVERLAY */}
          <div className="lg:col-span-5 relative group">
            
            {/* Shimmering border glow container */}
            <div className="absolute -inset-px rounded-[24px] bg-gradient-to-r from-accent/20 to-accent/5 blur-sm opacity-35" />
            
            <div className="relative rounded-[24px] border border-white/[0.06] overflow-hidden shadow-2xl bg-gradient-to-br from-liquid-800/90 to-liquid-900/95 backdrop-blur-[40px] saturate-[140%] p-8 flex flex-col items-center justify-center min-h-[440px]">
              
              {/* Shimmer Effect overlay */}
              <div 
                className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none"
                style={{
                  content: '""',
                  animation: "shimmer 3s infinite",
                  backgroundSize: "200% 100%",
                }}
              />

              {/* Blur Mock Control Room Background */}
              <div className="absolute inset-0 z-0 opacity-10 filter blur-[8px] pointer-events-none scale-105 p-6 space-y-6 select-none">
                <div className="h-6 w-32 bg-white rounded mb-8" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-white rounded-xl" />
                  <div className="h-20 bg-white rounded-xl" />
                </div>
                <div className="h-32 bg-white rounded-xl" />
              </div>

              {/* Authenticate panel */}
              <div className="relative z-10 text-center space-y-6 max-w-sm px-4">
                <div className="h-14 w-14 rounded-xl bg-void border border-white/[0.06] flex items-center justify-center mx-auto shadow-md">
                  <Lock className="h-6 w-6 text-accent text-glow-accent" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-heading text-white">Workspace Closed</h2>
                  <p className="text-xs text-white/50 leading-relaxed font-normal">
                    Please log in or register a cryptographic identity key to inspect dynamic metrics.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    className="w-full h-11 font-semibold rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.3)] transition-all group"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Authenticate Credentials
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform text-[#020202]" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-11 font-semibold rounded-lg"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Create Free Workspace
                  </Button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Auth Dialog */}
        <LoginDialog 
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSuccess={() => {
            setIsLoginOpen(false)
            window.location.reload()
          }}
        />

        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    )
  }

  // --- 2. AUTHENTICATED STATE (REAL USER DATA) ---
  return (
    <div className="py-16 px-6 max-w-7xl mx-auto space-y-12 bg-void" data-page="dashboard">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.02em] leading-tight text-white font-heading">
            Compliance Dashboard
          </h1>
          <p className="text-white/55 text-sm font-semibold mt-1">
            Active Workspace: <span className="text-white/80 font-mono tracking-wider">{user.email}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/scan">
            <Button className="rounded-lg font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.3)] transition-all">
              <History className="mr-2 h-4 w-4 text-[#020202]" />
              Screen Address
            </Button>
          </Link>
          <Button variant="outline" className="rounded-lg font-semibold" onClick={() => api.logout()}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Grid using LiquidCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
          >
            <LiquidCard 
              variant={stat.color === "accent" ? "accent" : "default"}
              className="p-6 cursor-default border-white/[0.04] bg-liquid-800/40 hover:border-white/[0.08]"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-void border border-white/[0.04] flex items-center justify-center">
                  {stat.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-white/35 uppercase tracking-widest">{stat.label}</p>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                      stat.trend === "RED" ? "bg-red-500/10 text-red-400" :
                      stat.trend === "CLEAN" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                    }`}>
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-2xl font-black font-heading mt-1 font-mono tracking-tight text-white/90 tabular-nums">
                    <AnimatedNumber value={stat.value} />
                  </p>
                </div>
              </div>
            </LiquidCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Scans (Table) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-heading text-white">Recent Compliance screening</h2>
            <Link href="/scan" className="text-xs font-bold text-accent hover:underline flex items-center tracking-wider uppercase">
              Screen Target <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          
          <div className="rounded-[16px] border border-white/[0.06] overflow-hidden bg-gradient-to-br from-liquid-800/85 to-liquid-900/95 shadow-card">
            {scans.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {scans.map((scan) => (
                  <div key={scan.scan_id} className={`relative p-6 border-b border-white/[0.04] last:border-0 transition-all flex items-center justify-between group overflow-hidden ${
                    scan.risk_tier === 'CRITICAL' || scan.risk_tier === 'HIGH' ? 'row-bleed-red' : 
                    scan.risk_tier === 'MEDIUM' ? 'hover:bg-white/[0.02]' : 'row-bleed-emerald'
                  }`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        scan.risk_tier === 'CRITICAL' || scan.risk_tier === 'HIGH' ? 'bg-red-500/5 border-red-500/20 text-red-400' : 
                        scan.risk_tier === 'MEDIUM' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' : 'bg-emerald-500/5 border-emerald-500/20 text-accent'
                      }`}>
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold truncate max-w-[160px] md:max-w-md text-white/90 tracking-wider">{scan.address}</p>
                        <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider mt-0.5">
                          {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : "Just now"} · {scan.chain.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block overflow-hidden relative">
                        <p className={`text-sm font-black font-mono transition-transform duration-300 group-hover:-translate-y-8 ${
                          scan.risk_score > 70 ? 'text-red-400' : scan.risk_score > 30 ? 'text-yellow-400' : 'text-[#00e5a0]'
                        }`}>{scan.risk_score}/100</p>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/25 mt-0.5 transition-transform duration-300 group-hover:-translate-y-8">{scan.risk_tier} RISK</p>
                        
                        <div className="absolute inset-0 flex items-center justify-end translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-xs font-bold text-white whitespace-nowrap">View Report →</span>
                        </div>
                      </div>
                      <Link href={`/report/${scan.scan_id}`} className="p-2.5 rounded-lg bg-void border border-white/[0.04] hover:bg-accent hover:border-transparent group-hover:text-[#020202] transition-all">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center space-y-4">
                <div className="h-14 w-14 rounded-xl bg-void border border-white/[0.04] flex items-center justify-center mx-auto shadow-md">
                  <BarChart3 className="h-6 w-6 text-white/20" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white/90 text-base">No scans recorded</h3>
                  <p className="text-xs text-white/40 max-w-xs mx-auto">
                    Addresses you screen in Sentinel will compile inside this log for auditable tracing.
                  </p>
                </div>
                <Link href="/scan" className="inline-block pt-2">
                  <Button className="rounded-lg font-semibold">
                    Execute First Scan
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Account Capacity & Usage (ProgressBar) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold font-heading text-white">Capacity & Reset</h2>
          <div className="p-8 rounded-[16px] border border-white/[0.06] bg-gradient-to-br from-liquid-800/85 to-liquid-900/95 shadow-card space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-white/35 uppercase tracking-widest mb-1.5">Monthly Scan Count</p>
                  <p className="text-3xl font-black font-heading text-white font-mono tracking-tight">{user.scans_used_this_month} / {user.scans_limit}</p>
                </div>
                <Badge className="bg-[#00e5a0] text-[#020202] font-black text-[10px] uppercase tracking-wider rounded-md border-none px-2.5 py-1 select-none">
                  {user.tier}
                </Badge>
              </div>
              
              {/* ProgressBar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#00e5a0] shadow-[0_0_10px_rgba(0,229,160,0.4)]"
                  style={{
                    width: `${Math.min((user.scans_used_this_month / user.scans_limit) * 100, 100)}%`
                  }}
                />
              </div>

              <p className="text-xs text-white/50 font-semibold flex items-center">
                <TrendingUp className="h-3.5 w-3.5 mr-1 text-[#00e5a0] animate-pulse" />
                {Math.round((user.scans_used_this_month / user.scans_limit) * 100)}% of monthly capacity utilized
              </p>
            </div>

            <div className="pt-6 border-t border-white/[0.04] space-y-4">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-white/35">Sentinel Compliance Privileges</h3>
              <ul className="space-y-3">
                {[
                  "Advanced composite risk grading",
                  "Direct Mixer and OFAC sanction checks",
                  "Watermarked audit-evidence PDF reports",
                  user.tier !== "free" ? "Access to developer API endpoints" : "Basic workspace support"
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-white/50 font-semibold">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0 shadow-[0_0_6px_#00e5a0]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              {user.tier === "free" && (
                <Link href="/pricing" className="w-full block">
                  <Button variant="outline" className="w-full rounded-lg font-semibold mt-4 h-11 border-white/[0.06] hover:bg-liquid-800">
                    Upgrade to Premium
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
