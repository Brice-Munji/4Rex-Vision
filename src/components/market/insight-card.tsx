"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { RexInsight } from "@/lib/market/types";
import { cardVariants } from "./card";
import { InsightSkeleton } from "./skeletons";

export function InsightCard({ insight }: { insight: RexInsight | null }) {
  return (
    <motion.section
      variants={cardVariants}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[24px] border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-7"
    >
      {/* soft blue glow accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_28px_-8px_rgba(59,130,246,0.7)]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
              Rex Insight of the Day
            </h3>
          </div>
          <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-foreground">
            {insight ? insight.text : <InsightSkeleton />}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
