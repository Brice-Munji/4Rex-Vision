"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  ImageIcon,
  X,
  Sparkles,
  TrendingUp,
  Gauge,
  ShieldAlert,
  RotateCcw,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACCEPTED_UPLOAD_FORMATS } from "@/lib/dashboard-data";
import { AnalysisLoader } from "./analysis-loader";
import {
  recordAnalysis,
  type RecordAnalysisResult,
} from "@/actions/subscription";

type Stage = "idle" | "ready" | "analyzing" | "complete";

interface AiWorkspaceProps {
  /** When true, each completed analysis is counted against the daily allowance. */
  trackUsage?: boolean;
  /** Fired with the usage result after a tracked analysis completes. */
  onUsageRecorded?: (result: RecordAnalysisResult) => void;
  /** When true, the daily limit is reached — new analyses are blocked. */
  blocked?: boolean;
  /** Fired instead of analyzing when blocked (opens the What's Next experience). */
  onBlocked?: () => void;
}

export function AiWorkspace({
  trackUsage,
  onUsageRecorded,
  blocked,
  onBlocked,
}: AiWorkspaceProps = {}) {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [dragging, setDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleAnalysisComplete() {
    setStage("complete");
    if (trackUsage) {
      recordAnalysis().then((res) => {
        if (res.ok) onUsageRecorded?.(res);
      });
    }
  }

  function handleFiles(files: FileList | null) {
    if (blocked) {
      onBlocked?.();
      return;
    }
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a PNG, JPG or JPEG chart screenshot.");
      return;
    }
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage("ready");
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <section className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">AI Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Upload a chart and let the AI build your report.
            </p>
          </div>
        </div>
        {stage !== "idle" && stage !== "analyzing" && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            New
          </Button>
        )}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {/* IDLE — drag & drop */}
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                onClick={() => {
                  if (blocked) onBlocked?.();
                  else inputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all",
                  dragging
                    ? "border-sky-500/60 bg-sky-500/10"
                    : "border-border hover:border-sky-500/40 hover:bg-secondary/40"
                )}
              >
                <motion.div
                  animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/30"
                >
                  <UploadCloud className="h-8 w-8" />
                </motion.div>
                <p className="mt-5 text-base font-semibold">
                  Drag & drop your chart here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or <span className="text-sky-500">browse files</span> to upload
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {ACCEPTED_UPLOAD_FORMATS.map((f) => (
                    <Badge key={f} variant="outline">
                      {f}
                    </Badge>
                  ))}
                </div>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </motion.div>
          )}

          {/* READY — preview + analyze */}
          {stage === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5 sm:flex-row sm:items-center"
            >
              <div className="relative w-full overflow-hidden rounded-2xl border border-border sm:w-64">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Chart preview"
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-secondary">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={reset}
                  aria-label="Remove"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Ready to analyze
                </div>
                <p className="mt-2 truncate text-sm font-medium">{fileName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The AI will detect structure, patterns, news and probability.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    if (blocked) onBlocked?.();
                    else setStage("analyzing");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </Button>
              </div>
            </motion.div>
          )}

          {/* ANALYZING — premium sequence */}
          {stage === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              <AnalysisLoader onComplete={handleAnalysisComplete} />
            </motion.div>
          )}

          {/* COMPLETE — mock result */}
          {stage === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-500">
                  <Sparkles className="h-4 w-4" />
                  Analysis complete · EUR/USD · H1
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Stat icon={TrendingUp} label="Bias" value="Bullish" accent="text-emerald-500" />
                  <Stat icon={Gauge} label="Confidence" value="84%" accent="text-sky-500" />
                  <Stat icon={ShieldAlert} label="Risk" value="Moderate" accent="text-amber-500" />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Price is consolidating above key support with rising momentum. A
                  breakout above 1.0920 favors continuation toward 1.0985.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <Link href="/history">View Full Report</Link>
                  </Button>
                  <Button variant="secondary" onClick={reset}>
                    <RotateCcw className="h-4 w-4" />
                    Analyze another
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-semibold", accent)}>{value}</div>
    </div>
  );
}
