"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, X, Sparkles, ImageIcon, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RexThinking } from "./rex-thinking";
import { RexReport } from "./rex-report";
import { UploadValidationSummary } from "./upload-validation";
import { UnsupportedChart } from "./unsupported-chart";
import { rex } from "@/lib/rex/mock-pipeline";
import type { RexReport as RexReportType, UploadMeta, UploadValidation } from "@/lib/rex/types";
import { analyzeChart, type AnalyzeResult } from "@/actions/analyze";
import type { ChartClassification } from "@/lib/rex/vision";
import { recordAnalysis, type RecordAnalysisResult } from "@/actions/subscription";
import { ExplorerLimit } from "@/components/dashboard/explorer-limit";
import { EndOfDaySummary } from "@/components/dashboard/end-of-day-summary";
import type { Plan } from "@prisma/client";

const ACCEPTED = ["PNG", "JPG", "JPEG", "High Resolution"];

type Stage = "idle" | "ready" | "thinking" | "report" | "unsupported";

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
  const [classification, setClassification] = React.useState<ChartClassification | undefined>();
  const [usedState, setUsedState] = React.useState(usage?.used ?? 0);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<File | null>(null);
  const resultRef = React.useRef<Promise<AnalyzeResult> | null>(null);

  const trackUsage = !!usage && !usage.unlimited;

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMeta(null);
    setValidation(null);
    setReport(null);
    setClassification(undefined);
    fileRef.current = null;
    resultRef.current = null;
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFiles(files: FileList | null) {
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
    resultRef.current = (async () => {
      const base64 = await fileToBase64(file);
      return analyzeChart({
        base64,
        fileName: meta.fileName,
        sizeBytes: meta.sizeBytes,
      });
    })();
    setStage("thinking");
  }

  async function handleThinkingComplete() {
    let result: AnalyzeResult | null = null;
    try {
      result = (await resultRef.current) ?? null;
    } catch {
      result = null;
    }

    if (!result) {
      toast.error("Rex couldn't complete the analysis. Please try again.");
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

    // status === "ok"
    setReport(result.report);
    setStage("report");
    if (trackUsage) {
      recordAnalysis().then((res: RecordAnalysisResult) => {
        if (res.ok) {
          setUsedState(res.used);
          if (!res.unlimited && res.reachedLimit) setSummaryOpen(true);
        }
      });
    }
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
              onClick={() => inputRef.current?.click()}
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
                Drag &amp; drop your chart here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or <span className="text-sky-500">click to upload</span>
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

        {/* THINKING */}
        {stage === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RexThinking onComplete={handleThinkingComplete} />
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

        {/* REPORT */}
        {stage === "report" && report && (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RexReport report={report} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>

      <EndOfDaySummary open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}
