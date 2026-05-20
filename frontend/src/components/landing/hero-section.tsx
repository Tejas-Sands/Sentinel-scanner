"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Shield, ArrowRight, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MagneticWrapper } from "@/components/ui/magnetic-wrapper"
import Link from "next/link"
import gsap from "gsap"

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mintOrbRef = useRef<HTMLDivElement>(null)
  const whiteOrbRef = useRef<HTMLDivElement>(null)

  const [logText, setLogText] = useState("")
  const [score, setScore] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile, { passive: true })

    // VISCOUS CONTINUOUS LOOPS - GSAP drift pattern for ambient orbs (Desktop only)
    if (window.innerWidth >= 768) {
      if (mintOrbRef.current) {
        gsap.to(mintOrbRef.current, {
          x: "random(-40, 40)",
          y: "random(-30, 30)",
          scale: "random(0.95, 1.05)",
          duration: "random(8, 12)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      }

      if (whiteOrbRef.current) {
        gsap.to(whiteOrbRef.current, {
          x: "random(-30, 30)",
          y: "random(-40, 40)",
          scale: "random(0.9, 1.1)",
          duration: "random(10, 15)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      }
    }

    const logs = [
      "[SYSTEM] Initiating scan sequence...",
      "[ENS] Resolving 0x742d35...f44e",
      "[OFAC] Cross-referencing sanctions... CLEARED",
      "[MIXER] Tracing proximity hops... 0 HOPS",
      "[NVIDIA] Synthesizing risk profile... READY",
    ]
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setLogText(prev => prev + (prev ? "\n" : "") + logs[i])
        i++
      } else {
        clearInterval(interval)
      }
    }, 600)

    let currentScore = 0;
    const scoreInterval = setInterval(() => {
      if (currentScore < 12) {
        currentScore++;
        setScore(currentScore)
      } else {
        clearInterval(scoreInterval)
      }
    }, 100)

    return () => {
      clearInterval(interval)
      clearInterval(scoreInterval)
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return (
    <section 
      ref={containerRef} 
      className="relative isolate min-h-[100vh] flex items-center justify-center overflow-hidden bg-void"
      data-page="landing"
    >
      {/* 1. MASKED RADIAL FADING GRID */}
      <div
        className="absolute inset-0 -z-20 opacity-40"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 80%)",
        }}
      />
      
      {/* 2. BIOLUMINESCENT ACCENT DRIVING ORBS */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          ref={mintOrbRef}
          className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px] mix-blend-screen will-change-transform"
        />
        <div
          ref={whiteOrbRef}
          className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-white/[0.02] blur-[120px] will-change-transform"
        />
      </div>

      <div className="container max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center relative z-10">
        <div className="flex flex-col items-center text-center space-y-10">
          
          {/* Subtle upper badge */}
          <motion.div
            initial={isMobile ? { opacity: 0, y: 10 } : { opacity: 0, y: 15, filter: "blur(5px)" }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800/80 border border-white/[0.06] text-white/50 text-xs font-semibold tracking-[0.25em] uppercase backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#00e5a0]" />
              Web3 Compliance Engine
            </div>
          </motion.div>

          {/* 3. CLAMP DISPLAY TYPOGRAPHY - Gradient text fill */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.15, delayChildren: 0.15 } }
            }}
            className="text-[clamp(2.5rem,7vw,5.5rem)] font-light tracking-[-0.03em] leading-[1.0] max-w-5xl text-wrap-balance"
          >
            <span className="block overflow-hidden relative">
              <motion.span 
                variants={{
                  hidden: { y: "100%", opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="block text-white/90"
              >
                On-Chain Risk
              </motion.span>
            </span>
            <span className="block overflow-hidden relative">
              <motion.span 
                variants={{
                  hidden: { y: "100%", opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="block bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent"
              >
                Intelligence.
              </motion.span>
            </span>
          </motion.h1>

          {/* airy micro-copy */}
          <motion.p
            initial={isMobile ? { opacity: 0, y: 15 } : { opacity: 0, y: 20, filter: "blur(5px)" }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg text-white/55 max-w-2xl leading-relaxed tracking-wide font-normal text-wrap-pretty"
          >
            Cross-reference any Ethereum wallet address against OFAC sanctions, 
            mixer patterns, and 10+ forensic databases instantly. Secure compliance 
            without friction.
          </motion.p>

          {/* primary CTA + secondary ghost */}
          <motion.div
            initial={isMobile ? { opacity: 0, y: 15 } : { opacity: 0, y: 20, filter: "blur(5px)" }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <MagneticWrapper>
              <Link href="/scan">
                <Button size="lg" className="h-12 px-8 font-semibold group rounded-xl shadow-[0_0_20px_rgba(0,229,160,0.15)] hover:shadow-[0_0_30px_rgba(0,229,160,0.4)] transition-all">
                  Start Scanning Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </MagneticWrapper>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 font-semibold rounded-xl">
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* Interactive Mock Scan Preview Card */}
          <motion.div
            initial={isMobile ? { opacity: 0, y: 20 } : { opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={isMobile ? { duration: 0.8, delay: 0.5, ease: "easeOut" } : { duration: 1.2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-16 w-full max-w-3xl"
          >
            {/* Top Inset light highlight box */}
            <div className="absolute -inset-px rounded-[20px] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
            
            <div className="relative bg-gradient-to-br from-liquid-800/80 to-liquid-900/90 backdrop-blur-[20px] saturate-[140%] border border-white/[0.06] rounded-[20px] p-8 md:p-10 shadow-2xl mobile-optimize-backdrop">
              
              <div className="flex items-start justify-between mb-8 border-b border-white/[0.04] pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#00e5a0]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/55">Real-Time Risk Profile</span>
                  </div>
                  <p className="font-mono text-sm text-white/50 tracking-wider">0x742d35...f44e</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold text-glow-accent text-accent">{score}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35 mt-0.5">COMPLIANCE SCORE</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: <Shield className="h-4 w-4 text-accent" />, label: "OFAC Blacklist", status: "CLEARED" },
                  { icon: <Lock className="h-4 w-4 text-accent" />, label: "Mixer Proximity", status: "NO HOPS" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-void/50 border border-white/[0.04]">
                    <div className="shrink-0">{item.icon}</div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/35 truncate">{item.label}</p>
                      <p className="text-xs font-bold text-white/80 mt-0.5 tracking-wider font-mono">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Terminal Log Stream */}
              <div className="bg-void/80 border border-white/[0.04] rounded-xl p-4 font-mono text-[10px] sm:text-xs text-[#00e5a0]/80 h-[100px] overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-liquid-800/80 z-10" />
                <pre className="whitespace-pre-wrap flex flex-col justify-end min-h-full">
                  {logText}
                  <span className="animate-pulse inline-block w-2 h-3 bg-[#00e5a0]/80 ml-1 align-middle" />
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
