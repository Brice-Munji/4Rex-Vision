import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { MarketingPricing } from "@/components/billing/marketing-pricing";
import { FeatureComparison } from "@/components/billing/feature-comparison";
import { PricingFaq } from "@/components/billing/pricing-faq";
import { Testimonials } from "@/components/billing/testimonials";
import { EnterpriseContact } from "@/components/billing/enterprise-contact";

export const metadata: Metadata = {
  title: "Pricing · 4RexVision",
  description:
    "Unlock your professional AI trading partner. Simple, transparent pricing — Explorer, Vision Pro and Vision Elite.",
};

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        {/* hero */}
        <section className="relative overflow-hidden pt-36 pb-12 md:pt-44">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full" />
            <div className="absolute inset-0 bg-grid mask-radial opacity-[0.3]" />
          </div>
          <div className="container text-center">
            <Reveal>
              <Badge variant="default" className="mb-4">
                Pricing
              </Badge>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
                Unlock your{" "}
                <span className="text-gradient">AI trading partner.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground md:text-lg">
                Start free and upgrade when you&apos;re ready for unlimited
                analyses, an AI Coach and the full intelligence suite.
              </p>
            </Reveal>
          </div>
        </section>

        {/* plans */}
        <section className="container pb-20">
          <MarketingPricing />
        </section>

        {/* comparison */}
        <section className="container pb-24">
          <Reveal className="mx-auto max-w-5xl">
            <FeatureComparison />
          </Reveal>
        </section>

        {/* testimonials */}
        <section className="container pb-24">
          <Testimonials />
        </section>

        {/* enterprise */}
        <section className="container pb-24">
          <EnterpriseContact />
        </section>

        {/* faq */}
        <section className="container pb-28">
          <PricingFaq />
        </section>
      </main>

      <Footer />

      <Link
        href="/"
        className="fixed bottom-6 left-6 z-40 hidden items-center gap-1.5 rounded-full glass-strong px-4 py-2 text-sm text-muted-foreground shadow-lg transition-colors hover:text-foreground md:inline-flex"
      >
        <ArrowLeft className="h-4 w-4" />
        Back home
      </Link>
    </div>
  );
}
