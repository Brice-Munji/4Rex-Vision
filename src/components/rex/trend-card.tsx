"use client";

import { Compass } from "lucide-react";
import { RexSection } from "./rex-section";
import { TrendArrow, StrengthMeter, TimeframeBadge } from "./rex-visuals";
import { ExplainThis } from "./explain-this";
import type { TrendSection } from "@/lib/rex/types";

export function TrendCard({ trend, delay }: { trend: TrendSection; delay?: number }) {
  return (
    <RexSection
      sectionNo={1}
      title="Overall Trend"
      icon={<Compass className="h-5 w-5" />}
      action={<ExplainThis concept="Trend" />}
      delay={delay}
    >
      <div className="rounded-3xl glass p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <span className="text-xs text-muted-foreground">Direction</span>
            <div className="mt-2 flex items-center gap-2">
              <TrendArrow direction={trend.direction} />
              <span className="text-lg font-bold">{trend.direction}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <span className="text-xs text-muted-foreground">Trend Strength</span>
            <div className="mt-3">
              <StrengthMeter strength={trend.strength} />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <span className="text-xs text-muted-foreground">Detected Timeframe</span>
            <div className="mt-2.5">
              <TimeframeBadge timeframe={trend.timeframe} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {trend.summary}
        </p>
      </div>
    </RexSection>
  );
}
