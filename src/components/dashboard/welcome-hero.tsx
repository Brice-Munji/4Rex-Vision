"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Sparkles, Zap, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeHeroProps {
  firstName: string;
  planDisplay: string;
  used: number;
  limit: number;
  unlimited: boolean;
}

export function WelcomeHero({
  firstName,
  planDisplay,
  used,
  limit,
  unlimited,
}: WelcomeHeroProps) {
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8"
    >
      {/* ambient gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-10 -top-16 h-64 w-64 rounded-full bg-sky-500/20 blur-[90px]" />
        <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-cyan-400/15 blur-[90px]" />
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            {planDisplay} Plan
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Hello {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 text-lg font-medium text-foreground/80">
            Ready to <span className="text-gradient">See Beyond the Charts?</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI trading assistant is standing by.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/analyze">
                <Upload className="h-4 w-4" />
                Upload Screenshot
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/analyze?mode=ask">
                <Sparkles className="h-4 w-4" />
                Ask AI
              </Link>
            </Button>
          </div>
        </div>

        {/* remaining analyses widget */}
        <div className="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Zap className="h-4 w-4" />
            </span>
            Remaining Analyses
          </div>
          {unlimited ? (
            <div className="mt-4 flex items-center gap-2">
              <InfinityIcon className="h-7 w-7 text-sky-400" />
              <span className="text-2xl font-bold">Unlimited</span>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">
                  {remaining}
                </span>
                <span className="text-lg text-muted-foreground">/ {limit}</span>
                <span className="ml-1 text-sm text-muted-foreground">Today</span>
              </div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: limit }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                    className={`h-2 flex-1 origin-left rounded-full ${
                      i < remaining
                        ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                        : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
