"use client"

import { Shield, LayoutDashboard, CreditCard, Search, User as UserIcon, LogOut } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { LoginDialog } from "@/components/auth/login-dialog"
import { api } from "@/lib/api"
import { User } from "@/lib/types"

export function Navbar() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check local storage for token and fetch user
    const token = localStorage.getItem("sentinel_token")
    if (token) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => localStorage.removeItem("sentinel_token"))
    }
  }, [])

  const handleLogout = () => {
    api.logout()
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-void/60 backdrop-blur-xl transition-all duration-300">
        <div className="container flex h-20 max-w-7xl mx-auto items-center justify-between px-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-[#00e5a0] flex items-center justify-center shadow-lg shadow-[#00e5a0]/15 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-5 w-5 text-[#020202] fill-current" />
            </div>
            <span className="font-extrabold text-xl font-heading tracking-tighter text-white">
              Sentinel<span className="text-[#00e5a0]">Scanner</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { name: "Scan", href: "/scan", icon: <Search className="h-4 w-4" /> },
              { name: "Pricing", href: "/pricing", icon: <CreditCard className="h-4 w-4" /> },
              { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
            ].map((item) => (
              <Link 
                key={item.name} 
                href={item.href} 
                className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white transition-colors py-2 px-1 relative group"
              >
                {item.icon}
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#00e5a0] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>
 
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/55 bg-liquid-800 px-3 py-1.5 rounded-full border border-white/[0.06] font-mono">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[150px]">{user.email}</span>
                </div>
                <Button variant="ghost" className="rounded-xl font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold text-white/80" onClick={() => setIsLoginOpen(true)}>
                  Sign In
                </Button>
                <Button className="rounded-xl font-bold shadow-lg hover:shadow-[0_0_20px_rgba(0,229,160,0.35)] transition-all" onClick={() => setIsLoginOpen(true)}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <LoginDialog 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSuccess={() => {
          setIsLoginOpen(false)
          window.location.reload()
        }} 
      />
    </>
  )
}
