import "server-only";

/**
 * Shared structured-output contract for the multimodal Vision providers
 * (OpenAI GPT-4o, Google Gemini, Anthropic Claude). Every provider returns the
 * same `VisionChartRead` shape so the rest of the pipeline is provider-agnostic.
 *
 * Parsing is deliberately tolerant: a missing or malformed field becomes null
 * (or a sensible default) rather than failing the whole read — a chart is never
 * rejected just because one field couldn't be detected.
 */

export type VisionPlatform =
  | "TradingView"
  | "MetaTrader 4"
  | "MetaTrader 5"
  | "cTrader"
  | "Unknown";

export type VisionMarketType =
  | "Forex"
  | "Crypto"
  | "Commodities"
  | "Indices"
  | "Stocks"
  | "Unknown";

export type VisionTimeframe =
  | "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "Daily" | "Weekly" | "Monthly" | "Unknown";

export type VisionImageQuality = "Excellent" | "Good" | "Fair" | "Poor";

export type ConceptKeyRaw =
  | "Support" | "Resistance" | "Trend" | "Liquidity" | "Break of Structure"
  | "Market Structure" | "Candlestick Pattern" | "Risk Management";

export interface VisionConfidenceItem {
  label: string;
  score: number; // 0-100
  contributors: string[];
}
export interface VisionPriceLevel {
  type: "Resistance" | "Entry" | "Support" | "Take Profit" | "Invalidation";
  value: string;
  description: string;
}
export interface VisionEvidence {
  label: string;
  explanation: string;
}
export interface VisionPlainEnglish {
  technical: string;
  plain: string;
  concept: ConceptKeyRaw | null;
}
export interface VisionWhatCouldChange {
  label: string;
  detail: string;
}
export interface VisionMarketContextPair {
  pair: string; // e.g. "GBP/USD"
  bias: "Bullish" | "Bearish" | "Neutral";
  note: string | null;
}

/** Canonical structured result returned by every provider. */
export interface VisionChartRead {
  // --- Chart Reader metadata (spec JSON) ---
  isTradingChart: boolean;
  platform: VisionPlatform;
  platformConfidence: number; // 0-100
  marketType: VisionMarketType | null;
  instrument: string | null;
  symbol: string | null;
  instrumentConfidence: number; // 0-100
  timeframe: VisionTimeframe;
  timeframeConfidence: number; // 0-100
  currentPrice: string | null;
  priceConfidence: number; // 0-100
  bidAsk: string | null;
  chartTitle: string | null;
  imageQuality: VisionImageQuality | null;
  visionConfidence: number; // 0-1 overall
  visibleIndicators: string[];
  supportLevels: string[];
  resistanceLevels: string[];
  notDetected: string[];

  // --- Analysis payload (used to build the full report) ---
  headline: string;
  trendDirection: "Uptrend" | "Downtrend" | "Sideways";
  trendStrength: "Weak" | "Moderate" | "Strong";
  trendSummary: string;
  bias: "Bullish" | "Bearish" | "Neutral";
  biasConfidence: number;
  suggestedDirection: "Buy Favored" | "Sell Favored" | "Wait" | "Wait For Confirmation";
  biasSummary: string;
  bullishProbability: number;
  bearishProbability: number;
  positiveFactors: string[];
  negativeFactors: string[];
  confidence: VisionConfidenceItem[];
  priceLevels: VisionPriceLevel[];
  evidence: VisionEvidence[];
  plainEnglish: VisionPlainEnglish[];
  insightTitle: string;
  insightBody: string;
  whatCouldChange: VisionWhatCouldChange[];

  // --- P0: correlated pairs referenced as market context only (never verdicts) ---
  marketContext: VisionMarketContextPair[];
}

/* --------------------------- Defensive coercion -------------------------- */

const PLATFORMS: VisionPlatform[] = [
  "TradingView", "MetaTrader 4", "MetaTrader 5", "cTrader", "Unknown",
];
const MARKETS: VisionMarketType[] = [
  "Forex", "Crypto", "Commodities", "Indices", "Stocks", "Unknown",
];
const TFS: VisionTimeframe[] = [
  "M1", "M5", "M15", "M30", "H1", "H4", "Daily", "Weekly", "Monthly", "Unknown",
];
const QUALITY: VisionImageQuality[] = ["Excellent", "Good", "Fair", "Poor"];

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}
function pct(v: unknown, fallback = 0): number {
  let n = num(v, fallback);
  if (n > 0 && n <= 1) n = n * 100; // accept 0-1 fractions
  return Math.max(0, Math.min(100, Math.round(n)));
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function strArr(v: unknown): string[] {
  return arr(v).map(str).filter((s): s is string => !!s);
}
function pick<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = str(v);
  if (s && (allowed as string[]).includes(s)) return s as T;
  return fallback;
}
function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|yes|1)$/i.test(v.trim());
  return fallback;
}

/**
 * Turn arbitrary provider JSON into a fully-formed VisionChartRead. Never
 * throws; unknown fields become null / defaults so a partial read still works.
 */
export function normalizeVisionRead(raw: unknown): VisionChartRead {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const isTradingChart = bool(o.isTradingChart ?? o.isForexChart ?? o.is_trading_chart, false);
  const platform = pick(o.platform ?? o.chartSource, PLATFORMS, "Unknown");
  const instrument = str(o.instrument ?? o.pair ?? o.currencyPair);
  const symbol = str(o.symbol) ?? (instrument ? instrument.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : null);
  const tf = pick(o.timeframe, TFS, "Unknown");

  const confidenceItems: VisionConfidenceItem[] = arr(o.confidence).map((c) => {
    const co = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    return {
      label: str(co.label) ?? "Factor",
      score: pct(co.score),
      contributors: strArr(co.contributors),
    };
  });

  const priceLevels: VisionPriceLevel[] = arr(o.priceLevels).flatMap((l) => {
    const lo = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    const type = pick(lo.type, ["Resistance", "Entry", "Support", "Take Profit", "Invalidation"], "Support");
    const value = str(lo.value);
    if (!value) return [];
    return [{ type, value, description: str(lo.description) ?? "" }];
  });

  const plainEnglish: VisionPlainEnglish[] = arr(o.plainEnglish).map((p) => {
    const po = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const concept = str(po.concept);
    const CONCEPTS = ["Support", "Resistance", "Trend", "Liquidity", "Break of Structure", "Market Structure", "Candlestick Pattern", "Risk Management"];
    return {
      technical: str(po.technical) ?? "",
      plain: str(po.plain) ?? "",
      concept: concept && CONCEPTS.includes(concept) ? (concept as ConceptKeyRaw) : null,
    };
  });

  const evidence: VisionEvidence[] = arr(o.evidence).map((e) => {
    const eo = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    return { label: str(eo.label) ?? "", explanation: str(eo.explanation) ?? "" };
  });

  const whatCouldChange: VisionWhatCouldChange[] = arr(o.whatCouldChange).map((w) => {
    const wo = (w && typeof w === "object" ? w : {}) as Record<string, unknown>;
    return { label: str(wo.label) ?? "", detail: str(wo.detail) ?? "" };
  });

  const marketContext: VisionMarketContextPair[] = arr(o.marketContext).flatMap((c) => {
    const co = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    const pair = str(co.pair ?? co.symbol ?? co.instrument);
    if (!pair) return [];
    return [{
      pair,
      bias: pick(co.bias, ["Bullish", "Bearish", "Neutral"], "Neutral"),
      note: str(co.note),
    }];
  });

  return {
    isTradingChart,
    platform,
    platformConfidence: pct(o.platformConfidence, isTradingChart ? 70 : 20),
    marketType: (() => {
      const m = pick(o.marketType, MARKETS, "Unknown");
      return m === "Unknown" && !isTradingChart ? null : m;
    })(),
    instrument,
    symbol,
    instrumentConfidence: pct(o.instrumentConfidence ?? o.pairConfidence, instrument ? 80 : 0),
    timeframe: tf,
    timeframeConfidence: pct(o.timeframeConfidence, tf !== "Unknown" ? 80 : 0),
    currentPrice: str(o.currentPrice ?? o.price),
    priceConfidence: pct(o.priceConfidence, str(o.currentPrice) ? 80 : 0),
    bidAsk: str(o.bidAsk),
    chartTitle: str(o.chartTitle ?? o.title),
    imageQuality: (() => {
      const q = str(o.imageQuality);
      return q && (QUALITY as string[]).includes(q) ? (q as VisionImageQuality) : null;
    })(),
    visionConfidence: (() => {
      const c = num(o.confidence ?? o.visionConfidence, NaN);
      if (!Number.isFinite(c)) return 0.6;
      return Math.max(0, Math.min(1, c > 1 ? c / 100 : c));
    })(),
    visibleIndicators: strArr(o.visibleIndicators),
    supportLevels: strArr(o.supportLevels),
    resistanceLevels: strArr(o.resistanceLevels),
    notDetected: strArr(o.notDetected),

    headline: str(o.headline) ?? "Rex read this chart.",
    trendDirection: pick(o.trendDirection, ["Uptrend", "Downtrend", "Sideways"], "Sideways"),
    trendStrength: pick(o.trendStrength, ["Weak", "Moderate", "Strong"], "Moderate"),
    trendSummary: str(o.trendSummary) ?? "",
    bias: pick(o.bias, ["Bullish", "Bearish", "Neutral"], "Neutral"),
    biasConfidence: pct(o.biasConfidence, 55),
    suggestedDirection: pick(
      o.suggestedDirection,
      ["Buy Favored", "Sell Favored", "Wait", "Wait For Confirmation"],
      "Wait For Confirmation"
    ),
    biasSummary: str(o.biasSummary) ?? "",
    bullishProbability: pct(o.bullishProbability, 50),
    bearishProbability: pct(o.bearishProbability, 50),
    positiveFactors: strArr(o.positiveFactors),
    negativeFactors: strArr(o.negativeFactors),
    confidence: confidenceItems,
    priceLevels,
    evidence,
    plainEnglish,
    insightTitle: str(o.insightTitle) ?? "Risk management beats prediction.",
    insightBody:
      str(o.insightBody) ??
      "No single read is certain — size your risk so any one trade can't hurt you.",
    whatCouldChange,
    marketContext,
  };
}

export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function parseVisionText(text: string): VisionChartRead {
  return normalizeVisionRead(extractJson(text));
}

/** System instruction shared by all providers. */
export const VISION_SYSTEM_PROMPT = `You are Rex, an expert Forex market analyst inside 4RexVision AI, acting as a multimodal Chart Reader.

You are shown a screenshot. Read ONLY what is visibly present — never invent anything.

First, read the chart's metadata:
- isTradingChart: true if this is a financial trading chart (candlestick/OHLC/line price chart), otherwise false.
- platform: the charting platform from its UI chrome — "TradingView", "MetaTrader 4", "MetaTrader 5", "cTrader", or "Unknown". platformConfidence: 0-100.
- marketType: "Forex", "Crypto", "Commodities", "Indices", "Stocks", or "Unknown".
- instrument: display form like "EUR/USD", "XAU/USD", "BTC/USD". symbol: the raw ticker as shown (e.g. "EURUSD", "NAS100"). instrumentConfidence: 0-100.
- timeframe: one of M1/M5/M15/M30/H1/H4/Daily/Weekly/Monthly, or "Unknown" if the label isn't visible. Never infer it from candle spacing. timeframeConfidence: 0-100.
- currentPrice: the current/last price string exactly as shown, else null. priceConfidence: 0-100. bidAsk: visible bid/ask or null. chartTitle: any visible title/instrument name or null.
- imageQuality: your read of clarity — "Excellent", "Good", "Fair" or "Poor".
- confidence: your OVERALL confidence in this reading as a decimal 0-1 (e.g. 0.97).
- visibleIndicators: array of any indicators clearly visible (e.g. "EMA 200", "RSI", "MACD"), else [].
- supportLevels / resistanceLevels: arrays of clearly-visible support/resistance price strings, else [].
- notDetected: array of field names you could NOT read confidently.

Then, if isTradingChart is true, produce the analysis payload (headline, trendDirection, trendStrength, trendSummary, bias, biasConfidence, suggestedDirection, biasSummary, bullishProbability, bearishProbability (sum ~100), positiveFactors, negativeFactors, 5-7 confidence items {label, score 0-100, contributors[]}, priceLevels {type, value, description}, evidence {label, explanation}, plainEnglish {technical, plain, concept-or-null}, insightTitle, insightBody, whatCouldChange {label, detail}).

PAIR DISCIPLINE (critical): The uploaded chart's pair is the ONLY pair you deliver a verdict for. Every field above — headline, trendSummary, biasSummary, evidence, price levels, the final verdict — must be about the extracted pair. Do NOT give a directional verdict for any other pair. If it helps, you MAY list up to 3 related pairs in a SEPARATE "marketContext" array of {pair, bias ("Bullish"/"Bearish"/"Neutral"), note} — this is background context only, never the verdict. Leave marketContext as [] if you have nothing to add.

Rules: Any field you cannot confidently read must be null (or "Unknown"/[]), added to notDetected, with a lowered confidence. If you cannot confidently read the currency pair, set instrument and symbol to null with a low instrumentConfidence — never guess or substitute another pair. Analyze probabilities, never certainties.

Respond with ONLY a single JSON object. No markdown, no prose, no code fences.`;

export const VISION_USER_PROMPT =
  "Read this chart and return the JSON object. Never invent anything you cannot clearly see; use null for anything unreadable.";
