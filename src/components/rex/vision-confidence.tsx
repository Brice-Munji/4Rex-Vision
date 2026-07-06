"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Eye, Info } from "lucide-react";
import { ProgressRing, ProgressBar } from "@/components/dashboard/progress-ring";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import type { VisionConfidence } from "@/lib/rex/types";

function tone(score: number) {
  if (score >= 75) return "from-emerald-500 to-emerald-400";
  if (score >= 55) return "from-sky-500 to-cyan-400";
  if (score >= 40) return "from-amber-500 to-amber-400";
  return "from-rose-500 to-rose-400";
}

export function VisionConfidenceCard({
  vision,
  delay,
}: {
  vision: VisionConfidence;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const overall = useCountUp(vision.overall, inView, 1100);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl glass p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25">
          <Eye className="h-5 w-5" />
        </span>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
            Vision Confidence
          </span>
          <h2 className="text-lg font-semibold tracking-tight">
            How well Rex sees this chart
          </h2>
        </div>
        {vision.chartSource !== "Unknown" && (
          <span className="ml-auto hidden rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300 sm:inline">
            {vision.chartSource}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="flex flex-col items-center">
          <ProgressRing value={vision.overall} size={120} stroke={10}>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{overall}%</div>
              <div className="text-[10px] text-muted-foreground">overall</div>
            </div>
          </ProgressRing>
          <span className="mt-2 text-xs text-muted-foreground">
            Overall Vision Confidence
          </span>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {vision.metrics.map((m) => (
            <div key={m.key}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/80">{m.label}</span>
                <span className="text-sm font-semibold tabular-nums">{m.score}%</span>
              </div>
              <ProgressBar
                value={m.score}
                className="mt-1.5"
                barClassName={cn("bg-gradient-to-r", tone(m.score))}
              />
              {m.note && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {m.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {vision.reduced && vision.note && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{vision.note}</p>
        </div>
      )}
    </motion.div>
  );
}
