"use client"

import { Check, Zap, Rocket, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

export default function PricingPage() {
  const tiers = [
    {
      name: "Free",
      icon: <Zap className="h-6 w-6 text-primary" />,
      price: "₹0",
      description: "Ideal for individual compliance officers.",
      features: [
        "10 scans per month",
        "Standard risk scoring",
        "Public report links",
        "Community access",
      ],
      button: "Start Scanning",
      action: "/",
      popular: false,
    },
    {
      name: "Pro",
      icon: <Rocket className="h-6 w-6 text-primary" />,
      price: "₹3,000",
      period: "/month",
      description: "For CA firms and high-volume professionals.",
      features: [
        "500 scans per month",
        "Unwatermarked PDF exports",
        "Full counterparty analysis",
        "Historical risk tracking",
        "Priority email support",
      ],
      button: "Upgrade to Pro",
      action: "#",
      popular: true,
    },
    {
      name: "Enterprise API",
      icon: <Building2 className="h-6 w-6 text-primary" />,
      price: "₹8,000",
      period: "/month",
      description: "Full integration for exchanges and banks.",
      features: [
        "5,000 API calls per month",
        "Real-time webhook alerts",
        "Custom risk parameters",
        "White-labeled reports",
        "Dedicated account manager",
      ],
      button: "Get API Access",
      action: "#",
      popular: false,
    },
  ]

  return (
    <div className="relative py-24 px-4 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent -z-10 blur-3xl opacity-50"></div>
      
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 mb-20"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-heading">
            Simple, <span className="text-primary">transparent</span> pricing.
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">
            No hidden fees. Scale as your compliance requirements grow.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex h-full"
            >
              <Card 
                className={`flex flex-col w-full p-10 rounded-[2.5rem] relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  tier.popular 
                    ? "border-primary bg-primary/[0.03] shadow-xl shadow-primary/10 ring-1 ring-primary/20" 
                    : "border-border/50 bg-card/50 glass"
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                    Recommended
                  </div>
                )}
                
                <div className="mb-10 flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    {tier.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{tier.name}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black font-heading tracking-tighter">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground font-bold">{tier.period}</span>}
                  </div>
                  <p className="text-muted-foreground mt-4 font-medium text-sm leading-relaxed">
                    {tier.description}
                  </p>
                </div>
                
                <div className="flex-1 space-y-5 mb-10 pt-10 border-t border-border/50">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary stroke-[3px]" />
                      </div>
                      <span className="text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className={`w-full h-14 rounded-2xl font-bold text-base transition-all duration-300 ${
                    tier.popular 
                      ? "shadow-xl shadow-primary/30 hover:scale-[1.02]" 
                      : "hover:bg-primary/10"
                  }`} 
                  variant={tier.popular ? "default" : "secondary"}
                  onClick={() => window.location.href = tier.action}
                >
                  {tier.button}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-20 text-center">
          <p className="text-muted-foreground font-medium">
            Need a custom plan for over 10,000 scans? 
            <a href="mailto:support@sentinel.com" className="text-primary font-bold ml-2 hover:underline">Contact Enterprise Support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
