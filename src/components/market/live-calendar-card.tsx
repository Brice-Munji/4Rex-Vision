"use client";

import { useEffect, useState } from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarPayload, ImpactBadge } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter, CardError } from "./card";
import { CardSkeleton } from "./skeletons";

const IMPACT_STYLES: Record<ImpactBadge, string> = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function countdown(iso: string, now: number): string {
  const mins = Math.round((new Date(iso).getTime() - now) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function LiveCalendarCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: CalendarPayload | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  // Tick so countdowns stay live without refetching.
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now()); // set on mount (avoids SSR/CSR drift)
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <IntelCard>
      <CardHead
        icon={CalendarClock}
        title="Live Economic Calendar"
        accent="bg-rose-500/10 text-rose-600 dark:text-rose-400"
      />

      {loading && !data ? (
        <CardSkeleton rows={4} />
      ) : error && !data ? (
        <CardError onRetry={onRetry} />
      ) : data && data.events.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No high-impact events in the next 24 hours.</p>
      ) : (
        <div className="mt-5 divide-y divide-border">
          {data?.events.slice(0, 6).map((e) => {
            const hasActual = e.actual !== null && e.actual !== undefined && e.actual !== "";
            return (
              <div key={e.id} className="py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0">
                    <div className="text-sm font-semibold tabular-nums text-foreground">{hhmm(e.time_utc)}</div>
                    <div className="text-[10px] font-medium text-primary">{countdown(e.time_utc, now)}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {e.currency}
                  </span>
                  <span className="flex-1 truncate text-sm text-foreground" title={e.event}>
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
                {(hasActual || e.forecast !== null || e.previous !== null) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[68px] text-[11px]">
                    {hasActual && <Stat label="Actual" value={String(e.actual)} highlight />}
                    {e.forecast !== null && e.forecast !== undefined && (
                      <Stat label="Forecast" value={String(e.forecast)} />
                    )}
                    {e.previous !== null && e.previous !== undefined && (
                      <Stat label="Prev" value={String(e.previous)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data?.warning ? (
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {data.warning}
        </p>
      ) : (
        <CardFooter>Refreshes every 15 minutes</CardFooter>
      )}
    </IntelCard>
  );
}
