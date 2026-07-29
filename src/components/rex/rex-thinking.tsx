"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { THINKING_STAGES } from "@/lib/rex/mock-pipeline";

/**
 * Rex's animated thinking sequence — a deliberate, trustworthy alternative to a
 * generic spinner. Each stage completes with a check as Rex "reasons" through
 * the chart.
 */
export function RexThinking({
  onComplete,
  stageDuration = 620,
}: {
  onComplete?: () => void;
  stageDuration?: number;
}) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (current >= THINKING_STAGES.length) {
      const t = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), stageDuration);
    return () => clearTimeout(t);
  }, [current, stageDuration, onComplete]);

  const progress = Math.min(100, (current / THINKING_STAGES.length) * 100);
  const activeLabel =
    THINKING_STAGES[Math.min(current, THINKING_STAGES.length - 1)]?.label;

  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-2xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        </div>
        <h3 className="mt-5 text-lg font-semibold">Rex is analyzing your chart</h3>
        <div className="mt-1 h-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-muted-foreground"
            >
              {current >= THINKING_STAGES.length
                ? "Finalizing…"
                : `${activeLabel}…`}
            </motion.p>
          </AnimatePresence>
        </div>
        <Progress value={progress} className="mt-4 w-full max-w-md" />
      </div>

      <ul className="mx-auto mt-7 grid max-w-lg gap-1.5 sm:grid-cols-2">
        {THINKING_STAGES.map((stage, i) => {
          const status =
            i < current ? "done" : i === current ? "active" : "pending";
          return (
            <motion.li
              key={stage.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: status === "pending" ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                status === "active" && "bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  status === "done" &&
                    "border-transparent bg-emerald-500/10 text-emerald-400",
                  status === "active" && "border-primary/40 bg-primary/10 text-primary",
                  status === "pending" && "border-border text-muted-foreground"
                )}
              >
                {status === "done" ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : status === "active" ? (
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.6, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                ) : (
                  <span className="text-[9px]">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "font-medium",
                  status === "done" && "text-muted-foreground",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
