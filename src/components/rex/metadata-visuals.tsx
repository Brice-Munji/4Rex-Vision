"use client";

import {
  CandlestickChart,
  LineChart,
  BarChart3,
  Layers,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingPlatform, ImageQualityLabel } from "@/lib/rex/types";

const PLATFORM_ICON: Record<TradingPlatform, LucideIcon> = {
  TradingView: CandlestickChart,
  "MetaTrader 4": LineChart,
  "MetaTrader 5": BarChart3,
  cTrader: Layers,
  "Unknown Trading Platform": HelpCircle,
};

export function PlatformIcon({
  platform,
  className,
}: {
  platform: TradingPlatform;
  className?: string;
}) {
  const Icon = PLATFORM_ICON[platform] ?? HelpCircle;
  return <Icon className={className} />;
}

const QUALITY_STYLES: Record<ImageQualityLabel, string> = {
  Excellent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  Good: "border-sky-500/20 bg-sky-500/10 text-sky-500",
  Fair: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  Poor: "border-rose-500/20 bg-rose-500/10 text-rose-500",
};

export function QualityBadge({
  label,
  className,
}: {
  label: ImageQualityLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        QUALITY_STYLES[label],
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}

function confidenceTone(score: number) {
  if (score >= 80) return "from-emerald-500 to-emerald-400";
  if (score >= 60) return "from-sky-500 to-cyan-400";
  if (score >= 40) return "from-amber-500 to-amber-400";
  return "from-rose-500 to-rose-400";
}

/** A single "Field: 98%" confidence row with an animated bar. */
export function ConfidenceRow({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{label}</span>
        <span className="font-semibold tabular-nums">{score}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", confidenceTone(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
