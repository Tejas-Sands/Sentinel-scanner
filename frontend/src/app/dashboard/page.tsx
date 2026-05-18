"use client"

import { motion } from "framer-motion"
import { 
  BarChart3, 
  History, 
  ShieldCheck, 
  CreditCard, 
  Settings, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function DashboardPage() {
  // Mock data for the dashboard
  const stats = [
    { label: "Total Scans", value: "128", icon: <BarChart3 className="h-5 w-5" />, color: "bg-blue-500" },
    { label: "High Risk Flags", value: "14", icon: <AlertTriangle className="h-5 w-5" />, color: "bg-red-500" },
    { label: "Clean Wallets", value: "114", icon: <ShieldCheck className="h-5 w-5" />, color: "bg-green-500" },
    { label: "Account Tier", value: "Pro", icon: <CreditCard className="h-5 w-5" />, color: "bg-primary" },
  ]

  const recentScans = [
    { id: "1", address: "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF", date: "2 mins ago", score: 100, tier: "CRITICAL" },
    { id: "2", address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE", date: "1 hour ago", score: 12, tier: "LOW" },
    { id: "3", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", date: "3 hours ago", score: 0, tier: "LOW" },
    { id: "4", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", date: "Yesterday", score: 45, tier: "MEDIUM" },
  ]

  return (
    <div className="py-12 px-4 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold font-heading tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground font-medium mt-1">Welcome back, Compliance Officer.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-border/50">
            <History className="mr-2 h-4 w-4" />
            Full History
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => ( stat.label &&
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <Card className="p-6 rounded-[2rem] border-border/50 glass hover:scale-[1.02] transition-transform duration-300">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                  <div className={`text-${stat.color.split('-')[1]}-500`}>{stat.icon}</div>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black font-heading mt-1">{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Scans */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold font-heading">Recent Activity</h2>
            <Link href="/" className="text-sm font-bold text-primary hover:underline flex items-center">
              New Scan <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <Card className="rounded-[2.5rem] border-border/50 overflow-hidden glass">
            <div className="divide-y divide-border/50">
              {recentScans.map((scan) => (
                <div key={scan.id} className="p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      scan.tier === 'CRITICAL' ? 'bg-red-500/10 text-red-500' : 
                      scan.tier === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold truncate max-w-[200px] md:max-w-md">{scan.address}</p>
                      <p className="text-xs text-muted-foreground font-medium">{scan.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className={`text-sm font-black ${
                        scan.score > 70 ? 'text-red-500' : scan.score > 30 ? 'text-yellow-500' : 'text-green-500'
                      }`}>{scan.score}/100</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{scan.tier}</p>
                    </div>
                    <Link href={`/report/${scan.id}`} className="p-2 rounded-lg bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Account & Usage */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold font-heading">Usage Limits</h2>
          <Card className="p-8 rounded-[2.5rem] border-border/50 glass space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Scans</p>
                  <p className="text-3xl font-black font-heading">128 / 500</p>
                </div>
                <Badge className="bg-primary text-primary-foreground font-bold rounded-lg mb-1">PRO PLAN</Badge>
              </div>
              <Progress value={25} className="h-3 rounded-full" />
              <p className="text-xs text-muted-foreground font-medium flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-primary" />
                25.6% of monthly limit used
              </p>
            </div>

            <div className="pt-8 border-t border-border/50 space-y-4">
              <h3 className="font-bold">Plan Benefits</h3>
              <ul className="space-y-3">
                {['Advanced risk scoring', 'API Access', 'Batch processing'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="w-full block">
                <Button variant="secondary" className="w-full rounded-xl font-bold mt-4">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
