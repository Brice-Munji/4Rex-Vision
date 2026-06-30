"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, CheckCircle2 } from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import { useCountUp } from "@/hooks/use-count-up";
import { ProgressComparison } from "./progress-comparison";
import { ContinueMomentum } from "./continue-momentum";
import { cn } from "@/lib/utils";
import {
  TODAY_SUMMARY_STATS,
  TODAY_SUMMARY_MESSAGE,
} from "@/lib/billing-data";

function SummaryStatCard({
  stat,
  index,
}: {
  stat: (typeof TODAY_SUMMARY_STATS)[number];
  index: number;
}) {
  const Icon = getIcon(stat.icon);
  const numeric = typeof stat.value === "number";
  const decimals = numeric && !Number.isInteger(stat.value as number) ? 1 : 0;
  const counted = useCountUp(numeric ? (stat.value as number) : 0, true, 1100, decimals);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", stat.accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 flex items-baseline gap-0.5">
        <span className="text-xl font-bold tracking-tight">
          {numeric ? counted : stat.value}
        </span>
        {stat.suffix && (
          <span className="text-xs text-muted-foreground">{stat.suffix}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
    </motion.div>
  );
}

export function EndOfDaySummary({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Lock body scroll while open.
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] overflow-y-auto bg-background/80 backdrop-blur-md"
        >
          <div className="min-h-full px-4 py-10 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-4xl space-y-6"
            >
              {/* header */}
              <div className="relative overflow-hidden rounded-3xl glass-strong p-6 text-center sm:p-8">
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-sky-500/25 blur-[80px]" />
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.1 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-xl shadow-emerald-500/30"
                >
                  <CheckCircle2 className="h-8 w-8" />
                </motion.div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                  Today&apos;s Trading Summary
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You&apos;ve completed today&apos;s Explorer analyses. Here&apos;s your recap.
                </p>
              </div>

              {/* stat cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TODAY_SUMMARY_STATS.map((s, i) => (
                  <SummaryStatCard key={s.key} stat={s} index={i} />
                ))}
              </div>

              {/* AI summary message */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-3xl glass p-6"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">AI Summary</h3>
                </div>
                <p className="mt-4 text-base leading-relaxed text-foreground/90">
                  {TODAY_SUMMARY_MESSAGE}
                </p>
              </motion.div>

              {/* progress comparison */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Compared to yesterday
                </h3>
                <ProgressComparison />
              </div>

              {/* upgrade momentum */}
              <ContinueMomentum />

              <div className="flex justify-center pb-4">
                <button
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Close summary
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
