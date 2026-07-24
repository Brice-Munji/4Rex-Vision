"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Info,
  Clock,
  DollarSign,
  Tag,
  LineChart,
  Layers,
  ImageIcon,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  ScanEye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformIcon, QualityBadge, ConfidenceRow } from "./metadata-visuals";
import type { ChartMetadata } from "@/lib/rex/types";

function Field({
  icon,
  label,
  value,
  accent,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.07 }}
      className="rounded-2xl border border-border/60 bg-card/40 p-4"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg", accent ?? "bg-sky-500/10 text-sky-500")}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </motion.div>
  );
}

export function MetadataSummaryCard({
  metadata,
  onContinue,
  onReset,
}: {
  metadata: ChartMetadata;
  onContinue: () => void;
  onReset: () => void;
}) {
  const {
    platform,
    marketType,
    instrument,
    timeframe,
    currentPrice,
    imageQuality,
    visibleIndicators,
    aiPowered,
    instrumentSupported,
    notes,
  } = metadata;

  const recognized = aiPowered && !!instrument;
  // Continue is allowed for supported instruments, or in sample/fallback mode.
  const canContinue = !aiPowered || instrumentSupported;

  const fields: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    accent?: string;
  }[] = [];

  fields.push({
    icon: <PlatformIcon platform={platform} className="h-3.5 w-3.5" />,
    label: "Platform",
    value: platform,
    accent: "bg-indigo-500/10 text-indigo-400",
  });
  if (instrument) {
    fields.push({
      icon: <Tag className="h-3.5 w-3.5" />,
      label: "Instrument",
      value: instrument,
      accent: "bg-sky-500/10 text-sky-500",
    });
  }
  if (marketType) {
    fields.push({
      icon: <LineChart className="h-3.5 w-3.5" />,
      label: "Market",
      value: marketType,
      accent: "bg-violet-500/10 text-violet-400",
    });
  }
  fields.push({
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Timeframe",
    value: timeframe ?? (
      <span className="text-sm font-medium text-muted-foreground">
        Timeframe not visible.
      </span>
    ),
    accent: "bg-cyan-500/10 text-cyan-500",
  });
  fields.push({
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: "Current Price",
    value: currentPrice ?? (
      <span className="text-sm font-medium text-muted-foreground">
        Unable to determine.
      </span>
    ),
    accent: "bg-emerald-500/10 text-emerald-500",
  });
  fields.push({
    icon: <ImageIcon className="h-3.5 w-3.5" />,
    label: "Image Quality",
    value: <QualityBadge label={imageQuality.label} />,
    accent: "bg-amber-500/10 text-amber-500",
  });

  // Confidence breakdown rows (only detected items; image quality always).
  const rows: { label: string; score: number }[] = [];
  if (aiPowered && platform !== "Unknown Trading Platform")
    rows.push({ label: "Platform Detection", score: metadata.platformConfidence });
  if (instrument) rows.push({ label: "Currency Pair", score: metadata.instrumentConfidence });
  if (timeframe) rows.push({ label: "Timeframe", score: metadata.timeframeConfidence });
  if (currentPrice) rows.push({ label: "Current Price", score: metadata.priceConfidence });
  rows.push({ label: "Image Quality", score: imageQuality.score });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-[80px]" />
      </div>

      {/* header */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
            recognized
              ? "bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-emerald-500/25"
              : "bg-gradient-to-br from-sky-500 to-cyan-400 shadow-sky-500/25"
          )}
        >
          {recognized ? <CheckCircle2 className="h-6 w-6" /> : <ScanEye className="h-6 w-6" />}
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {recognized ? "Chart Successfully Recognized" : "Chart Read"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {recognized
              ? "Here's what Rex read from your chart before analyzing it."
              : "Rex measured your image and read what it could confidently see."}
          </p>
        </div>
        <span className="ml-auto hidden shrink-0 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300 sm:inline">
          {metadata.overallConfidence}% overall
        </span>
      </div>

      {/* detected fields */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f, i) => (
          <Field key={f.label} index={i} icon={f.icon} label={f.label} value={f.value} accent={f.accent} />
        ))}
      </div>

      {/* visible indicators */}
      {visibleIndicators.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-4">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
            <Layers className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Visible Indicators</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {visibleIndicators.map((ind, i) => (
                <span
                  key={`${ind}-${i}`}
                  className="rounded-full border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-xs font-medium"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* recognition confidence */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-5">
        <h3 className="text-sm font-semibold">Recognition Confidence</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <ConfidenceRow key={r.label} label={r.label} score={r.score} />
          ))}
        </div>
        <div className="mt-4 border-t border-border/60 pt-3">
          <ConfidenceRow label="Overall Metadata Confidence" score={metadata.overallConfidence} />
        </div>
      </div>

      {/* image quality issues */}
      {imageQuality.issues.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Image notes</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {imageQuality.issues.map((iss, i) => (
                <li key={`${iss}-${i}`}>{iss}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* metadata notes (never-guess honesty) */}
      {notes.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <ul className="space-y-0.5">
            {notes.map((n, i) => (
              <li key={`${n}-${i}`}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {/* actions */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {canContinue ? (
          <Button size="lg" onClick={onContinue}>
            Continue to Analysis
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex-1 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            This instrument isn&apos;t supported for analysis yet. Upload a Forex
            or Gold chart to continue.
          </div>
        )}
        <Button size="lg" variant="secondary" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Upload Another Chart
        </Button>
      </div>
    </motion.div>
  );
}
