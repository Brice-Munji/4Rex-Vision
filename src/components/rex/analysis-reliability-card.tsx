"use client";

import * as React from "react";
import { useInView } from "framer-motion";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { RexSection } from "./rex-section";
import { ProgressRing, ProgressBar } from "@/components/dashboard/progress-ring";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import type { ReliabilitySection } from "@/lib/rex/types";

export function AnalysisReliabilityCard({
  reliability,
  delay,
}: {
  reliability: ReliabilitySection;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const overall = useCountUp(reliability.overall, inView, 1100);

  return (
    <RexSection
      sectionNo={9}
      title="Analysis Reliability"
      subtitle="How much to trust this report — Rex never pretends certainty."
      icon={<ShieldCheck className="h-5 w-5" />}
      delay={delay}
    >
      <div ref={ref} className="rounded-3xl glass p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="flex flex-col items-center">
            <ProgressRing value={reliability.overall} size={120} stroke={10}>
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums">{overall}%</div>
                <div className="text-[10px] text-muted-foreground">reliability</div>
              </div>
            </ProgressRing>
            <span className="mt-2 text-xs text-muted-foreground">
              Overall Analysis Reliability
            </span>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            {reliability.metrics.map((m) => (
              <div key={m.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/80">{m.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{m.score}%</span>
                </div>
                <ProgressBar
                  value={m.score}
                  className="mt-1.5"
                  barClassName={cn(
                    m.score < 60 && "from-amber-500 to-orange-500"
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        {reliability.reduced && reliability.note && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{reliability.note}</p>
          </div>
        )}
      </div>
    </RexSection>
  );
}
