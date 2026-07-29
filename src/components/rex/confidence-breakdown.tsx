"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Gauge } from "lucide-react";
import { RexSection } from "./rex-section";
import { ProgressBar } from "@/components/dashboard/progress-ring";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import type { ConfidenceMetric } from "@/lib/rex/types";

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-500";
  if (score >= 60) return "text-sky-500";
  if (score >= 45) return "text-amber-500";
  return "text-rose-500";
}

function ConfidenceCard({ metric, index }: { metric: ConfidenceMetric; index: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const value = useCountUp(metric.score, inView, 900);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="rounded-2xl glass p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metric.label}</span>
        <span className={cn("text-lg font-bold tabular-nums", scoreTone(metric.score))}>
          {value}%
        </span>
      </div>
      <ProgressBar value={metric.score} className="mt-3" />
      <ul className="mt-3 space-y-1.5">
        {metric.contributors.map((c, ci) => (
          <li key={`${c}-${ci}`} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
            {c}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function ConfidenceBreakdown({
  overall,
  metrics,
  delay,
}: {
  overall: number;
  metrics: ConfidenceMetric[];
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const overallValue = useCountUp(overall, inView, 1100);

  return (
    <RexSection
      sectionNo={4}
      title="Confidence Breakdown"
      subtitle="Every score is backed by what Rex actually observed."
      icon={<Gauge className="h-5 w-5" />}
      delay={delay}
    >
      <div
        ref={ref}
        className="mb-4 flex items-center gap-4 rounded-3xl glass-strong p-6"
      >
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="text-lg font-bold tabular-nums">{overallValue}</span>
        </div>
        <div>
          <h3 className="text-sm text-muted-foreground">Overall Confidence</h3>
          <p className="text-2xl font-bold tracking-tight">{overall}%</p>
          <p className="text-xs text-muted-foreground">
            A blended read — not a guarantee. Rex analyzes probabilities.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m, i) => (
          <ConfidenceCard key={m.key} metric={m} index={i} />
        ))}
      </div>
    </RexSection>
  );
}
