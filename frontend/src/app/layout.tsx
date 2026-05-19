import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Navbar } from "@/components/layout/navbar";
import AmbientBackground from "@/components/ambient/ambient-background";
import BreathingBorder from "@/components/ambient/breathing-border";
import Spotlight from "@/components/ambient/spotlight";
import NoiseOverlay from "@/components/ambient/noise-overlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sentinel Scanner | Ethereum Compliance",
  description: "Paste any ETH address. Get a compliance-ready risk report in 3 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#020202] text-white antialiased`}>
        <Providers>
          {/* Layer A: Global Ambient Background */}
          <div className="fixed inset-0 isolate z-[1] pointer-events-none">
            <AmbientBackground />
          </div>

          {/* Layer B: Breathing Border Viewport Frame */}
          <div className="fixed inset-[1px] isolate z-[20] pointer-events-none">
            <BreathingBorder />
          </div>

          {/* Layer C, D: Spotlight & Main Application Wrapper */}
          <div className="relative isolate z-[10] flex min-h-screen flex-col bg-transparent">
            <Spotlight />
            <Navbar />
            <main className="flex-1 relative z-10 pt-20">
              {children}
            </main>
          </div>

          {/* Layer E: Film Grain Noise Overlay */}
          <div className="fixed inset-0 isolate z-[60] pointer-events-none">
            <NoiseOverlay />
          </div>
        </Providers>
      </body>
    </html>
  );
}

