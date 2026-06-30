"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { ProgressBar } from "./progress-ring";
import { AI_GROWTH } from "@/lib/billing-data";

export function AiGrowth() {
  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">AI Growth</h2>
          <p className="text-sm text-muted-foreground">
            Your long-term improvement, tracked by the AI.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {AI_GROWTH.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{m.label}</span>
              <span className="text-sm font-bold">{m.display}</span>
            </div>
            <ProgressBar value={m.value} className="mt-2" />
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-500">
              <TrendingUp className="h-3 w-3" />
              {m.trend}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
