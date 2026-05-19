"use client"

import React from "react"

const TRUST_ITEMS = [
  { name: "Alchemy", desc: "RPC Provider" },
  { name: "OFAC SDN", desc: "US Treasury" },
  { name: "GoPlus Security", desc: "API Endpoint" },
  { name: "Forta Network", desc: "Threat Intel" },
  { name: "Etherscan", desc: "Explorer Data" },
  { name: "CoinGecko", desc: "Oracle Pricing" },
  { name: "ENS Names", desc: "Resolution" },
  { name: "MEW Darklist", desc: "Scam DB" },
]

export function TrustStrip() {
  // Duplicate list to ensure continuous wrap-around visual marquee
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS, ...TRUST_ITEMS]

  return (
    <section className="relative py-12 border-y border-white/[0.04] bg-void overflow-hidden">
      {/* 1. MASKED EDGES (LINEAR GRADIENT MASK FOR SMOOTH BLENDING) */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-void via-transparent to-void" />

      <div className="max-w-7xl mx-auto px-6 relative z-0">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-8">
          Aggregating intelligence from industry-leading sources
        </p>
        
        {/* 2. INFINITE SCROLLING CONTAINER */}
        <div className="flex overflow-hidden w-full select-none">
          <div className="flex gap-4 shrink-0 min-w-full animate-marquee hover:[animation-play-state:paused] cursor-default">
            {items.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl border border-white/[0.04] bg-liquid-800/40 backdrop-blur-md hover:border-white/[0.08] hover:bg-liquid-700/60 transition-all duration-300 group"
              >
                <span className="text-sm font-bold text-white/25 group-hover:text-white/60 transition-colors duration-300">
                  {item.name}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/10 group-hover:bg-accent/40 transition-colors" />
                <span className="text-[10px] font-semibold text-white/15 group-hover:text-white/35 transition-colors duration-300 uppercase tracking-wider">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tailwind inline animation style override to guarantee standard marquee keyframe */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  )
}
