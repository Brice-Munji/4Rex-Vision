import type { RexReport } from "@/lib/rex/types";
import type { TradeSetupResult } from "@/lib/rex/trade-setup";
import { displayTimeframe } from "@/lib/rex/pair-integrity";

/**
 * Client-side PDF export for a Rex analysis report. Builds a branded, multi-page
 * A4 document from the LIVE report data (nothing is hardcoded) using jsPDF's
 * vector text (crisp, selectable, small file). jsPDF is imported dynamically so
 * it never lands in the initial bundle.
 */

const BRAND: [number, number, number] = [59, 130, 246]; // #3B82F6
const INK: [number, number, number] = [23, 23, 23];
const MUTED: [number, number, number] = [120, 120, 120];
const RULE: [number, number, number] = [226, 226, 226];
const OK: [number, number, number] = [16, 163, 74];
const WARN: [number, number, number] = [217, 119, 6];
const DANGER: [number, number, number] = [220, 38, 38];

const DISCLAIMER =
  "4RexVision provides educational market analysis and trade-planning zones, not financial advice. Trade at your own risk.";

function tfLabel(report: RexReport): string {
  if (report.analysisContext && !report.analysisContext.timeframeKnown) return "Unknown";
  return report.analysisContext?.timeframeLabel ?? displayTimeframe(report.timeframe);
}

function safeName(s: string): string {
  return (s || "report").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function generateRexReportPdf(
  report: RexReport,
  tradeSetup?: TradeSetupResult | null
): Promise<void> {
  const doc = await buildRexReportPdfDoc(report, tradeSetup);
  const filename = `4RexVision-${safeName(report.pair)}-${safeName(tfLabel(report))}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Builds the jsPDF document (no download). Separated so it can be exercised in
 * tests headlessly; `generateRexReportPdf` wraps it and triggers the download.
 */
export async function buildRexReportPdfDoc(
  report: RexReport,
  tradeSetup?: TradeSetupResult | null
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48; // margin
  const contentW = pageW - M * 2;
  const BOTTOM = pageH - 56; // keep clear of the footer
  let y = M;

  /* ── low-level helpers ─────────────────────────────────────────────────── */
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold" | "italic" = "normal", size = 10) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  function runningHeader() {
    font("bold", 11);
    setColor(BRAND);
    doc.text("4RexVision", M, 34);
    font("normal", 8);
    setColor(MUTED);
    doc.text("Rex Analysis Report", pageW - M, 34, { align: "right" });
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.6);
    doc.line(M, 42, pageW - M, 42);
    y = 60;
  }

  function newPage() {
    doc.addPage();
    runningHeader();
  }

  function ensure(h: number) {
    if (y + h > BOTTOM) newPage();
  }

  function paragraph(text: string, opts?: { size?: number; color?: [number, number, number]; gap?: number; style?: "normal" | "italic" | "bold" }) {
    if (!text) return;
    const size = opts?.size ?? 10;
    font(opts?.style ?? "normal", size);
    setColor(opts?.color ?? INK);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lh = size * 1.35;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, M, y);
      y += lh;
    }
    y += opts?.gap ?? 4;
  }

  function sectionTitle(text: string) {
    ensure(30);
    y += 6;
    font("bold", 12);
    setColor(INK);
    doc.text(text, M, y);
    y += 6;
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.setLineWidth(1.4);
    doc.line(M, y, M + 34, y);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.6);
    doc.line(M + 40, y, pageW - M, y);
    y += 14;
  }

  function kvRow(label: string, value: string, valueColor?: [number, number, number]) {
    if (value == null || value === "") return;
    const lh = 15;
    const labelW = 130;
    font("bold", 10);
    setColor(MUTED);
    const lLines = doc.splitTextToSize(label, labelW - 8) as string[];
    font("normal", 10);
    setColor(valueColor ?? INK);
    const vLines = doc.splitTextToSize(value, contentW - labelW) as string[];
    const rows = Math.max(lLines.length, vLines.length);
    ensure(rows * lh + 2);
    font("bold", 10);
    setColor(MUTED);
    lLines.forEach((l, i) => doc.text(l, M, y + i * lh));
    font("normal", 10);
    setColor(valueColor ?? INK);
    vLines.forEach((l, i) => doc.text(l, M + labelW, y + i * lh));
    y += rows * lh + 2;
  }

  function bullet(text: string, opts?: { color?: [number, number, number] }) {
    if (!text) return;
    const size = 9.5;
    font("normal", size);
    setColor(opts?.color ?? INK);
    const indent = 14;
    const lines = doc.splitTextToSize(text, contentW - indent) as string[];
    const lh = size * 1.35;
    ensure(lines.length * lh);
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.circle(M + 3, y - 3, 1.6, "F");
    lines.forEach((l, i) => doc.text(l, M + indent, y + i * lh));
    y += lines.length * lh + 3;
  }

  function labeledBlock(label: string, body: string) {
    if (!body) return;
    font("bold", 10);
    setColor(INK);
    const lh = 13.5;
    ensure(lh);
    doc.text(label, M, y);
    y += lh;
    paragraph(body, { size: 9.5, color: [60, 60, 60], gap: 8 });
  }

  const biasColor = (b: string): [number, number, number] =>
    b === "Bullish" ? OK : b === "Bearish" ? DANGER : WARN;

  /* ── Cover header (page 1) ─────────────────────────────────────────────── */
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, pageW, 6, "F");
  font("bold", 22);
  setColor(BRAND);
  doc.text("4RexVision", M, 78);
  font("normal", 11);
  setColor(MUTED);
  doc.text("Rex Analysis Report", M, 96);
  const genLabel = report.generatedAtLabel && report.generatedAtLabel !== "Just now"
    ? report.generatedAtLabel
    : new Date().toLocaleString();
  doc.text(genLabel, pageW - M, 96, { align: "right" });
  doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
  doc.setLineWidth(0.8);
  doc.line(M, 108, pageW - M, 108);
  y = 128;

  // Headline verdict
  paragraph(report.headline, { size: 13, color: INK, style: "bold", gap: 10 });

  /* ── Analysis summary ──────────────────────────────────────────────────── */
  sectionTitle("Analysis Summary");
  kvRow("Currency pair", report.pair);
  kvRow("Timeframe", tfLabel(report));
  if (report.currentPrice) kvRow("Current price", String(report.currentPrice));
  kvRow(
    "Market bias",
    `${report.bias.bias}  (${report.bias.confidence}% confidence)`,
    biasColor(report.bias.bias)
  );
  if (report.bias.suggestedDirection) kvRow("Suggested direction", report.bias.suggestedDirection);
  if (report.chartSource && report.chartSource !== "Unknown") kvRow("Chart platform", report.chartSource);
  kvRow("Overall confidence", `${report.overallConfidence}%`);
  if (report.visionConfidence) kvRow("Vision confidence", `${report.visionConfidence.overall}%`);
  kvRow("Source", report.aiPowered ? "Live AI vision" : "Sample analysis");
  if (report.confidenceNote) paragraph(report.confidenceNote, { size: 9, color: WARN, gap: 6 });

  /* ── Trend & bias (price-action analysis) ──────────────────────────────── */
  sectionTitle("Technical / Price-Action Analysis");
  labeledBlock(
    `Trend — ${report.trend.direction} (${report.trend.strength})`,
    report.trend.summary
  );
  labeledBlock(`Market bias — ${report.bias.bias}`, report.bias.summary);

  /* ── Confidence breakdown ──────────────────────────────────────────────── */
  if (report.confidence?.length) {
    sectionTitle("Confidence Breakdown");
    kvRow("Overall", `${report.overallConfidence}%`);
    for (const m of report.confidence) {
      kvRow(m.label, `${m.score}%${m.contributors?.length ? " — " + m.contributors.join(", ") : ""}`);
    }
  }

  /* ── Vision confidence ─────────────────────────────────────────────────── */
  if (report.visionConfidence?.metrics?.length) {
    sectionTitle("Vision Confidence");
    kvRow("Overall", `${report.visionConfidence.overall}%`);
    for (const m of report.visionConfidence.metrics) {
      kvRow(m.label, `${m.score}%${m.note ? " — " + m.note : ""}`);
    }
  }

  /* ── Key levels ────────────────────────────────────────────────────────── */
  if (report.priceLevels?.length) {
    sectionTitle("Key Levels — Support / Resistance / Setup");
    for (const l of report.priceLevels) {
      labeledBlock(`${l.type}: ${l.value}`, l.description || "");
    }
  }

  /* ── Evidence ──────────────────────────────────────────────────────────── */
  if (report.evidence?.length) {
    sectionTitle("Why Rex Thinks This — Evidence");
    for (const e of report.evidence) labeledBlock(e.label, e.explanation);
  }

  /* ── Plain english ─────────────────────────────────────────────────────── */
  if (report.plainEnglish?.length) {
    sectionTitle("In Plain English");
    for (const p of report.plainEnglish) {
      if (p.technical) paragraph(p.technical, { size: 9.5, color: INK, style: "bold", gap: 2 });
      if (p.plain) paragraph(p.plain, { size: 9.5, color: [70, 70, 70], gap: 8 });
    }
  }

  /* ── Educational insight ───────────────────────────────────────────────── */
  if (report.insight?.body) {
    sectionTitle(report.insight.title || "Educational Insight");
    paragraph(report.insight.body, { size: 10, color: [60, 60, 60], gap: 6 });
  }

  /* ── What could change ─────────────────────────────────────────────────── */
  if (report.whatCouldChange?.length) {
    sectionTitle("What Could Change This Read");
    for (const w of report.whatCouldChange) bullet(`${w.label}: ${w.detail}`);
  }

  /* ── News / economic context ───────────────────────────────────────────── */
  if (report.economic?.length) {
    sectionTitle("News / Economic Context (risk only)");
    paragraph(
      "News is shown as a risk warning only. It never determines the technical bias or trade direction.",
      { size: 8.5, color: MUTED, gap: 6, style: "italic" }
    );
    for (const ev of report.economic) {
      const head = `${ev.currency} · ${ev.title} — ${ev.impact} impact · ${ev.time} · ${ev.session}`;
      labeledBlock(head, ev.explanation || "");
    }
  }

  /* ── Rex Trade Setup (only if generated) ───────────────────────────────── */
  if (tradeSetup) writeTradeSetup(tradeSetup);

  /* ── Closing note ──────────────────────────────────────────────────────── */
  if (report.closingNote) {
    sectionTitle("Closing Note");
    paragraph(report.closingNote, { size: 9.5, color: [70, 70, 70], gap: 4 });
  }

  /* ── Footers (page X of Y + disclaimer) ────────────────────────────────── */
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.6);
    doc.line(M, pageH - 40, pageW - M, pageH - 40);
    font("normal", 7.5);
    setColor(MUTED);
    const disc = doc.splitTextToSize(DISCLAIMER, contentW - 60) as string[];
    disc.forEach((l, i) => doc.text(l, M, pageH - 28 + i * 9));
    doc.text(`Page ${p} of ${total}`, pageW - M, pageH - 28, { align: "right" });
  }

  return doc;

  /* ── trade-setup writer (closure over doc/helpers) ─────────────────────── */
  function writeTradeSetup(setup: TradeSetupResult) {
    sectionTitle("Rex Trade Setup (Advanced Price Action)");
    if (setup.kind === "none") {
      paragraph(setup.reason, { size: 10, color: WARN, gap: 4 });
      kvRow("News risk (warning only)", setup.newsRisk);
      return;
    }
    if (setup.kind === "neutral") {
      paragraph("Neutral market — no directional setup available.", {
        size: 10,
        color: WARN,
        style: "bold",
        gap: 6,
      });
      if (setup.upperZone) kvRow("Upper breakout / watch", setup.upperZone);
      if (setup.lowerZone) kvRow("Lower breakout / watch", setup.lowerZone);
      if (setup.keyResistance) kvRow("Key resistance", setup.keyResistance);
      if (setup.keySupport) kvRow("Key support", setup.keySupport);
      kvRow("News risk (warning only)", setup.newsRisk);
      if (setup.requiredConfirmation?.length) {
        y += 2;
        font("bold", 10);
        setColor(INK);
        ensure(14);
        doc.text("APA confirmation required first", M, y);
        y += 14;
        for (const r of setup.requiredConfirmation) bullet(r);
      }
      return;
    }
    // directional
    kvRow("Bias", setup.bias, biasColor(setup.bias));
    kvRow("Setup quality", setup.quality);
    kvRow("Risk / Reward", setup.riskReward);
    kvRow("Entry zone", setup.entryZone);
    kvRow("Invalidation (structural)", setup.invalidationZone);
    kvRow(`Target 1 — ${setup.target1Label}`, setup.target1);
    kvRow(`Target 2 — ${setup.target2Label}`, setup.target2);
    kvRow("News risk (warning only)", setup.newsRisk);
    if (setup.confluence?.length) {
      y += 2;
      font("bold", 10);
      setColor(INK);
      ensure(14);
      doc.text("APA confluence", M, y);
      y += 14;
      for (const c of setup.confluence) bullet(c);
    }
    if (setup.lowerTimeframeConfirmation?.length) {
      y += 2;
      font("bold", 10);
      setColor(INK);
      ensure(14);
      doc.text("Lower-timeframe confirmation (scalping)", M, y);
      y += 14;
      for (const c of setup.lowerTimeframeConfirmation) bullet(c);
    }
    if (setup.invalidationExplainer) paragraph(setup.invalidationExplainer, { size: 9, color: [70, 70, 70], gap: 4 });
    if (setup.managementNote) paragraph(setup.managementNote, { size: 9, color: [70, 70, 70], gap: 4 });
  }
}
