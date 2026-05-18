import { ScanResponse } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/display"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Activity, 
  Calendar, 
  Maximize2
} from "lucide-react"

export function StatsRow({ summary }: { summary: ScanResponse["summary"] }) {
  const stats = [
    { label: "Transactions", value: summary.tx_count, icon: <Activity className="h-4 w-4 text-blue-500" /> },
    { label: "First Seen", value: formatDate(summary.first_seen), icon: <Calendar className="h-4 w-4 text-purple-500" /> },
    { label: "Last Seen", value: formatDate(summary.last_seen), icon: <Calendar className="h-4 w-4 text-indigo-500" /> },
    { label: "Total Inflow", value: formatCurrency(summary.total_inflow_usd), icon: <ArrowDownLeft className="h-4 w-4 text-green-500" /> },
    { label: "Total Outflow", value: formatCurrency(summary.total_outflow_usd), icon: <ArrowUpRight className="h-4 w-4 text-red-500" /> },
    { label: "Largest Tx", value: formatCurrency(summary.largest_tx_usd), icon: <Maximize2 className="h-4 w-4 text-orange-500" /> },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="p-6 rounded-3xl border border-border/50 bg-card/50 glass hover:scale-[1.03] transition-transform duration-300 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              {stat.icon}
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {stat.label}
            </p>
          </div>
          <p className="text-2xl font-black font-heading truncate">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}
