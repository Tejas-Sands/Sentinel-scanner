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
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/60 backdrop-blur-xl transition-all duration-300">
        <div className="container flex h-20 max-w-7xl mx-auto items-center justify-between px-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-6 w-6 text-primary-foreground fill-current" />
            </div>
            <span className="font-extrabold text-xl font-heading tracking-tighter">Sentinel<span className="text-primary">Scanner</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { name: "Scan", href: "/", icon: <Search className="h-4 w-4" /> },
              { name: "Pricing", href: "/pricing", icon: <CreditCard className="h-4 w-4" /> },
              { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
            ].map((item) => (
              <Link 
                key={item.name} 
                href={item.href} 
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2 px-1 relative group"
              >
                {item.icon}
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  <UserIcon className="h-4 w-4" />
                  <span className="truncate max-w-[150px]">{user.email}</span>
                </div>
                <Button variant="ghost" className="rounded-xl font-bold text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold" onClick={() => setIsLoginOpen(true)}>
                  Sign In
                </Button>
                <Button className="rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => setIsLoginOpen(true)}>
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
