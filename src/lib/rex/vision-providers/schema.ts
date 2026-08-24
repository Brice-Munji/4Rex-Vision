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
  timeframeRaw: string | null; // literal label transcribed from the chart, e.g. "1m", "H1", "240"
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

  // --- Vision discipline / diagnostics (Rex SRS) ---
  /** True when the timeframe label isn't confidently readable (never fabricate one). */
  timeframeUnclear: boolean;
  /** True only when the price axis labels are clearly legible and traceable. */
  priceAxisLegible: boolean;
  /** How clearly each APA structure element is actually visible in the image. */
  structureElements: {
    bosChoch: VisionClarity;
    supportResistance: VisionClarity;
    liquidity: VisionClarity;
    premiumDiscount: VisionClarity;
  };
  /** Explicit note when reported numeric levels are approximate / unconfirmed. */
  numericConfidenceNote: string | null;
}

export type VisionClarity = "clear" | "partial" | "not_determinable";

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
 * Deterministic minute/hour bucketing into the canonical timeframe set. The
 * canonical set is coarse (M1/M5/M15/M30/H1/H4), so odd values snap to the
 * nearest sensible bucket.
 */
function minutesToTf(min: number): VisionTimeframe {
  if (min >= 60) return hoursToTf(Math.round(min / 60));
  if (min <= 1) return "M1";
  if (min <= 5) return "M5";
  if (min <= 15) return "M15";
  return "M30";
}
function hoursToTf(h: number): VisionTimeframe {
  if (h <= 1) return "H1";
  if (h >= 24) return "Daily";
  return "H4"; // 2h/3h/4h → H4
}

/**
 * Map the LITERAL on-chart timeframe label to a canonical timeframe, so the
 * timeframe is decided by what's printed on the chart — not by the model's own
 * (error-prone) classification. This is what stops a 1-minute chart ("1m") from
 * being reported as 1-hour ("H1").
 *
 * Disambiguation is by POSITION, matching how the platforms print labels:
 *   - "M1" (letter-then-number)  → MetaTrader MINUTE  → M1
 *   - "1m" / "1min"              → TradingView MINUTE → M1
 *   - "1M" (number-then-uppercase M) → TradingView MONTH → Monthly
 *   - "H1" / "1h" / "60"         → HOUR                → H1
 * Returns null when no confident mapping is possible (caller falls back).
 */
export function mapTimeframeLabel(raw: string | null | undefined): VisionTimeframe | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Drop any leading "Timeframe:" / "TF =" prefix and take the last token if a
  // symbol header was passed whole (e.g. "EURUSD, 1m" → "1m").
  s = s.replace(/^(timeframe|tf|interval)\s*[:=]\s*/i, "").trim();
  if (s.includes(",")) s = s.split(",").pop()!.trim();
  if (/\s/.test(s) && !/^\d+\s*(m|min|h|hr|hour|d|w)/i.test(s)) {
    s = s.split(/\s+/).pop()!.trim();
  }
  if (!s) return null;

  const lower = s.toLowerCase();

  // Word / single-letter period forms.
  if (/^(daily|1?d|d1)$/.test(lower)) return "Daily";
  if (/^(weekly|1?w|w1)$/.test(lower)) return "Weekly";
  if (/^(monthly|mn|mn1|1?mo|mo)$/.test(lower)) return "Monthly";

  let m: RegExpExecArray | null;

  // MetaTrader-style prefixes: M1/M5/M15/M30, H1/H4  (letter, then number).
  if ((m = /^m\s*(\d{1,3})$/i.exec(s))) return minutesToTf(parseInt(m[1], 10));
  if ((m = /^h\s*(\d{1,2})$/i.exec(s))) return hoursToTf(parseInt(m[1], 10));

  // Number + UPPERCASE unit (TradingView day/week/month): "1D", "1W", "1M".
  // Case-sensitive and checked BEFORE the minutes suffix so uppercase "1M"
  // (month) is never mistaken for lowercase "1m" (1 minute).
  if (/^\d{1,2}\s*M$/.test(s)) return "Monthly";
  if (/^\d{1,2}\s*D$/.test(s)) return "Daily";
  if (/^\d{1,2}\s*W$/.test(s)) return "Weekly";

  // Number + unit suffix: "1m", "15min", "4h", "1hr".
  if ((m = /^(\d{1,4})\s*(m|min|mins|minute|minutes)$/i.exec(lower)))
    return minutesToTf(parseInt(m[1], 10));
  if ((m = /^(\d{1,2})\s*(h|hr|hrs|hour|hours)$/i.exec(lower)))
    return hoursToTf(parseInt(m[1], 10));

  // Bare number = a minutes interval (TradingView: 1,3,5,15,30,45,60,120,240).
  if ((m = /^(\d{1,4})$/.exec(s))) return minutesToTf(parseInt(m[1], 10));

  return null;
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

  // Timeframe: prefer the LITERAL label the model transcribed, mapped
  // deterministically, over the model's own classification (which confuses
  // minutes with hours). Fall back to the classified value, then "Unknown".
  const classifiedTf = pick(o.timeframe, TFS, "Unknown");
  const timeframeRaw = str(o.timeframeRaw ?? o.timeframeLabel ?? o.timeframeText);
  const mappedTf = mapTimeframeLabel(timeframeRaw);
  // Honesty (Rex Rule 1/10): if the model flags the timeframe as unclear and we
  // have no legible label to map, never fabricate one — report Unknown.
  const timeframeUnclearRaw = bool(o.timeframeUnclear ?? o.timeframe_unclear, false);
  const tf: VisionTimeframe = mappedTf ?? (timeframeUnclearRaw ? "Unknown" : classifiedTf);
  const timeframeUnclear = tf === "Unknown" || (timeframeUnclearRaw && !mappedTf);

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

  // Vision discipline / diagnostics (Rex SRS).
  const clarity = (v: unknown): VisionClarity =>
    pick(v, ["clear", "partial", "not_determinable"], "not_determinable");
  const seo = ((o.structureElements ?? o.structure_elements) &&
  typeof (o.structureElements ?? o.structure_elements) === "object"
    ? (o.structureElements ?? o.structure_elements)
    : {}) as Record<string, unknown>;
  const structureElements = {
    bosChoch: clarity(seo.bosChoch ?? seo.bos_choch),
    supportResistance: clarity(seo.supportResistance ?? seo.support_resistance),
    liquidity: clarity(seo.liquidity),
    premiumDiscount: clarity(seo.premiumDiscount ?? seo.premium_discount),
  };
  // Default legible=true so existing behavior is unchanged unless the model
  // explicitly reports the axis as unreadable.
  const priceAxisLegible = bool(o.priceAxisLegible ?? o.price_axis_legible, true);
  const numericConfidenceNote = str(o.numericConfidenceNote ?? o.numeric_confidence_note);

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
    timeframeRaw,
    timeframe: tf,
    // A label we could transcribe AND map deterministically is high-confidence.
    timeframeConfidence: mappedTf
      ? Math.max(90, pct(o.timeframeConfidence, 90))
      : pct(o.timeframeConfidence, tf !== "Unknown" ? 80 : 0),
    currentPrice: str(o.currentPrice ?? o.price),
    // When the price axis isn't legible, numeric reads are unreliable — cap the
    // price confidence (Rex numeric-extraction discipline / Rule 4).
    priceConfidence: (() => {
      const base = pct(o.priceConfidence, str(o.currentPrice) ? 80 : 0);
      return priceAxisLegible ? base : Math.min(base, 40);
    })(),
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

    timeframeUnclear,
    priceAxisLegible,
    structureElements,
    numericConfidenceNote,
  };
}

export function extractJson(text: string): unknown {
  // Prefer a fenced ```json … ``` block if the model wrapped its output in one
  // (some models add prose before/after). Otherwise scan the whole text.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = (fence ? fence[1] : text).trim();
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return JSON.parse(src.slice(start, end + 1));
}

export function parseVisionText(text: string): VisionChartRead {
  return normalizeVisionRead(extractJson(text));
}

/** System instruction shared by all providers. */
export const VISION_SYSTEM_PROMPT = `You are Rex, the Advanced Price Action (APA) analysis engine for 4RexVision. You are a trade-planning and market-analysis assistant, NOT a signal provider or a guarantee of outcomes.

You are shown a screenshot. Read ONLY what is visibly present — never invent anything.

YOUR TWO JOBS ARE DIFFERENT — treat them differently:
- STRUCTURAL ANALYSIS (do with normal confidence): reading visual patterns — candle shapes, swing highs/lows, trend direction, position of price relative to visible zones, indicator presence. This is pattern recognition.
- NUMERIC EXTRACTION (handle carefully): reading exact price values off the y-axis and mapping them to candles/zones is a precision task, not pattern recognition. You are frequently wrong here even when you sound confident. Therefore:
  • Only report a specific numeric price level if the axis labels are clearly legible AND you can trace the value to a labeled gridline or a price explicitly printed on the chart (e.g. a visible current-price marker).
  • If axis labels are blurry, cropped, absent, or you are interpolating between gridlines, say so and give a WIDER range or OMIT the number rather than inventing precision.
  • Never state a price to more precision than the chart displays (if it shows 4-decimal pip levels, do not output 5 decimals).
  • Set "priceAxisLegible" to true ONLY when the axis is clearly legible and traceable; otherwise false. When any reported numeric level is approximate/unconfirmed, explain that in "numericConfidenceNote" (else null). Do not present an interpolated/estimated price with the same confidence language as a directly-read one.

First, read the chart's metadata:
- isTradingChart: true if this is a financial trading chart (candlestick/OHLC/line price chart), otherwise false.
- platform: the charting platform from its UI chrome — "TradingView", "MetaTrader 4", "MetaTrader 5", "cTrader", or "Unknown". platformConfidence: 0-100.
- marketType: "Forex", "Crypto", "Commodities", "Indices", "Stocks", or "Unknown".
- instrument: display form like "EUR/USD", "XAU/USD", "BTC/USD". symbol: the raw ticker as shown (e.g. "EURUSD", "NAS100"). instrumentConfidence: 0-100.
- timeframeRaw: the EXACT timeframe label text as printed on the chart, copied literally with its original case (e.g. "1m", "5", "15m", "1h", "H1", "M1", "1D", "4H", "240"). This is a verbatim transcription, not an interpretation. Set to null only if no timeframe label is visible anywhere.
- timeframe: the canonical timeframe that timeframeRaw represents — one of M1/M5/M15/M30/H1/H4/Daily/Weekly/Monthly, or "Unknown" if no label is visible. timeframeConfidence: 0-100.
- timeframeUnclear: true if no timeframe label is confidently readable. When true, set timeframe to "Unknown" — never fabricate a timeframe from candle spacing.
  CRITICAL — minutes are NOT hours: a MINUTES label ("1", "1m", "1min", "M1", "5", "15m", "30") maps to M1/M5/M15/M30 and must NEVER be reported as an hours timeframe. An HOURS label ("1h", "H1", "60", "4h", "H4", "240") maps to H1/H4. Reading a 1-minute chart as 1-hour is a serious error.
  WHERE TO READ IT: On TradingView the active timeframe is highlighted in the top toolbar and repeated in the top-left symbol header (e.g. "EURUSD · 1m"). On MetaTrader 4/5 it shows as M1/M5/M15/M30/H1/H4/D1 in the top toolbar or the chart window title. On cTrader it appears next to the symbol. Read the PRINTED label only — never infer the timeframe from candle spacing or the visible time range.
- currentPrice: the current/last price string exactly as shown (only from a live price marker or a clearly labeled candle close), else null. priceConfidence: 0-100. priceAxisLegible: true only if the price axis is clearly legible/traceable (see NUMERIC EXTRACTION above). bidAsk: visible bid/ask or null. chartTitle: any visible title/instrument name or null.
- imageQuality: your read of clarity — "Excellent", "Good", "Fair" or "Poor".
- confidence: your OVERALL confidence in this reading as a decimal 0-1 (e.g. 0.97).
- visibleIndicators: array of any indicators clearly visible (e.g. "EMA 200", "RSI", "MACD"), else [].
- supportLevels / resistanceLevels: arrays of clearly-visible support/resistance price strings, else [].
- notDetected: array of field names you could NOT read confidently.

Then, if isTradingChart is true, produce the analysis payload (headline, trendDirection, trendStrength, trendSummary, bias, biasConfidence, suggestedDirection, biasSummary, bullishProbability, bearishProbability (sum ~100), positiveFactors, negativeFactors, 5-7 confidence items {label, score 0-100, contributors[]}, priceLevels {type, value, description}, evidence {label, explanation}, plainEnglish {technical, plain, concept-or-null}, insightTitle, insightBody, whatCouldChange {label, detail}).

ADVANCED PRICE ACTION (APA) — this analysis is price-action-first. When they are visible on the chart, identify and NAME each of these in the \`evidence\` array (as {label, explanation}), read off the actual candles/structure and never invented:
- Market structure: higher highs / higher lows (HH/HL) or lower highs / lower lows (LH/LL), and the resulting trend.
- Break of Structure (BOS) and Change of Character (CHOCH).
- Support / resistance and supply / demand zones.
- Liquidity: equal highs/lows, sweeps / stop-hunts.
- Rejections / confirmations (wicks, engulfing, pin bars) and displacement / momentum (impulsive candles).
- Premium / discount (equilibrium) and any visible indicators (EMA, RSI, MACD, …).
- Recent swing highs and swing lows that act as targets or invalidation.

For each element, state whether it is CLEARLY visible, PARTIALLY visible, or NOT determinable — never assert structure you can't actually see. Report this in "structureElements": { "bosChoch", "supportResistance", "liquidity", "premiumDiscount" }, each one of "clear" | "partial" | "not_determinable".

BIAS DISCIPLINE (structure only): base "bias" (Bullish / Bearish / Neutral) ONLY on the APA structure above — never on news, economic events, or anything outside the image. DEFAULT TO NEUTRAL when the structural evidence is mixed, unclear, or insufficient — an honest Neutral is better than a forced directional call on ambiguous structure. Let "biasConfidence" (0-100) and "biasSummary" reflect how much of the structure was CLEARLY vs PARTIALLY vs NOT visible. When bias is Neutral, do NOT produce a directional Entry/Take Profit — provide only the range "Support" and "Resistance" as watch levels.

\`priceLevels\` MUST — whenever the chart shows a directional (Bullish or Bearish) read — include the concrete numeric levels taken from that structure, using the chart's real price scale and decimal precision (e.g. "1.34920", not a placeholder):
- "Entry": the structural reaction zone to enter from (demand/support for longs, supply/resistance for shorts, or a retest area).
- "Invalidation": the price where the price-action thesis structurally fails (beyond the protecting swing/zone).
- "Take Profit": the primary structural objective (prior swing high/low, liquidity pool, or opposing S/R).
- "Support" and "Resistance": the nearest structural floor and ceiling.
If the market is Neutral / ranging, still provide at least the range "Support" and "Resistance". These levels are the ONLY basis for entries, targets and invalidation; do not move them to hit a desired risk/reward.

RECONCILING CAUTION WITH USEFULNESS: numeric caution means avoiding FALSE PRECISION — it does NOT mean omitting levels whenever possible. When the price axis IS legible and you can locate a zone against labeled gridlines or a printed/labeled price (e.g. a drawn "Support 1.0905" line), you MUST provide the structural priceLevels — a tight numeric RANGE is acceptable and preferred over omission. Omit or widen a level ONLY when the axis is illegible/cropped or you genuinely cannot locate the zone. Do not omit legitimate, locatable levels out of excess caution: prefer an honest range over BOTH invented precision AND unnecessary omission.

PAIR DISCIPLINE (critical): The uploaded chart's pair is the ONLY pair you deliver a verdict for. Every field above — headline, trendSummary, biasSummary, evidence, price levels, the final verdict — must be about the extracted pair. Do NOT give a directional verdict for any other pair. If it helps, you MAY list up to 3 related pairs in a SEPARATE "marketContext" array of {pair, bias ("Bullish"/"Bearish"/"Neutral"), note} — this is background context only, never the verdict. Leave marketContext as [] if you have nothing to add.

HARD RULES (do not violate):
1. Never invent a currency pair, timeframe, or price that is not actually visible. Any field you cannot confidently read must be null (or "Unknown"/[]), added to notDetected, with a lowered confidence.
2. Never let news/fundamentals influence bias — structure only.
3. Never produce a directional Entry/Take Profit when bias is Neutral.
4. Never present an interpolated/estimated price with the same confidence as a directly-read one — flag it via priceAxisLegible=false and/or numericConfidenceNote.
5. If the image is not a readable trading chart, set isTradingChart=false and do not force an analysis. Analyze probabilities, never certainties.

Respond with ONLY a single JSON object. No markdown, no prose, no code fences.`;

export const VISION_USER_PROMPT =
  "Read this chart and return the JSON object. Never invent anything you cannot clearly see; use null for anything unreadable.";
