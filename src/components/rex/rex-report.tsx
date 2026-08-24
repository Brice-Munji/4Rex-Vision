"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, AlertTriangle, Download, Info, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { generateRexReportPdf } from "@/lib/pdf/rex-report-pdf";
import type { TradeSetupResult } from "@/lib/rex/trade-setup";
import { PairBadge, TimeframeBadge, BiasPill } from "./rex-visuals";
import { displayTimeframe } from "@/lib/rex/pair-integrity";
import { VisionConfidenceCard } from "./vision-confidence";
import { TrendCard } from "./trend-card";
import { BiasCard } from "./bias-card";
import { ConfidenceBreakdown } from "./confidence-breakdown";
import { EconomicContextCard } from "./economic-context-card";
import { PriceLevelsCard } from "./price-levels-card";
import { WhyRexThinks } from "./why-rex-thinks";
import { PlainEnglishCard } from "./plain-english-card";
import { EducationalInsightCard } from "./educational-insight-card";
import { AnalysisReliabilityCard } from "./analysis-reliability-card";
import { WhatCouldChange } from "./what-could-change";
import { ClosingNote } from "./closing-note";
import { AnalysisBanner } from "./analysis-banner";
import { CorrelationCheckCard } from "./correlation-check";
import type { RexReport as RexReportType } from "@/lib/rex/types";
import type { Plan } from "@prisma/client";
import { SaveToJournalButton } from "@/components/journal/save-to-journal";
import { RexTradeSetupCard } from "@/components/rex/rex-trade-setup";

export function RexReport({
  report,
  onReset,
  plan,
}: {
  report: RexReportType;
  onReset?: () => void;
  plan?: Plan;
}) {
  // The Rex Trade Setup is generated on-demand in a modal; capture the last
  // generated result so the PDF can include it when the user has one.
  const [tradeSetup, setTradeSetup] = useState<TradeSetupResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleDownloadPdf() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await generateRexReportPdf(report, tradeSetup);
    } catch {
      toast.error("Couldn't generate the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* P0 — validation banner: which pair Rex is analyzing */}
      {report.analysisContext && (
        <AnalysisBanner context={report.analysisContext} />
      )}

      {/* Report header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full" />
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Rex&apos;s Report
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  report.aiPowered
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {report.aiPowered ? "Live AI" : "Sample"}
              </span>
              <span className="text-xs text-muted-foreground">
                {report.generatedAtLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PairBadge pair={report.pair} />
              {/* Never show a fabricated timeframe: mark it "Unknown" when the
                  chart's timeframe couldn't be read. */}
              <TimeframeBadge
                timeframe={
                  report.analysisContext && !report.analysisContext.timeframeKnown
                    ? "Unknown"
                    : report.analysisContext?.timeframeLabel ??
                      displayTimeframe(report.timeframe)
                }
              />
              <BiasPill bias={report.bias.bias} />
              {report.chartSource !== "Unknown" && (
                <span className="rounded-lg border border-border bg-card/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {report.chartSource}
                </span>
              )}
              {report.currentPrice && (
                <span className="rounded-lg border border-border bg-card/40 px-2 py-0.5 text-xs font-medium">
                  @ {report.currentPrice}
                </span>
              )}
            </div>
            <p className="mt-4 max-w-xl text-lg font-medium text-foreground/90">
              {report.headline}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <SaveToJournalButton report={report} plan={plan} />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              aria-busy={pdfLoading}
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? "Preparing…" : "PDF"}
            </Button>
            {onReset && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
                New
              </Button>
            )}
          </div>
        </div>

        {report.notice && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{report.notice}</p>
          </div>
        )}

        {report.reliability.reduced && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Analysis reliability may be reduced because some chart details were
              hard to identify. Treat this report as directional and consider
              uploading a clearer screenshot.
            </p>
          </div>
        )}
      </motion.div>

      {/* Rex Trade Setup (PRO) — turn the completed analysis into trade zones.
          Captured here so the PDF export can include it once generated. */}
      <RexTradeSetupCard report={report} plan={plan} onSetupGenerated={setTradeSetup} />

      {/* Step 3 — vision confidence */}
      <VisionConfidenceCard vision={report.visionConfidence} />

      {/* Progressive report sections */}
      <TrendCard trend={report.trend} />
      <BiasCard bias={report.bias} />

      {/* P0 — correlation guard: explain any correlated-pair divergence */}
      {report.correlation?.hasDivergence && (
        <CorrelationCheckCard correlation={report.correlation} />
      )}

      <ConfidenceBreakdown
        overall={report.overallConfidence}
        metrics={report.confidence}
      />
      {report.confidenceNote && (
        <div className="-mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{report.confidenceNote}</p>
        </div>
      )}
      <EconomicContextCard events={report.economic} />
      <PriceLevelsCard levels={report.priceLevels} />
      <WhyRexThinks evidence={report.evidence} />
      <PlainEnglishCard items={report.plainEnglish} />
      <EducationalInsightCard insight={report.insight} />
      <AnalysisReliabilityCard reliability={report.reliability} />
      <WhatCouldChange items={report.whatCouldChange} />
      <ClosingNote note={report.closingNote} />
    </div>
  );
}
