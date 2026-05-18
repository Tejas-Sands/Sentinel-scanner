import { Shield, LayoutDashboard, CreditCard, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
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
          <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold">Sign In</Button>
          <Button className="rounded-xl font-bold shadow-lg shadow-primary/20">Get Started</Button>
        </div>
      </div>
    </header>
  )
}
