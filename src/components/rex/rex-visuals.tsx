"use client";

import { TrendingUp, TrendingDown, MoveRight, Clock, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TrendDirection,
  MarketBias,
  ImpactLevel,
  TrendStrength,
} from "@/lib/rex/types";

export function TrendArrow({
  direction,
  className,
}: {
  direction: TrendDirection;
  className?: string;
}) {
  const map = {
    Uptrend: { Icon: TrendingUp, color: "text-emerald-500" },
    Downtrend: { Icon: TrendingDown, color: "text-rose-500" },
    Sideways: { Icon: MoveRight, color: "text-amber-500" },
  } as const;
  const { Icon, color } = map[direction];
  return <Icon className={cn("h-5 w-5", color, className)} />;
}

const biasStyles: Record<MarketBias, string> = {
  Bullish: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  Bearish: "border-rose-500/20 bg-rose-500/10 text-rose-500",
  Neutral: "border-amber-500/20 bg-amber-500/10 text-amber-500",
};

export function BiasPill({ bias, className }: { bias: MarketBias; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
        biasStyles[bias],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {bias}
    </span>
  );
}

const impactStyles: Record<ImpactLevel, string> = {
  High: "border-rose-500/20 bg-rose-500/10 text-rose-500",
  Medium: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  Low: "border-sky-500/20 bg-sky-500/10 text-sky-500",
};

export function ImpactBadge({ impact }: { impact: ImpactLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        impactStyles[impact]
      )}
    >
      {impact} Impact
    </span>
  );
}

export function TimeframeBadge({ timeframe }: { timeframe: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 px-2 py-0.5 text-xs font-semibold">
      <Clock className="h-3 w-3 text-muted-foreground" />
      {timeframe}
    </span>
  );
}

export function PairBadge({ pair }: { pair: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-sm font-semibold text-sky-600 dark:text-sky-300">
      <LineChart className="h-3.5 w-3.5" />
      {pair}
    </span>
  );
}

const strengthDots: Record<TrendStrength, number> = {
  Weak: 1,
  Moderate: 2,
  Strong: 3,
};

export function StrengthMeter({ strength }: { strength: TrendStrength }) {
  const active = strengthDots[strength];
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-5 rounded-full",
              i < active
                ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                : "bg-secondary"
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{strength}</span>
    </div>
  );
}
