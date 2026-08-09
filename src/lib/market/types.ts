/**
 * Shared types for the Market Intelligence hub.
 *
 * Kept free of `server-only` and any DB/Node imports so both client cards and
 * server services can share the exact same shapes. The API routes serialize
 * these verbatim.
 */

export type ImpactLevel = "high" | "medium" | "low";
export type SentimentLabel = "Bullish" | "Bearish" | "Neutral";
export type ActivityLevel = "Low" | "Medium" | "High";
export type SessionName = "Tokyo" | "London" | "New York";
export type NewsRiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** Card 1 — one upcoming economic event. */
export interface NewsEvent {
  id: string;
  time: string; // "13:30" (UTC, 24h)
  currency: string; // "USD"
  event: string; // "CPI m/m"
  impact: ImpactLevel;
  /** Minutes from "now" until the event (negative = already passed today). */
  minutesUntil: number;
}

export interface NewsPayload {
  events: NewsEvent[];
  /** Aggregate risk derived from the nearest high-impact event. */
  riskLevel: NewsRiskLevel;
  updatedAt: string; // ISO
}

/** Card 2 — Rex-derived sentiment for a single pair. */
export interface PairSentimentView {
  pair: string; // "EURUSD"
  label: SentimentLabel;
  /** Strength of the shown label, 0–100 — also the progress-bar width. */
  strength: number;
  /** Raw bullish share of directional analyses, 0–100. */
  bullishPct: number;
  /** Number of Rex analyses backing this figure. */
  samples: number;
  /** "rex" once real analyses exist, otherwise the seeded baseline. */
  source: "rex" | "baseline";
}

export interface SentimentPayload {
  pairs: PairSentimentView[];
  updatedAt: string; // ISO
}

/** Card 3 — a trading session's live state. */
export interface SessionView {
  name: SessionName;
  open: boolean;
  activity: ActivityLevel;
  /** True for the single most-active open session (gets the blue glow). */
  active: boolean;
  /** 0–100 activity meter. */
  progressPct: number;
  /** Session window in UTC, for tooltips/labels. */
  openUtc: string; // "07:00"
  closeUtc: string; // "16:00"
}

export interface SessionsPayload {
  sessions: SessionView[];
  /** The most-active open session, or null when the market is quiet. */
  mostActive: SessionName | null;
  /** True while the London–New York overlap is live. */
  overlap: boolean;
  updatedAt: string; // ISO
}

/** Card 4 — a correlation relationship between two instruments. */
export interface CorrelationView {
  id: string;
  a: string; // "EURUSD"
  b: string; // "GBPUSD"
  value: number; // -1..1, rounded to 2dp
  /** "static" today; "live" once real rolling correlations are wired in. */
  source: "static" | "live";
}

export interface CorrelationsPayload {
  pairs: CorrelationView[];
  updatedAt: string; // ISO
}

/** The full-width Rex Insight of the Day. */
export interface RexInsight {
  text: string;
  /** What drove the insight — handy for future Smart Journal linking. */
  basis: "correlation" | "sentiment" | "neutral";
}

/**
 * Journal-integration seam. Structured now, consumed by the Smart Journal
 * later. Exposed at /api/market/context — do NOT build the integration yet.
 */
export interface MarketContext {
  current_session: {
    name: SessionName | null;
    activity: ActivityLevel;
    overlap: boolean;
  };
  news_risk_level: NewsRiskLevel;
  pair_sentiment: Record<string, { label: SentimentLabel; strength: number }>;
  correlation_flags: Array<{
    pair: string; // "EURUSD ↔ GBPUSD"
    value: number;
    note: string;
  }>;
  generatedAt: string; // ISO
}
