"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative py-12 md:py-20">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl glass-strong px-6 py-16 text-center md:px-16 md:py-20">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-sky-500/25 blur-[100px]" />
              <div className="absolute inset-0 bg-grid opacity-[0.2]" />
            </div>

            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Start in seconds — no card required
            </div>

            <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Ready to <span className="text-gradient">see beyond the charts?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground md:text-lg">
              Join thousands of traders using AI to read the market with clarity,
              confidence and speed.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="#pricing">
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
