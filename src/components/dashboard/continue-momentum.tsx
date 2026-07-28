"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRO_UNLOCKS } from "@/lib/plans";

export function ContinueMomentum() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-10"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-64 w-[500px] -translate-x-1/2 rounded-full" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.15]" />
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Vision Pro
          </span>
          <h2 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Continue Your Momentum
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            You&apos;re building a real edge. Vision Pro gives your AI partner
            everything it needs to keep that momentum going — no daily limits,
            deeper reasoning and tools that compound over time.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/billing">
                Continue with Vision Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {PRO_UNLOCKS.map((u, i) => (
            <motion.div
              key={u}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-foreground/90">{u}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
