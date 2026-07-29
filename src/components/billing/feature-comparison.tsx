"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPARISON_GROUPS, type ComparisonRow } from "@/lib/plans";

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={cn("text-sm", highlight ? "font-medium text-foreground" : "text-muted-foreground")}>
        {value}
      </span>
    );
  }
  return value ? (
    <span
      className={cn(
        "mx-auto flex h-6 w-6 items-center justify-center rounded-full",
        highlight ? "bg-primary/10 text-primary" : "bg-sky-500/10 text-sky-500"
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}

export function FeatureComparison() {
  return (
    <div className="overflow-hidden rounded-3xl glass">
      {/* header */}
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2 border-b border-border/60 px-5 py-4 sm:px-7">
        <span className="text-sm font-semibold">Compare plans</span>
        <span className="text-center text-sm font-semibold">Explorer</span>
        <span className="text-center text-sm font-semibold text-sky-500">Vision Pro</span>
        <span className="text-center text-sm font-semibold">Vision Elite</span>
      </div>

      <div>
        {COMPARISON_GROUPS.map((group) => (
          <div key={group.group}>
            <div className="bg-secondary/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-7">
              {group.group}
            </div>
            {group.rows.map((row: ComparisonRow, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2 border-b border-border/40 px-5 py-3.5 last:border-0 sm:px-7"
              >
                <span className="text-sm text-foreground/90">{row.feature}</span>
                <div className="text-center">
                  <Cell value={row.explorer} />
                </div>
                <div className="rounded-lg bg-sky-500/[0.04] py-1 text-center">
                  <Cell value={row.pro} highlight />
                </div>
                <div className="text-center">
                  <Cell value={row.elite} />
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
