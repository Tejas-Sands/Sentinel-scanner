"use client"

import { useMemo } from "react"
import { ScanResponse } from "@/lib/types"
import { TIER_COLORS } from "@/lib/display"

interface RiskGaugeProps {
  score: number
  tier: ScanResponse["risk_tier"]
}

export function RiskGauge({ score, tier }: RiskGaugeProps) {
  const colorClass = TIER_COLORS[tier]
  
  const color = useMemo(() => {
    switch (tier) {
      case "CRITICAL": return "#ef4444" 
      case "HIGH": return "#f97316" 
      case "MEDIUM": return "#eab308" 
      case "LOW": return "#22c55e" 
      default: return "#22c55e"
    }
  }, [tier])

  const size = 220
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  
  const dashArray = radius * Math.PI
  const dashOffset = dashArray - (dashArray * score) / 100

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <svg 
        width={size} 
        height={size / 2 + 20} 
        viewBox={`0 0 ${size} ${size / 2 + 10}`}
        className="overflow-visible drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth/2 + 5} ${size/2} A ${radius-5} ${radius-5} 0 0 1 ${size - strokeWidth/2 - 5} ${size/2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-muted/30"
        />
        
        {/* Colored Fill Arc */}
        <path
          d={`M ${strokeWidth/2 + 5} ${size/2} A ${radius-5} ${radius-5} 0 0 1 ${size - strokeWidth/2 - 5} ${size/2}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
        <span className={`text-6xl font-black font-heading tracking-tighter ${colorClass} drop-shadow-sm`}>
          {score}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
          Threat Index
        </span>
      </div>
    </div>
  )
}
