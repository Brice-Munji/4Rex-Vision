"use client";

import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImpactLevel, NewsPayload } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter, CardError } from "./card";
import { CardSkeleton } from "./skeletons";

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  high: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export function NewsCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: NewsPayload | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <IntelCard>
      <CardHead icon={CalendarClock} title="Upcoming High-Impact News" accent="bg-rose-500/10 text-rose-400" />

      {loading && !data ? (
        <CardSkeleton rows={3} />
      ) : error && !data ? (
        <CardError onRetry={onRetry} />
      ) : (
        <div className="mt-5 divide-y divide-[#1F1F1F]">
          {data?.events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-[#F5F5F5]">
                {e.time}
              </span>
              <span className="shrink-0 rounded-md bg-[#0A0A0A] px-2 py-0.5 text-[11px] font-bold text-[#A3A3A3]">
                {e.currency}
              </span>
              <span className="flex-1 truncate text-sm text-[#F5F5F5]" title={e.event}>
                {e.event}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  IMPACT_STYLES[e.impact]
                )}
              >
                {e.impact}
              </span>
            </div>
          ))}
        </div>
      )}

      <CardFooter>Refreshes every 15 minutes</CardFooter>
    </IntelCard>
  );
}
