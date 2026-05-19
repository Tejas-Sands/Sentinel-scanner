import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Navbar } from "@/components/layout/navbar";
import AmbientBackground from "@/components/ambient/ambient-background";

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
      <body className={`${inter.className} min-h-screen bg-void text-white antialiased`}>
        <div className="noise-overlay" />
        <Providers>
          <div className="relative flex min-h-screen flex-col bg-void">
            {/* Ambient living tissue layers sitting behind the content */}
            <AmbientBackground />
            
            <Navbar />
            <main className="flex-1 relative z-10">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

