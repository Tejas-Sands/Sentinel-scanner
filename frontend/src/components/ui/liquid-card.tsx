"use client"

import React, { useRef } from "react"
import { cn } from "@/lib/utils"

interface LiquidCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "accent"
  className?: string
}

export function LiquidCard({
  children,
  variant = "default",
  className,
  ...props
}: LiquidCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty("--mouse-x", `${x}px`)
    cardRef.current.style.setProperty("--mouse-y", `${y}px`)
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={cn(
        "group relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-gradient-to-br from-liquid-800/85 to-liquid-900/95 backdrop-blur-[20px] saturate-[140%] p-8 transition-all duration-500 shadow-card hover:shadow-card-hover hover:-translate-y-1 select-none",
        className
      )}
      {...props}
    >
      {/* Dynamic mouse-tracking border glow overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          variant === "accent" ? "liquid-card-accent-glow" : "liquid-card-glow"
        )}
        style={{
          content: '""',
        }}
      />
      
      {/* Top inset light glow border */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.03] z-10 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
