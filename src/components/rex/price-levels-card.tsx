"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { RexSection } from "./rex-section";
import { ExplainThis } from "./explain-this";
import { cn } from "@/lib/utils";
import type { PriceLevel, PriceLevelType } from "@/lib/rex/types";

const typeStyles: Record<
  PriceLevelType,
  { dot: string; text: string; chip: string }
> = {
  Resistance: { dot: "bg-rose-500", text: "text-rose-500", chip: "bg-rose-500/10 text-rose-500" },
  "Take Profit": { dot: "bg-emerald-500", text: "text-emerald-500", chip: "bg-emerald-500/10 text-emerald-500" },
  Entry: { dot: "bg-sky-500", text: "text-sky-500", chip: "bg-sky-500/10 text-sky-500" },
  Support: { dot: "bg-cyan-500", text: "text-cyan-500", chip: "bg-cyan-500/10 text-cyan-500" },
  Invalidation: { dot: "bg-amber-500", text: "text-amber-500", chip: "bg-amber-500/10 text-amber-500" },
};

export function PriceLevelsCard({
  levels,
  delay,
}: {
  levels: PriceLevel[];
  delay?: number;
}) {
  const sorted = [...levels].sort((a, b) => b.position - a.position);

  return (
    <RexSection
      sectionNo={6}
      title="Key Price Levels"
      subtitle="Where the plan lives — and where it's wrong."
      icon={<Layers className="h-5 w-5" />}
      action={<ExplainThis concept="Support" label="Explain levels" />}
      delay={delay}
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* visual ladder */}
        <div className="relative hidden min-h-[280px] rounded-3xl glass p-4 lg:block">
          <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-border" />
          {sorted.map((lvl, i) => {
            const s = typeStyles[lvl.type];
            return (
              <div
                key={`${lvl.type}-${lvl.value}-${i}`}
                className="absolute left-0 right-0 flex items-center gap-2 px-4"
                style={{ top: `${100 - lvl.position}%` }}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full ring-4 ring-background", s.dot)} />
                <span className="text-xs font-medium text-muted-foreground">{lvl.type}</span>
                <span className={cn("ml-auto text-xs font-bold tabular-nums", s.text)}>
                  {lvl.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* level cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((lvl, i) => {
            const s = typeStyles[lvl.type];
            return (
              <motion.div
                key={`${lvl.type}-${lvl.value}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl glass p-4"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.chip)}>
                    {lvl.type}
                  </span>
                  <span className={cn("text-sm font-bold tabular-nums", s.text)}>
                    {lvl.value}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {lvl.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </RexSection>
  );
}
