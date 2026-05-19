"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Shield, Radar, Brain, Database, FileText, Globe } from "lucide-react"
import { LiquidCard } from "@/components/ui/liquid-card"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  {
    icon: <Shield className="h-5 w-5 text-red-400" />,
    title: "OFAC Sanctions Screening",
    description: "Every wallet is cross-referenced against the US Treasury's OFAC SDN list in real-time. Instantly flag sanctioned entities.",
    variant: "default" as const,
  },
  {
    icon: <Radar className="h-5 w-5 text-orange-400" />,
    title: "Mixer & Tornado Detection",
    description: "Identifies direct and indirect interactions with coin mixers, including Tornado Cash router, proxy, and denomination contracts.",
    variant: "default" as const,
  },
  {
    icon: <Brain className="h-5 w-5 text-[#00e5a0]" />,
    title: "AI-Powered Risk Intelligence",
    description: "Our CRI engine uses NVIDIA NIM and OpenRouter models to synthesize raw transaction data into detailed forensic explanations.",
    variant: "accent" as const, // Accent color glow
  },
  {
    icon: <Database className="h-5 w-5 text-blue-400" />,
    title: "Multi-Source Threat Data",
    description: "Aggregates from 10+ sources: GoPlus Security, Forta Network, MEW Darklist, stablecoin blacklists, and ENS profiling.",
    variant: "default" as const,
  },
  {
    icon: <FileText className="h-5 w-5 text-emerald-400" />,
    title: "Downloadable PDF Reports",
    description: "Generate audit-ready PDF compliance reports with risk scores, flag breakdowns, and AI analysis narratives.",
    variant: "accent" as const, // Accent color glow
  },
  {
    icon: <Globe className="h-5 w-5 text-teal-400" />,
    title: "Real-Time ENS Resolution",
    description: "Automatically resolves human-readable .eth names, providing identity context for counterparty transactions.",
    variant: "default" as const,
  },
]

export function FeaturesGrid() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // 1. GSAP FEATURE_REVEAL PATTERN ON SCROLL
      gsap.from(".feature-reveal-card", {
        y: 60,
        opacity: 0,
        filter: "blur(8px)",
        stagger: 0.12,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="features" ref={sectionRef} className="relative py-32 bg-void">
      <div className="container max-w-7xl mx-auto px-6">
        
        {/* Section header */}
        <div className="text-center space-y-4 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800 border border-white/[0.06] text-white/55 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md">
              Capabilities
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-5xl font-light tracking-[-0.02em] leading-tight text-white"
          >
            Everything you need for
            <br />
            <span className="bg-gradient-to-r from-[#00e5a0] via-emerald-400 to-teal-400 bg-clip-text text-transparent text-glow-accent">
              on-chain compliance.
            </span>
          </motion.h2>
        </div>

        {/* 2. RESPONSIVE GRID USING PORTAL LIQUIDCARD NODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-reveal-card h-full">
              <LiquidCard 
                variant={feature.variant}
                className="h-full flex flex-col items-start text-left cursor-default p-8"
              >
                <div className="inline-flex p-3 rounded-xl bg-void border border-white/[0.04] mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white/90 mb-3 font-heading">{feature.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed font-normal text-wrap-pretty">
                  {feature.description}
                </p>
              </LiquidCard>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
