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

/* -------------------------------- Report --------------------------------- */

export interface RexReport {
  id: string;
  pair: string;
  timeframe: Timeframe;
  generatedAtLabel: string;
  headline: string;

  trend: TrendSection; // Section 1
  bias: BiasSection; // Section 2
  confidence: ConfidenceMetric[]; // Section 3
  overallConfidence: number;
  economic: EconomicEventItem[]; // Section 4
  priceLevels: PriceLevel[]; // Section 5
  evidence: EvidenceItem[]; // Section 6
  plainEnglish: PlainEnglishItem[]; // Section 7
  insight: EducationalInsight; // Section 8
  reliability: ReliabilitySection; // Section 9
  closingNote: string; // Section 10
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
