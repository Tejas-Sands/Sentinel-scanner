import { notFound } from "next/navigation"

import { api } from "@/lib/api"
import { StatsRow } from "@/components/scanner/stats-row"
import { FlagsList } from "@/components/scanner/flags-list"
import { CounterpartyTable } from "@/components/scanner/counterparty-table"
import { RiskGauge } from "@/components/scanner/risk-gauge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TIER_BG_COLORS } from "@/lib/display"

export default async function PublicReportPage({ params }: { params: { scanId: string } }) {
  try {
    const scan = await api.getScan(params.scanId)
    
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background"></div>
        
        <div className="flex-1 max-w-5xl mx-auto w-full py-12 px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Public Risk Report</h1>
            <p className="text-muted-foreground">Report ID: {scan.scan_id}</p>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-muted/50 overflow-hidden shadow-2xl relative">
            {/* Watermark for free tier (we don't have user auth here, so we just show a static watermark for the public view) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-foreground/[0.03] text-6xl md:text-8xl font-black whitespace-nowrap pointer-events-none z-0">
              SENTINEL SCANNER
            </div>
            
            <div className="p-8 pb-0 flex flex-col md:flex-row gap-8 items-center justify-between border-b border-border/50 bg-background/30 pb-8 relative z-10">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">Risk Assessment</h2>
                  <Badge className={`${TIER_BG_COLORS[scan.risk_tier]} text-white hover:opacity-100`}>
                    {scan.risk_tier}
                  </Badge>
                </div>
                <p className="font-mono text-muted-foreground text-sm break-all">
                  {scan.address}
                </p>
                <div className="text-xs text-muted-foreground mt-4">
                  Generated: {new Date(scan.created_at || "").toLocaleString()}
                </div>
              </div>
              
              <div className="shrink-0 w-48">
                <RiskGauge score={scan.risk_score} tier={scan.risk_tier} />
              </div>
            </div>

            <div className="p-6 relative z-10">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="flags">
                    Risk Flags 
                    {scan.flags.length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {scan.flags.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="counterparties">Counterparties</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <StatsRow summary={scan.summary} />
                  
                  {scan.flags.some(f => f.severity === "CRITICAL" || f.severity === "HIGH") && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Critical Findings</h3>
                      <FlagsList flags={scan.flags.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH")} />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="flags">
                  <FlagsList flags={scan.flags} />
                </TabsContent>
                
                <TabsContent value="counterparties">
                  <CounterpartyTable counterparties={scan.counterparties} />
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
    )
  } catch {
    notFound()
  }
}
