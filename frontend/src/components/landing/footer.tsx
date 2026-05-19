"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.04] bg-void">
      <div className="container max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Left segment */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 flex items-center justify-center">
                <img src="/logo.png" alt="Sentinel Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-extrabold text-lg font-heading tracking-tight text-white">
                Sentinel<span className="text-[#00e5a0]">Scanner</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/50 max-w-sm leading-relaxed font-normal">
              Institutional-grade Web3 compliance screening. 
              Refractive analytics and risk intelligence for the decentralized economy.
            </p>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">
              Powered by Alchemy · OFAC SDN · GoPlus · Forta · NVIDIA NIM
            </p>
          </div>

          {/* Product links */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Product</h4>
            <ul className="space-y-2.5">
              {[
                { name: "Compliance Scanner", href: "/scan" },
                { name: "Pricing Tiers", href: "/pricing" },
                { name: "User Dashboard", href: "/dashboard" },
                { name: "Developer APIs", href: "#" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Company */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Registry</h4>
            <ul className="space-y-2.5">
              {[
                { name: "About Forensics", href: "#" },
                { name: "Compliance SDN", href: "#" },
                { name: "Terms of Service", href: "#" },
                { name: "Audit Support", href: "#" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footnotes */}
        <div className="flex flex-col md:flex-row items-center justify-between mt-16 pt-8 border-t border-white/[0.04] text-[10px] font-semibold text-white/20 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Sentinel Scanner. All rights reserved.</p>
          <p className="mt-2 md:mt-0 tracking-widest text-[#00e5a0]/50 text-glow-accent">MONASTIC DATA SYSTEM</p>
        </div>
      </div>
    </footer>
  )
}
