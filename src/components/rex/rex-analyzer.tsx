"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, Sparkles, ImageIcon, FileCheck2, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RexThinking } from "./rex-thinking";
import { RexReport } from "./rex-report";
import { UploadValidationSummary } from "./upload-validation";
import { UnsupportedChart } from "./unsupported-chart";
import { ChartReading } from "./chart-reading";
import { MetadataSummaryCard } from "./metadata-summary-card";
import { MetadataFailure } from "./metadata-failure";
import { AnalysisBanner } from "./analysis-banner";
import { displayTimeframe } from "@/lib/rex/pair-integrity";
import { rex } from "@/lib/rex/mock-pipeline";
import type {
  RexReport as RexReportType,
  UploadMeta,
  UploadValidation,
  ChartMetadata,
} from "@/lib/rex/types";
import { analyzeChart, type AnalyzeResult } from "@/actions/analyze";
import type { ChartClassification } from "@/lib/rex/vision";
import { ExplorerLimit } from "@/components/dashboard/explorer-limit";
import { WhatsNext } from "./whats-next";
import type { Plan } from "@prisma/client";

const ACCEPTED = ["PNG", "JPG", "JPEG", "High Resolution"];

type Stage =
  | "idle"
  | "ready"
  | "reading"
  | "metadata"
  | "metadata-failure"
  | "pair-not-detected"
  | "thinking"
  | "report"
  | "unsupported"
  | "unavailable";

interface RexAnalyzerProps {
  usage?: { plan: Plan; used: number; limit: number; unlimited: boolean };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function RexAnalyzer({ usage }: RexAnalyzerProps) {
  const [stage, setStage] = React.useState<Stage>("idle");
  const [dragging, setDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<UploadMeta | null>(null);
  const [validation, setValidation] = React.useState<UploadValidation | null>(null);
  const [report, setReport] = React.useState<RexReportType | null>(null);
  const [metadata, setMetadata] = React.useState<ChartMetadata | null>(null);
  const [classification, setClassification] = React.useState<ChartClassification | undefined>();
  const [pairNotDetected, setPairNotDetected] = React.useState<{ title: string; message: string } | null>(null);
  const [usedState, setUsedState] = React.useState(usage?.used ?? 0);
  const [whatsNextOpen, setWhatsNextOpen] = React.useState(false);
  const [resetAt, setResetAt] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<File | null>(null);
  const resultRef = React.useRef<Promise<AnalyzeResult> | null>(null);

  const trackUsage = !!usage && !usage.unlimited;
  // Client-side hint only — the backend remains the source of truth and will
  // block a 4th analysis regardless of what the UI thinks.
  const limitReached =
    trackUsage && !!usage && usage.limit > 0 && usedState >= usage.limit;

  function openWhatsNext(nextResetAt?: string | null) {
    if (nextResetAt) setResetAt(nextResetAt);
    setWhatsNextOpen(true);
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMeta(null);
    setValidation(null);
    setReport(null);
    setMetadata(null);
    setClassification(undefined);
    setPairNotDetected(null);
    fileRef.current = null;
    resultRef.current = null;
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFiles(files: FileList | null) {
    // Limit reached → never send the image for analysis; open What's Next.
    if (limitReached) {
      openWhatsNext();
      return;
    }
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a PNG, JPG or JPEG chart screenshot.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const m: UploadMeta = {
        fileName: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeBytes: file.size,
      };
      fileRef.current = file;
      setMeta(m);
      setValidation(rex.validateUpload(m));
      setPreview(url);
      setStage("ready");
    };
    img.onerror = () => {
      toast.error("Could not read that image. Try another screenshot.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function startAnalysis() {
    if (!meta || !fileRef.current) return;
    const file = fileRef.current;
    // The Chart Reader runs first: kick off the pipeline while the reading
    // sequence animates.
    resultRef.current = (async () => {
      const base64 = await fileToBase64(file);
      return analyzeChart({
        base64,
        fileName: meta.fileName,
        sizeBytes: meta.sizeBytes,
      });
    })();
    setStage("reading");
  }

  // Chart Reader finished → decide whether to show the metadata card,
  // the failure screen, or stop for an unsupported/invalid upload.
  async function handleReadingComplete() {
    let result: AnalyzeResult | null = null;
    try {
      result = (await resultRef.current) ?? null;
    } catch {
      result = null;
    }

    if (!result) {
      toast.error("Rex couldn't read that chart. Please try again.");
      reset();
      return;
    }

    if (result.status === "invalid") {
      toast.error(result.reason);
      setStage("ready");
      return;
    }

    if (result.status === "unsupported") {
      setClassification(result.classification);
      setStage("unsupported");
      return;
    }

    // Vision providers configured but the request failed. Show a soft error —
    // never claim the upload isn't a chart.
    if (result.status === "unavailable") {
      setStage("unavailable");
      return;
    }

    // Strict validation: the pair couldn't be confidently extracted. Never guess.
    if (result.status === "pair_not_detected") {
      setPairNotDetected({ title: result.title, message: result.message });
      setStage("pair-not-detected");
      return;
    }

    // Backend blocked this before any AI ran (daily limit). Open What's Next.
    if (result.status === "limit_reached") {
      if (usage) setUsedState(usage.limit);
      reset();
      openWhatsNext(result.resetAt);
      return;
    }

    // status === "ok" — the analysis ran; sync the consumed credit.
    if (result.usage) setUsedState(result.usage.used);
    setReport(result.report);
    setMetadata(result.metadata);

    // Never guess: if the live model couldn't identify the instrument, stop
    // before analysis and show guidance (Step 9).
    if (result.metadata.aiPowered && !result.metadata.instrument) {
      setStage("metadata-failure");
      return;
    }
    setStage("metadata");
  }

  // User confirmed the metadata → run the analysis thinking sequence.
  function proceedToAnalysis() {
    setStage("thinking");
  }

  // Thinking sequence finished → reveal the report. The credit was already
  // consumed server-side during analysis (single source of truth), so there's
  // nothing to record here.
  function finishAnalysis() {
    setStage("report");
  }

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="space-y-4">
      {trackUsage && usage && stage !== "report" && (
        <ExplorerLimit used={usedState} limit={usage.limit} unlimited={usage.unlimited} />
      )}

      <AnimatePresence mode="wait">
        {/* IDLE — upload */}
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl glass p-6 sm:p-8"
          >
            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight">
                Upload Your Forex Chart
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Upload a TradingView, MetaTrader or cTrader screenshot. Rex will
                inspect your chart, evaluate technical structure, combine it with
                economic context and prepare a professional market report.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (limitReached) openWhatsNext();
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
                "mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all",
                dragging
                  ? "border-primary/60 bg-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40"
              )}
            >
              <motion.div
                animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              >
                <UploadCloud className="h-8 w-8" />
              </motion.div>
              <p className="mt-5 text-base font-semibold">
                Drag &amp; drop your chart here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or <span className="text-primary">click to upload</span>
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {ACCEPTED.map((f) => (
                  <Badge key={f} variant="outline">
                    {f}
                  </Badge>
                ))}
              </div>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </motion.div>
        )}

        {/* READY — preview + validation */}
        {stage === "ready" && validation && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl glass p-6 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ready to analyze</h2>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-border">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Chart preview" className="h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-secondary">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {meta?.width}×{meta?.height}
                </span>
              </div>

              <UploadValidationSummary validation={validation} />
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={startAnalysis}>
                <Sparkles className="h-4 w-4" />
                Analyze with Rex
              </Button>
              <Button size="lg" variant="secondary" onClick={reset}>
                Upload a different chart
              </Button>
            </div>
          </motion.div>
        )}

        {/* READING — Chart Reader extracts metadata first */}
        {stage === "reading" && (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ChartReading onComplete={handleReadingComplete} />
          </motion.div>
        )}

        {/* METADATA SUMMARY — shown before the analysis thinking animation */}
        {stage === "metadata" && metadata && (
          <motion.div
            key="metadata"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {metadata.symbol && (
              <AnalysisBanner
                context={{
                  symbol: metadata.symbol,
                  timeframeLabel: displayTimeframe(metadata.timeframe),
                  platform: metadata.platform,
                }}
                className="mb-4"
              />
            )}
            <MetadataSummaryCard
              metadata={metadata}
              onContinue={proceedToAnalysis}
              onReset={reset}
            />
          </motion.div>
        )}

        {/* METADATA FAILURE — instrument not identified (never guess) */}
        {stage === "metadata-failure" && (
          <motion.div
            key="metadata-failure"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MetadataFailure metadata={metadata ?? undefined} onRetry={reset} />
          </motion.div>
        )}

        {/* PAIR NOT DETECTED — strict validation stop (never guess) */}
        {stage === "pair-not-detected" && pairNotDetected && (
          <motion.div
            key="pair-not-detected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MetadataFailure
              metadata={metadata ?? undefined}
              onRetry={reset}
              title={pairNotDetected.title}
              message={pairNotDetected.message}
            />
          </motion.div>
        )}

        {/* THINKING — full analysis sequence (after metadata confirmed) */}
        {stage === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RexThinking onComplete={finishAnalysis} />
          </motion.div>
        )}

        {/* UNSUPPORTED */}
        {stage === "unsupported" && (
          <motion.div
            key="unsupported"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <UnsupportedChart classification={classification} onRetry={reset} />
          </motion.div>
        )}

        {/* UNAVAILABLE — vision provider configured but request failed */}
        {stage === "unavailable" && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl glass p-6 text-center sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <CloudOff className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight">
              Vision service temporarily unavailable.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Rex couldn&apos;t reach the vision model just now. Your chart looks
              fine — this is a temporary service issue. Please try again in a
              moment.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="lg" onClick={startAnalysis}>
                <Sparkles className="h-4 w-4" />
                Try again
              </Button>
              <Button size="lg" variant="secondary" onClick={reset}>
                Upload a different chart
              </Button>
            </div>
          </motion.div>
        )}

        {/* REPORT */}
        {stage === "report" && report && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RexReport report={report} onReset={reset} plan={usage?.plan} />
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsNext
        open={whatsNextOpen}
        onClose={() => setWhatsNextOpen(false)}
        resetAt={resetAt}
      />
    </div>
  );
}
