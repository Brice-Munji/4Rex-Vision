"use client";

/**
 * Sprint P0 — Correlation Check card.
 *
 * Rendered only when positively-correlated pairs diverge. Contradictory
 * correlated signals are never shown without this mandatory explanation.
 */

import { motion } from "framer-motion";
import { GitBranch, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { CorrelationCheck, MarketBias } from "@/lib/rex/types";

function BiasTag({ bias }: { bias: MarketBias }) {
  const map = {
    Bullish: { cls: "bg-emerald-500/10 text-emerald-500", Icon: ArrowUpRight },
    Bearish: { cls: "bg-red-500/10 text-red-500", Icon: ArrowDownRight },
    Neutral: { cls: "bg-muted text-muted-foreground", Icon: Minus },
  }[bias];
  const Icon = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${map.cls}`}>
      <Icon className="h-3 w-3" />
      {bias}
    </span>
  );
}

export function CorrelationCheckCard({ correlation }: { correlation: CorrelationCheck }) {
  if (!correlation.hasDivergence) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6 sm:p-7"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <GitBranch className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">{correlation.title}</h3>
          <p className="text-xs text-muted-foreground">
            A temporary divergence between normally correlated pairs.
          </p>
        </div>
      </div>

      {correlation.explanation && (
        <div className="mt-4 space-y-1.5 text-sm text-foreground/90">
          {correlation.explanation.split("\n").map((line, i) => (
            <p key={i} className={line.startsWith("-") ? "pl-1 text-muted-foreground" : ""}>
              {line}
            </p>
          ))}
        </div>
      )}

      {correlation.correlated.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {correlation.correlated.map((c) => (
            <span
              key={c.pair}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium">{c.pair}</span>
              <BiasTag bias={c.bias} />
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
