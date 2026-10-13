/**
 * Focused tests for the "Save to Smart Journal" bug fix: the top-of-report
 * save button (`save-to-journal.tsx`) must reuse an already-generated,
 * APA-validated `DirectionalSetup`'s entry/invalidation/target-1 numbers
 * instead of independently re-deriving them from the chart's raw price
 * levels — the exact divergence confirmed in the XAUUSD case study (two
 * JournalEntry rows for the same analysis, with different entry/SL/TP,
 * traced to this function bypassing `buildTradeSetup()`'s validation).
 *
 * Headless — imports the exported pure function directly from the "use
 * client" component file, same pattern as launcher.test.ts (no DOM runner in
 * this project). Run with:
 *   npx tsx src/components/journal/__tests__/save-to-journal.test.ts
 */
import { importFromReport } from "../save-to-journal";
import type { RexReport as RexReportType } from "@/lib/rex/types";
import type { DirectionalSetup, NeutralSetup, NoSetup, BlockedSetup } from "@/lib/rex/trade-setup";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

/** Minimal-but-fully-typed RexReport fixture — only the fields
 * `importFromReport`/`deriveNewsRisk` read are varied per test. */
function makeReport(overrides: Partial<RexReportType> = {}): RexReportType {
  return {
    id: "rex_xauusd_test",
    pair: "XAU/USD",
    timeframe: "M15",
    generatedAtLabel: "Just now",
    headline: "Rex read this chart.",
    analysisContext: {
      symbol: "XAUUSD",
      instrument: "XAU/USD",
      timeframe: "M15",
      timeframeLabel: "15m",
      timeframeKnown: true,
      platform: "TradingView",
      currentPrice: "4178.000",
    },
    aiPowered: true,
    chartSource: "TradingView",
    currentPrice: "4178.000",
    visionConfidence: { metrics: [], overall: 80, chartSource: "TradingView", reduced: false },
    trend: { direction: "Uptrend", strength: "Strong", timeframe: "M15", summary: "" },
    bias: { bias: "Bullish", confidence: 84, suggestedDirection: "Buy Favored", summary: "" },
    confidence: [],
    overallConfidence: 84,
    economic: [],
    // Raw chart-read levels — exactly the XAUUSD case-study numbers that, if
    // used directly, give a DIFFERENT entry/SL/TP than the validated setup.
    priceLevels: [
      { type: "Support", value: "4174.751", description: "", position: 30 },
      { type: "Entry", value: "4180.000", description: "", position: 52 },
      { type: "Resistance", value: "4200.00", description: "", position: 72 },
      { type: "Take Profit", value: "4210.00", description: "", position: 90 },
      { type: "Invalidation", value: "4170.00", description: "", position: 10 },
    ],
    evidence: [],
    plainEnglish: [],
    insight: { title: "", body: "" },
    reliability: { metrics: [], overall: 80, reduced: false },
    whatCouldChange: [],
    closingNote: "",
    ...overrides,
  };
}

/** The validated setup `buildTradeSetup()` produces for this exact chart
 * read (reproduced from the XAUUSD case-study trace — see trade-setup.ts). */
const validatedSetup: DirectionalSetup = {
  kind: "directional",
  bias: "Bullish",
  entryZone: "4174.751 – 4180.000",
  invalidationZone: "4169.410 – 4170.590",
  target1: "4199.262 – 4200.738",
  target2: "4209.262 – 4210.738",
  riskReward: "1:3.1",
  riskReward2: "1:4.4",
  quality: "A+",
  confluence: ["Bullish market structure (HH/HL)"],
  rationale: "",
  newsRisk: "Low",
  confidence: 84,
  entryMid: 4177.3755,
  invalidationMid: 4170,
  target1Mid: 4200,
  target2Mid: 4210,
  rr1: 3.0675,
  rr2: 4.4234,
  setupType: "Bullish continuation — demand/support retest",
  qualityScore: 83,
  qualityLabel: "Strong",
  newsStatus: "clear",
  target1Label: "Partial-profit area (nearer objective)",
  target2Label: "Extended objective",
  invalidationExplainer: "",
  managementNote: "",
  lowerTimeframeConfirmation: [],
};

const neutralSetup: NeutralSetup = {
  kind: "neutral",
  bias: "Neutral",
  upperZone: null,
  lowerZone: null,
  keyResistance: null,
  keySupport: null,
  requiredConfirmation: [],
  newsRisk: "Low",
};

const noSetup: NoSetup = { kind: "none", reason: "No valid setup.", newsRisk: "Low" };

const blockedSetup: BlockedSetup = {
  kind: "blocked",
  reason: "News approaching.",
  event: "US CPI",
  currency: "USD",
  minutesUntil: 10,
  newsRisk: "High",
  newsStatus: "blocked",
};

/* ── 1. A validated DirectionalSetup exists → reuse its numbers exactly ──── */
{
  const report = makeReport();
  const imported = importFromReport(report, validatedSetup);

  check("1a source is 'validated-setup'", imported.source === "validated-setup");
  check("1b entryPrice = validated entryMid (NOT raw Entry 4180)", imported.entryPrice === validatedSetup.entryMid);
  check("1c stopLoss = validated invalidationMid (NOT raw Invalidation 4170 rounded differently)", imported.stopLoss === validatedSetup.invalidationMid);
  check("1d takeProfit = validated target1Mid (NOT raw Take Profit 4210)", imported.takeProfit === validatedSetup.target1Mid);
  check("1e takeProfit is NOT the raw chart Take Profit level (4210)", imported.takeProfit !== 4210);
  check("1f entryPrice is NOT the raw chart Entry level (4180 — the zone's worst edge)", imported.entryPrice !== 4180);
  check("1g carries the structural invalidation ZONE string, not just the center", imported.invalidationZone === "4169.410 – 4170.590");
  check("1h pair/timeframe/direction/confidence still come from the report", imported.pair === "XAU/USD" && imported.timeframe === "M15" && imported.direction === "Bullish" && imported.confidence === 84);
}

/* ── 2. Both save paths must agree: this IS exactly what the Trade Setup
 *    modal's own save button sends (entryMid/invalidationMid/target1Mid) ── */
{
  const imported = importFromReport(makeReport(), validatedSetup);
  const otherPathPayload = {
    entryPrice: validatedSetup.entryMid,
    stopLoss: validatedSetup.invalidationMid,
    takeProfit: validatedSetup.target1Mid,
  };
  check(
    "2 consistent with the Trade Setup modal's own save payload",
    imported.entryPrice === otherPathPayload.entryPrice &&
      imported.stopLoss === otherPathPayload.stopLoss &&
      imported.takeProfit === otherPathPayload.takeProfit
  );
}

/* ── 3. No trade setup generated yet (undefined/null) → raw-levels fallback,
 *    clearly flagged as unvalidated (preserves analysis-only journaling) ── */
{
  const report = makeReport();
  for (const ts of [undefined, null] as const) {
    const imported = importFromReport(report, ts);
    check(`3 (${String(ts)}) falls back to raw levels`, imported.source === "raw-levels");
    check(`3 (${String(ts)}) entryPrice = raw Entry level (4180)`, imported.entryPrice === 4180);
    check(`3 (${String(ts)}) stopLoss = raw Invalidation level (4170)`, imported.stopLoss === 4170);
    check(`3 (${String(ts)}) takeProfit = raw Take Profit level (4210)`, imported.takeProfit === 4210);
    check(`3 (${String(ts)}) no fabricated invalidation zone`, imported.invalidationZone === null);
  }
}

/* ── 4. Non-directional setup results (neutral/none/blocked) must NOT be
 *    silently treated as a validated trade setup — same raw-levels fallback ── */
{
  const report = makeReport();
  for (const ts of [neutralSetup, noSetup, blockedSetup]) {
    const imported = importFromReport(report, ts);
    check(`4 (${ts.kind}) falls back to raw levels, not mislabeled validated`, imported.source === "raw-levels");
    check(`4 (${ts.kind}) entryPrice unaffected by the non-directional result`, imported.entryPrice === 4180);
  }
}

/* ── 5. Legitimate analysis-only journaling still works when the chart has
 *    no price levels at all (e.g. a Neutral analysis) — no crash, nulls ── */
{
  const report = makeReport({ priceLevels: [], bias: { bias: "Neutral", confidence: 55, suggestedDirection: "Wait", summary: "" } });
  const imported = importFromReport(report, null);
  check("5a no crash on empty priceLevels", imported.source === "raw-levels");
  check("5b entryPrice null when no Entry level exists", imported.entryPrice === null);
  check("5c stopLoss null when no Invalidation level exists", imported.stopLoss === null);
  check("5d takeProfit null when no Take Profit level exists", imported.takeProfit === null);
  check("5e pair/direction still captured for analysis-only journaling", imported.pair === "XAU/USD" && imported.direction === "Neutral");
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nSave-to-Journal (validated setup reuse) tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
