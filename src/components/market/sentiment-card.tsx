"use client";

import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SentimentLabel, SentimentPayload } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter, CardError } from "./card";
import { CardSkeleton } from "./skeletons";

const META: Record<SentimentLabel, { text: string; bar: string; icon: React.ElementType }> = {
  Bullish: { text: "text-emerald-400", bar: "bg-emerald-500", icon: TrendingUp },
  Bearish: { text: "text-rose-400", bar: "bg-rose-500", icon: TrendingDown },
  Neutral: { text: "text-amber-400", bar: "bg-amber-500", icon: Minus },
};

function fmtPair(pair: string): string {
  return pair.length === 6 ? `${pair.slice(0, 3)}/${pair.slice(3)}` : pair;
}

export function SentimentCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: SentimentPayload | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const derived = data?.pairs.some((p) => p.source === "rex");

  return (
    <IntelCard>
      <CardHead
        icon={Activity}
        title="Rex Sentiment by Pair"
        accent="bg-primary/10 text-primary"
      />

      {loading && !data ? (
        <CardSkeleton rows={4} />
      ) : error && !data ? (
        <CardError onRetry={onRetry} />
      ) : (
        <div className="mt-5 space-y-4">
          {data?.pairs.map((p) => {
            const m = META[p.label];
            const Icon = m.icon;
            return (
              <div key={p.pair}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#F5F5F5]">{fmtPair(p.pair)}</span>
                  <span className={cn("flex items-center gap-1.5 font-semibold", m.text)}>
                    <Icon className="h-3.5 w-3.5" />
                    {p.label}
                    <span className="tabular-nums">{p.strength}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.strength}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className={cn("h-full rounded-full", m.bar)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardFooter>
        {derived ? "Derived from recent Rex analyses" : "Baseline — updates as analyses complete"}
      </CardFooter>
    </IntelCard>
  );
}
