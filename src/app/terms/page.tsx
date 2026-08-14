import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import { LegalMarkdown } from "@/components/legal/legal-markdown";
import { TERMS_MARKDOWN, TERMS_LAST_UPDATED } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms & Conditions · 4RexVision",
  description:
    "The terms that govern your use of 4RexVision — AI-powered forex analysis and trading-journal tools. See beyond the charts.",
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />

      <main>
        <section className="relative overflow-hidden pt-36 pb-10 md:pt-44">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid mask-radial opacity-[0.3]" />
          </div>
          <div className="container max-w-3xl text-center">
            <Reveal>
              <p className="text-sm font-medium text-primary">See Beyond the Charts</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight md:text-5xl">
                Terms &amp; Conditions
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
                The clear, human-friendly terms for using 4RexVision. Last
                updated {TERMS_LAST_UPDATED}.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="container max-w-3xl pb-24">
          <Reveal>
            <article className="rounded-3xl glass-strong p-6 sm:p-10">
              <LegalMarkdown source={TERMS_MARKDOWN} />
            </article>
          </Reveal>
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
