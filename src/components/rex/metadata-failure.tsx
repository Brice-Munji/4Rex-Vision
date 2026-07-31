"use client";

import { motion } from "framer-motion";
import { SearchX, Check, RotateCcw, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QualityBadge } from "./metadata-visuals";
import type { ChartMetadata } from "@/lib/rex/types";

const SUGGESTIONS = [
  "Ensure the symbol / currency pair is visible.",
  "Avoid cropping the top-left corner.",
  "Upload a higher-resolution image.",
  "Use a full screenshot from the charting platform.",
];

export function MetadataFailure({
  metadata,
  onRetry,
  title = "We couldn't confidently identify the trading instrument",
  message = "Rex never guesses. Because the currency pair isn't clearly readable in this screenshot, it won't start the analysis. A clearer upload will fix this:",
}: {
  metadata?: ChartMetadata;
  onRetry: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl glass p-8 text-center sm:p-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.15]" />
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500"
      >
        <SearchX className="h-9 w-9" />
      </motion.div>

      <h2 className="mt-6 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>

      <ul className="mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <li
            key={s}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/80">{s}</span>
          </li>
        ))}
      </ul>

      {metadata && (
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          Image quality read as
          <QualityBadge label={metadata.imageQuality.label} />
        </div>
      )}

      <Button size="lg" className="mt-7" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" />
        Upload Another Chart
      </Button>
    </motion.div>
  );
}
