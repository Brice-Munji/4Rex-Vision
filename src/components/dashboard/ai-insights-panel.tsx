"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Brain } from "lucide-react";
import { AI_INSIGHTS } from "@/lib/dashboard-data";

export function AiInsightsPanel() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % AI_INSIGHTS.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl glass p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full" />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">AI Insights</h2>
          <p className="text-xs text-muted-foreground">Personalized guidance</p>
        </div>
      </div>

      <div className="relative mt-5 min-h-[92px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3"
          >
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-base font-medium leading-relaxed text-foreground/90">
              {AI_INSIGHTS[index]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* progress dots */}
      <div className="mt-5 flex gap-1.5">
        {AI_INSIGHTS.map((_, i) => (
          <button
            key={i}
            aria-label={`Insight ${i + 1}`}
            onClick={() => setIndex(i)}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
          >
            <motion.span
              className="block h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: i === index ? "100%" : "0%" }}
              transition={{ duration: i === index ? 5 : 0.3, ease: "linear" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
