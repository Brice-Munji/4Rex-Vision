"use client";

/**
 * Sprint P0 — Validation banner.
 *
 * Shown before every analysis so the trader can clearly see which pair Rex is
 * analyzing: "Analyzing AUDUSD • 1H • TradingView".
 */

import { ScanLine } from "lucide-react";

/** Minimal shape the banner needs — AnalysisContext satisfies this structurally. */
export interface AnalysisBannerContext {
  symbol: string;
  timeframeLabel: string;
  platform: string;
}

export function AnalysisBanner({
  context,
  className,
}: {
  context: AnalysisBannerContext;
  className?: string;
}) {
  const parts = [
    context.symbol,
    context.timeframeLabel && context.timeframeLabel !== "—" ? context.timeframeLabel : null,
    context.platform && context.platform !== "Unknown Trading Platform"
      ? context.platform
      : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 ${className ?? ""}`}
      role="status"
      aria-label={`Analyzing ${parts.join(" ")}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ScanLine className="h-4 w-4" />
      </span>
      <p className="text-sm font-medium text-foreground">
        <span className="text-muted-foreground">Analyzing </span>
        {parts.map((p, i) => (
          <span key={p}>
            <span className={i === 0 ? "font-semibold text-primary" : ""}>{p}</span>
            {i < parts.length - 1 && (
              <span className="mx-1.5 text-muted-foreground">•</span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
