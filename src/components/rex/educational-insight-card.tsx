"use client";

import { GraduationCap } from "lucide-react";
import { RexSection } from "./rex-section";
import type { EducationalInsight } from "@/lib/rex/types";

export function EducationalInsightCard({
  insight,
  delay,
}: {
  insight: EducationalInsight;
  delay?: number;
}) {
  return (
    <RexSection
      sectionNo={8}
      title="Educational Insight"
      subtitle="One practical lesson from today's chart."
      icon={<GraduationCap className="h-5 w-5" />}
      delay={delay}
    >
      <div className="relative overflow-hidden rounded-3xl glass-strong p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl" />
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-base font-semibold">{insight.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {insight.body}
            </p>
          </div>
        </div>
      </div>
    </RexSection>
  );
}
