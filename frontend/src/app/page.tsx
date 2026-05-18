import { ScannerInterface } from "@/components/scanner/scanner-interface"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-background to-background"></div>
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-green-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-0 left-0 -z-10 h-[500px] w-[500px] bg-blue-500/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <ScannerInterface />
      </div>
    </div>
  )
}
