"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function CtaSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".cta-reveal-container", {
        opacity: 0,
        y: 40,
        filter: "blur(8px)",
        duration: 1.0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="relative py-32 bg-void">
      <div className="container max-w-7xl mx-auto px-6">
        
        {/* Visual outline container */}
        <div className="cta-reveal-container relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-gradient-to-br from-liquid-800/90 to-liquid-900/95 shadow-2xl p-12 md:p-20">
          
          {/* Subtle noise and masked pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 90%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 90%)",
            }}
          />
          
          {/* Glowing accent ambient orb */}
          <div className="absolute right-[-10%] top-[-20%] h-[300px] w-[300px] bg-accent/10 blur-[80px] rounded-full pointer-events-none animate-pulse" />

          {/* Top highlight inset */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/[0.04] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-[#00e5a0] text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md text-glow-accent"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Immediate Integration
            </motion.div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-tight text-white">
              Ready to secure your
              <br />
              <span className="bg-gradient-to-r from-[#00e5a0] via-emerald-400 to-teal-400 bg-clip-text text-transparent text-glow-accent">
                compliance pipeline?
              </span>
            </h2>

            <p className="text-white/55 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal text-wrap-pretty">
              Launch free compliance audits immediately. Integrate our developer APIs, 
              generate permanent report watermarks, and optimize high-precision risk thresholds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
              <Link href="/scan" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold rounded-xl group shadow-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.35)] transition-all">
                  <Shield className="mr-2 h-4 w-4 shrink-0" />
                  Launch Scanner
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold rounded-xl">
                  View Pricing
                </Button>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
