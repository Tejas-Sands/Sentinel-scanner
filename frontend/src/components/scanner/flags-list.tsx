import { Flag } from "@/lib/types"
import { 
  AlertCircle, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck,
  Info
} from "lucide-react"
import { motion } from "framer-motion"

interface FlagsListProps {
  flags: Flag[]
}

export function FlagsList({ flags }: FlagsListProps) {
  if (!flags || flags.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-primary/20 rounded-[2rem] bg-primary/5"
      >
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h4 className="text-xl font-bold font-heading">Clean Address</h4>
        <p className="text-muted-foreground max-w-xs mt-1">No known risk factors or sanctions hits found for this wallet.</p>
      </motion.div>
    )
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return <ShieldAlert className="h-6 w-6" />
      case "HIGH": return <AlertTriangle className="h-6 w-6" />
      case "MEDIUM": return <AlertCircle className="h-6 w-6" />
      default: return <Info className="h-6 w-6" />
    }
  }

  const getStyles = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
      case "HIGH": return "bg-orange-500/10 border-orange-500/20 text-orange-500"
      case "MEDIUM": return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
      default: return "bg-blue-500/10 border-blue-500/20 text-blue-500"
    }
  }

  return (
    <div className="space-y-4">
      {flags.map((flag, idx) => (
        <motion.div 
          key={`${flag.id}-${idx}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`p-6 rounded-[1.5rem] border flex flex-col sm:flex-row gap-5 ${getStyles(flag.severity)} group hover:scale-[1.01] transition-transform duration-300`}
        >
          <div className="shrink-0 flex items-start">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-current bg-opacity-10`}>
              {getIcon(flag.severity)}
            </div>
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="font-extrabold text-lg font-heading tracking-tight text-foreground">{flag.name}</h4>
              <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-current bg-opacity-10 tracking-widest">
                {flag.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {flag.description}
            </p>
            
            {flag.evidence && Object.keys(flag.evidence).length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl bg-black/20 border border-white/5 p-4 group-hover:bg-black/30 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  Evidence Data
                </p>
                <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                  {Object.entries(flag.evidence).map(([key, value]) => (
                    <div key={key} className="flex flex-col md:flex-row md:gap-2 mb-1">
                      <span className="text-foreground/70 font-bold min-w-[120px]">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-foreground/50">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
