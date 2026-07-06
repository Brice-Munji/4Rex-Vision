"use client";

import { motion } from "framer-motion";
import {
  ImageOff,
  Check,
  RotateCcw,
  CandlestickChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartClassification } from "@/lib/rex/vision";

const GUIDANCE = [
  "Upload a TradingView screenshot",
  "Upload a MetaTrader chart",
  "Upload a cTrader chart",
  "Include candlesticks",
  "Keep the timeframe visible",
  "Keep the currency pair visible",
  "Avoid heavy cropping",
];

export function UnsupportedChart({
  classification,
  onRetry,
}: {
  classification?: ChartClassification;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl glass p-8 text-center sm:p-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[90px]" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.15]" />
      </div>

      {/* illustration */}
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-amber-500"
        >
          <ImageOff className="h-9 w-9" />
        </motion.div>
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg">
          <CandlestickChart className="h-5 w-5" />
        </span>
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        Rex couldn&apos;t detect a supported Forex chart
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        To protect your trust, Rex never analyzes an image it can&apos;t confidently
        recognize as a trading chart. Here&apos;s how to get a great read:
      </p>

      <ul className="mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-2">
        {GUIDANCE.map((g) => (
          <li
            key={g}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/80">{g}</span>
          </li>
        ))}
      </ul>

      {classification?.reasons?.length ? (
        <p className="mx-auto mt-5 max-w-md text-xs text-muted-foreground">
          What Rex saw: {classification.reasons.join(" · ")}
        </p>
      ) : null}

      <Button size="lg" className="mt-7" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" />
        Upload Another Chart
      </Button>
    </motion.div>
  );
}
