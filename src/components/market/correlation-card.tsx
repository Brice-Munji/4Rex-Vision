"use client";

import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CorrelationsPayload } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter, CardError } from "./card";
import { CardSkeleton } from "./skeletons";

function fmtPair(pair: string): string {
  return pair.length === 6 ? `${pair.slice(0, 3)}/${pair.slice(3)}` : pair;
}

function signed(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

export function CorrelationCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: CorrelationsPayload | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <IntelCard>
      <CardHead icon={GitBranch} title="Correlation Watch" accent="bg-primary/10 text-primary" />

      {loading && !data ? (
        <CardSkeleton rows={4} />
      ) : error && !data ? (
        <CardError onRetry={onRetry} />
      ) : (
        <div className="mt-5 space-y-2.5">
          {data?.pairs.map((c) => {
            const positive = c.value >= 0;
            const magnitude = Math.min(100, Math.abs(c.value) * 100);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary px-3 py-2.5"
              >
                <span className="flex items-center gap-1.5 text-sm text-foreground">
                  <span className="font-semibold">{fmtPair(c.a)}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span className="font-semibold">{fmtPair(c.b)}</span>
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-card sm:block">
                    <div
                      className={cn("h-full rounded-full", positive ? "bg-emerald-500" : "bg-rose-500")}
                      style={{ width: `${magnitude}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "w-14 text-right text-sm font-bold tabular-nums",
                      positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {signed(c.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardFooter>Refreshes every 30 minutes</CardFooter>
    </IntelCard>
  );
}
