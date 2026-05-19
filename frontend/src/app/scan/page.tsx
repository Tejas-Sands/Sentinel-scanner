import { ScannerInterface } from "@/components/scanner/scanner-interface"

export default function ScanPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-void relative overflow-hidden" data-page="scan">
      
      {/* Monastic ambient breathing orb (15s cycle) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-accent/[0.05] blur-[120px] pointer-events-none animate-slow-breath"
      />
      
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <ScannerInterface />
      </div>
    </div>
  )
}

