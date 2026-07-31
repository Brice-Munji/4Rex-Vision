/**
 * Rex Intelligence Engine — shared type system.
 *
 * These types define the contract between the intelligence pipeline and the
 * presentation layer. No AI model is connected yet; a mock pipeline produces
 * data in this exact shape so real engines can be dropped in later without any
 * UI changes.
 *
 * Core philosophy encoded here: Rex never predicts with certainty — every
 * conclusion carries a confidence and is backed by evidence.
 */

export type TrendDirection = "Uptrend" | "Downtrend" | "Sideways";
export type TrendStrength = "Weak" | "Moderate" | "Strong";
export type Timeframe = "M15" | "M30" | "H1" | "H4" | "Daily" | "Weekly";
export type MarketBias = "Bullish" | "Bearish" | "Neutral";
export type SuggestedDirection =
  | "Buy Favored"
  | "Sell Favored"
  | "Wait"
  | "Wait For Confirmation";
export type ImpactLevel = "High" | "Medium" | "Low";
export type MarketSession = "Sydney" | "Tokyo" | "London" | "New York";

/* --------------------------- Chart Reader (6.1) -------------------------- */

export type TradingPlatform =
  | "TradingView"
  | "MetaTrader 4"
  | "MetaTrader 5"
  | "cTrader"
  | "Unknown Trading Platform";

/** Full set of timeframes the Chart Reader can recognize (superset of Timeframe). */
export type ReadTimeframe =
  | "M1"
  | "M5"
  | "M15"
  | "M30"
  | "H1"
  | "H4"
  | "Daily"
  | "Weekly"
  | "Monthly";

export type ImageQualityLabel = "Excellent" | "Good" | "Fair" | "Poor";

export interface ImageQuality {
  score: number; // 0-100
  label: ImageQualityLabel;
  issues: string[];
}

/**
 * Structured chart metadata extracted before analysis. Consumed by the metadata
 * summary card and, in future sprints, by the Market Structure / Technical /
 * Economic / Probability / Report engines.
 */
export interface ChartMetadata {
  platform: TradingPlatform;
  platformConfidence: number; // 0-100
  marketType: string | null; // "Forex" | "Crypto" | "Commodities" | ...
  instrument: string | null; // normalized, e.g. "EUR/USD", "XAU/USD"
  symbol: string | null; // raw ticker, e.g. "EURUSD", "NAS100"
  instrumentConfidence: number;
  instrumentSupported: boolean; // forex or gold — analysis allowed
  visibleIndicators: string[]; // e.g. ["EMA 200", "RSI"]
  timeframe: ReadTimeframe | null;
  timeframeConfidence: number;
  currentPrice: string | null;
  priceConfidence: number;
  bidAsk: string | null;
  chartTitle: string | null;
  imageQuality: ImageQuality;
  overallConfidence: number; // 0-100
  aiPowered: boolean; // true when a live vision model read the metadata
  notes: string[];
}

/** Concept keys understood by the Plain-English glossary / "Explain This". */
export type ConceptKey =
  | "Support"
  | "Resistance"
  | "Trend"
  | "Liquidity"
  | "Break of Structure"
  | "Market Structure"
  | "Candlestick Pattern"
  | "Risk Management";

/* ------------------------------- Sections -------------------------------- */

export interface TrendSection {
  direction: TrendDirection;
  strength: TrendStrength;
  timeframe: Timeframe;
  summary: string;
}

export interface BiasSection {
  bias: MarketBias;
  confidence: number; // 0-100
  suggestedDirection: SuggestedDirection;
  summary: string;
}

export interface ConfidenceMetric {
  key: string;
  label: string;
  score: number; // 0-100
  /** What contributed to this score (evidence). */
  contributors: string[];
}

export interface EconomicEventItem {
  id: string;
  currency: string;
  title: string;
  impact: ImpactLevel;
  time: string;
  expectedVolatility: string;
  session: MarketSession;
  explanation: string;
}

export type PriceLevelType =
  | "Resistance"
  | "Entry"
  | "Support"
  | "Take Profit"
  | "Invalidation";

export interface PriceLevel {
  type: PriceLevelType;
  value: string;
  description: string;
  /** 0-100 position for the visual ladder (100 = top). */
  position: number;
}

export interface EvidenceItem {
  key: string;
  label: string;
  explanation: string;
  icon: string;
}

export interface PlainEnglishItem {
  technical: string;
  plain: string;
  concept?: ConceptKey;
}

export interface EducationalInsight {
  title: string;
  body: string;
}

export interface ReliabilityMetric {
  key: string;
  label: string;
  score: number; // 0-100
}

export interface ReliabilitySection {
  metrics: ReliabilityMetric[];
  overall: number; // 0-100
  reduced: boolean;
  note?: string;
}

/* --------------------------- Vision confidence --------------------------- */

export type ChartSource =
  | "TradingView"
  | "MetaTrader 4"
  | "MetaTrader 5"
  | "cTrader"
  | "Unknown";

export interface VisionConfidenceMetric {
  key: string;
  label: string;
  score: number; // 0-100
  note?: string;
}

export interface VisionConfidence {
  metrics: VisionConfidenceMetric[];
  overall: number; // 0-100
  chartSource: ChartSource;
  reduced: boolean;
  note?: string;
}

/** Section 11 — what would invalidate the current read. */
export interface WhatCouldChangeItem {
  label: string;
  detail: string;
}

/* ------------------------- Pair Integrity (P0) --------------------------- */

/**
 * The authoritative analysis context locked at extraction time. Every verdict
 * in the report is for this pair and timeframe — nothing else.
 */
export interface AnalysisContext {
  symbol: string; // raw ticker, e.g. "AUDUSD"
  instrument: string; // display, e.g. "AUD/USD"
  timeframe: Timeframe;
  timeframeLabel: string; // banner form, e.g. "1H"
  platform: TradingPlatform;
  currentPrice?: string | null;
}

/** A correlated pair evaluated by the Correlation Guard. */
export interface CorrelationPair {
  pair: string; // display, e.g. "GBP/USD"
  bias: MarketBias;
  note?: string;
}

/** Result of the Correlation Guard — surfaced when correlated pairs diverge. */
export interface CorrelationCheck {
  title: string;
  group: string | null;
  correlated: CorrelationPair[];
  hasDivergence: boolean;
  explanation?: string;
}

/* -------------------------------- Report --------------------------------- */

export interface RexReport {
  id: string;
  pair: string;
  timeframe: Timeframe;
  generatedAtLabel: string;
  headline: string;

  /** P0 — authoritative pair/timeframe lock (present on live AI reports). */
  analysisContext?: AnalysisContext;
  /** P0 — correlation guard result (present when correlated context exists). */
  correlation?: CorrelationCheck;
  /** P0 — explanation shown when the confidence rule reduced the score. */
  confidenceNote?: string;

  /** True when produced by the live Anthropic vision model. */
  aiPowered: boolean;
  /** Transparency notice shown when running in fallback / sample mode. */
  notice?: string;
  chartSource: ChartSource;
  currentPrice?: string | null;

  visionConfidence: VisionConfidence; // Step 3
  trend: TrendSection; // Section 1
  bias: BiasSection; // Section 2
  confidence: ConfidenceMetric[]; // Section 4 (Confidence Breakdown)
  overallConfidence: number;
  economic: EconomicEventItem[]; // Section 5
  priceLevels: PriceLevel[]; // Section 6
  evidence: EvidenceItem[]; // Section 7
  plainEnglish: PlainEnglishItem[]; // Section 8
  insight: EducationalInsight; // Section 9
  reliability: ReliabilitySection; // Section 10
  whatCouldChange: WhatCouldChangeItem[]; // Section 11
  closingNote: string; // Section 12
}

/* ------------------------------ Upload flow ------------------------------ */

export interface UploadMeta {
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface ReliabilityCheck {
  key: string;
  label: string;
  score: number; // 0-100
  ok: boolean;
}

export interface UploadValidation {
  checks: ReliabilityCheck[];
  reliable: boolean;
  overall: number;
  message?: string;
}

export interface ThinkingStage {
  id: string;
  label: string;
}
