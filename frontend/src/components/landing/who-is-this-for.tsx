"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Building2, Scale, Search, Landmark } from "lucide-react"
import { LiquidCard } from "@/components/ui/liquid-card"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const AUDIENCES = [
  {
    icon: <Building2 className="h-6 w-6 text-[#00e5a0]/60" />,
    title: "Crypto Exchanges",
    description: "Screen deposits and withdrawals in real-time to meet compliance requirements before regulators come knocking.",
  },
  {
    icon: <Scale className="h-6 w-6 text-[#00e5a0]/60" />,
    title: "Law Enforcement",
    description: "Trace illicit flows, mixer proximity hops, and generate court-ready compliance evidence PDF reports instantly.",
  },
  {
    icon: <Search className="h-6 w-6 text-[#00e5a0]/60" />,
    title: "Security Auditors",
    description: "Analyze counterparty interaction levels across transactional chains. Identify hidden compliance flags.",
  },
  {
    icon: <Landmark className="h-6 w-6 text-[#00e5a0]/60" />,
    title: "DeFi Protocols",
    description: "Secure decentralized contracts against exploits, front-runners, and sanctioned incoming capital.",
  },
]

export function WhoIsThisFor() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".audience-reveal-card", {
        opacity: 0,
        x: -30,
        filter: "blur(6px)",
        stagger: 0.12,
        duration: 0.8,
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
    <section ref={sectionRef} className="relative py-32 bg-void overflow-hidden">
      {/* Visual Ambient drift orb in the background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left: Branding Copy */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-liquid-800 border border-white/[0.06] text-white/55 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur-md">
                Who It&apos;s For
              </span>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl md:text-5xl font-light tracking-[-0.02em] leading-tight text-white"
            >
              Built for teams
              <br />
              <span className="bg-gradient-to-r from-[#00e5a0] to-emerald-400 bg-clip-text text-transparent text-glow-accent">
                who must inspect.
              </span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-white/55 text-base sm:text-lg leading-relaxed font-normal text-wrap-pretty"
            >
              Whether you are managing institutional treasury compliance, auditing smart contract counterparties, 
              or investigating threat intelligence vectors—Sentinel provides monastic, high-precision clarity in 3 seconds.
            </motion.p>
          </div>

          {/* Right: Grid of LiquidCards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AUDIENCES.map((item) => (
              <div key={item.title} className="audience-reveal-card">
                <LiquidCard className="p-6 cursor-default h-full border-white/[0.04] bg-liquid-800/40 hover:border-white/[0.08] hover:bg-liquid-700/60">
                  <div className="inline-flex p-2.5 rounded-xl bg-void border border-white/[0.04] mb-4">
                    {item.icon}
                  </div>
                  <h4 className="font-bold text-base text-white/90 mb-2 font-heading">{item.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </LiquidCard>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
