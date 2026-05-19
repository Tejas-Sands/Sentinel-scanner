import { HeroSection } from "@/components/landing/hero-section"
import { TrustStrip } from "@/components/landing/trust-strip"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { WhoIsThisFor } from "@/components/landing/who-is-this-for"
import { HowItWorks } from "@/components/landing/how-it-works"
import { CtaSection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <TrustStrip />
      <FeaturesGrid />
      <WhoIsThisFor />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </div>
  )
}
