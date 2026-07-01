"use client";

import { CalendarClock, Info } from "lucide-react";
import { RexSection } from "./rex-section";
import { ImpactBadge } from "./rex-visuals";
import type { EconomicEventItem } from "@/lib/rex/types";

export function EconomicContextCard({
  events,
  delay,
}: {
  events: EconomicEventItem[];
  delay?: number;
}) {
  return (
    <RexSection
      sectionNo={4}
      title="Economic Context"
      subtitle="Upcoming events that could move your pair."
      icon={<CalendarClock className="h-5 w-5" />}
      delay={delay}
    >
      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="rounded-3xl glass p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold">
                {e.currency}
              </span>
              <span className="font-semibold">{e.title}</span>
              <ImpactBadge impact={e.impact} />
              <span className="ml-auto text-sm text-muted-foreground">{e.time}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-500">
                {e.expectedVolatility}
              </span>
              <span className="rounded-full border border-border bg-card/40 px-2.5 py-1 text-muted-foreground">
                {e.session} session
              </span>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {e.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </RexSection>
  );
}
