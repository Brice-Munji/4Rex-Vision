"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { ANALYSIS_STEPS } from "@/lib/dashboard-data";

interface AnalysisLoaderProps {
  onComplete?: () => void;
  stepDuration?: number;
}

export function AnalysisLoader({
  onComplete,
  stepDuration = 850,
}: AnalysisLoaderProps) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (current >= ANALYSIS_STEPS.length) {
      const done = setTimeout(() => onComplete?.(), 600);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), stepDuration);
    return () => clearTimeout(t);
  }, [current, stepDuration, onComplete]);

  const progress = Math.min(100, (current / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-400/20 blur-xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
          </div>
        </div>
        <h3 className="mt-5 text-lg font-semibold">Analyzing your chart</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Our AI is reading the market — this only takes a moment.
        </p>
        <Progress value={progress} className="mt-5 w-full" />
      </div>

      <ul className="mt-7 space-y-1.5">
        {ANALYSIS_STEPS.map((step, i) => {
          const status =
            i < current ? "done" : i === current ? "active" : "pending";
          return (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: status === "pending" ? 0.45 : 1,
                x: 0,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                status === "active" && "bg-sky-500/10"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  status === "done" &&
                    "border-transparent bg-gradient-to-br from-emerald-500 to-emerald-400 text-white",
                  status === "active" && "border-sky-500/40 bg-sky-500/10 text-sky-500",
                  status === "pending" && "border-border text-muted-foreground"
                )}
              >
                {status === "done" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : status === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "font-medium",
                  status === "done" && "text-muted-foreground line-through decoration-muted-foreground/40",
                  status === "active" && "text-foreground",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {step}
                {status === "active" && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    …
                  </motion.span>
                )}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
