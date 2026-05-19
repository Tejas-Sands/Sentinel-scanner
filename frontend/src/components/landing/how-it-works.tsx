"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Search, Cpu, FileCheck } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    number: "01",
    icon: <Search className="h-6 w-6 text-[#00e5a0]" />,
    title: "Paste Wallet Address",
    description: "Input any public Ethereum wallet. Our real-time validation layer scrubs format issues before the scan pipelines fire.",
  },
  {
    number: "02",
    icon: <Cpu className="h-6 w-6 text-[#00e5a0]" />,
    title: "AI Compliance Scan",
    description: "We orchestrate requests across 10+ databases in parallel, grading the target relative to OFAC lists, mixers, and stablecoin darklists.",
  },
  {
    number: "03",
    icon: <FileCheck className="h-6 w-6 text-[#00e5a0]" />,
    title: "Audit Evidence Report",
    description: "Receive a robust compliance score, a dynamic flags matrix, a forensic report, and a downloadable PDF copy stamped with security watermark keys.",
  },
]

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      // 1. GSAP CONNECTING LINE ANIMATION
      if (lineRef.current) {
        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          ease: "power1.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: 1,
          },
        })
      }
      
      // 2. STAGGERED REVEALS (HEAVY DECELERATION)
      gsap.from(".step-reveal-card", {
        opacity: 0,
        y: 40,
        filter: "blur(6px)",
        stagger: 0.2,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-32 bg-void">
      <div className="container max-w-7xl mx-auto px-6">
        
        {/* Section header */}
        <div className="text-center space-y-4 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800 border border-white/[0.06] text-white/55 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md">
              How It Works
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-5xl font-light tracking-[-0.02em] leading-tight text-white"
          >
            Three stages to
            <br />
            <span className="bg-gradient-to-r from-[#00e5a0] to-emerald-400 bg-clip-text text-transparent text-glow-accent">
              complete transparency.
            </span>
          </motion.h2>
        </div>

        {/* Timeline Steps layout */}
        <div className="relative">
          {/* 3. Connecting Line (Scroll-Drawn Neon Path) */}
          <div className="hidden lg:block absolute top-[52px] left-[16%] right-[16%] h-[2px] z-0">
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <line
                ref={lineRef}
                x1="0" y1="0" x2="100%" y2="0"
                stroke="#00e5a0"
                strokeWidth="2"
                strokeDasharray="1000"
                strokeDashoffset="1000"
                style={{ filter: "drop-shadow(0 0 8px rgba(0,229,160,0.6))" }}
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
            {STEPS.map((step) => (
              <div key={step.number} className="step-reveal-card">
                <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-white/[0.04] bg-liquid-800/40 backdrop-blur-md hover:border-white/[0.08] hover:bg-liquid-700/50 transition-all duration-300">
                  
                  {/* Step visual anchor */}
                  <div className="h-14 w-14 rounded-xl bg-void border border-white/[0.04] flex items-center justify-center mb-6 shadow-md">
                    {step.icon}
                  </div>
                  
                  {/* 4. Tabular-nums Step indicators in Accent Mint */}
                  <span className="font-mono text-xs font-black uppercase tracking-[0.3em] text-[#00e5a0] mb-3 tracking-widest text-glow-accent">
                    STEP {step.number}
                  </span>
                  
                  <h3 className="text-lg font-bold text-white/90 mb-3 font-heading">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-normal text-wrap-pretty">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
