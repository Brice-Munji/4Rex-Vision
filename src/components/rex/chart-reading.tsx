"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const READ_STAGES = [
  "Reading chart",
  "Detecting platform",
  "Reading currency pair",
  "Detecting timeframe",
  "Reading current price",
  "Inspecting image quality",
];

/**
 * Rex Chart Reader progress — an OCR-style reading sequence with skeleton
 * placeholders shown while the metadata is being extracted.
 */
export function ChartReading({
  onComplete,
  stageDuration = 560,
}: {
  onComplete?: () => void;
  stageDuration?: number;
}) {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (current >= READ_STAGES.length) {
      const t = setTimeout(() => onComplete?.(), 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), stageDuration);
    return () => clearTimeout(t);
  }, [current, stageDuration, onComplete]);

  const progress = Math.min(100, (current / READ_STAGES.length) * 100);
  const activeLabel = READ_STAGES[Math.min(current, READ_STAGES.length - 1)];

  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-400/20 blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <ScanText className="h-8 w-8 text-white" />
            </motion.div>
          </div>
        </div>
        <h3 className="mt-5 text-lg font-semibold">Rex is reading your chart</h3>
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
              {current >= READ_STAGES.length ? "Preparing summary…" : `${activeLabel}…`}
            </motion.p>
          </AnimatePresence>
        </div>
        <Progress value={progress} className="mt-4 w-full max-w-md" />
      </div>

      <div className="mx-auto mt-7 grid max-w-lg gap-1.5 sm:grid-cols-2">
        {READ_STAGES.map((stage, i) => {
          const status = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: status === "pending" ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                status === "active" && "bg-sky-500/10"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  status === "done" &&
                    "border-transparent bg-gradient-to-br from-emerald-500 to-emerald-400 text-white",
                  status === "active" && "border-sky-500/40 bg-sky-500/10 text-sky-500",
                  status === "pending" && "border-border text-muted-foreground"
                )}
              >
                {status === "done" ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : status === "active" ? (
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-sky-500"
                    animate={{ scale: [1, 1.6, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                ) : (
                  <span className="text-[9px]">{i + 1}</span>
                )}
              </span>
              <span className="font-medium">{stage}</span>
            </motion.div>
          );
        })}
      </div>

      {/* skeleton preview of the metadata card being assembled */}
      <div className="mx-auto mt-7 grid max-w-lg gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
