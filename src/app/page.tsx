import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Features } from "@/components/sections/features";
import { Pricing } from "@/components/sections/pricing";
import { FAQ } from "@/components/sections/faq";
import { CTA } from "@/components/sections/cta";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
