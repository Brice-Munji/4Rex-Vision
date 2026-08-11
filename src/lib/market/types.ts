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

/** Live trading-session state used by the enhanced sessions card. */
export type SessionStatus = "Closed" | "Opening Soon" | "Active" | "Peak Volatility";

/** Impact badge label (display form of ImpactLevel). */
export type ImpactBadge = "High" | "Medium" | "Low";

/* ── Live Economic Calendar (Finnhub) ─────────────────────────────────────── */

/** One normalized upcoming economic event. */
export interface CalendarEvent {
  id: string;
  currency: string; // "USD"
  event: string; // "CPI m/m"
  impact: ImpactBadge; // "High" | "Medium" | "Low"
  time_utc: string; // ISO 8601
  time_local: string; // ISO 8601 (server local; the client re-derives its own)
  previous: number | string | null;
  forecast: number | string | null;
  actual: number | string | null;
  /** Minutes until the event (negative = already started). */
  minutesUntil: number;
}

export interface CalendarPayload {
  events: CalendarEvent[];
  /** Aggregate risk from the nearest upcoming high-impact event. */
  riskLevel: NewsRiskLevel;
  /** "finnhub" when live, "fallback" when the built-in schedule is used. */
  source: "finnhub" | "fallback";
  /** Set when live data is unavailable (Finnhub error / no access). */
  warning: string | null;
  updatedAt: string; // ISO — when the underlying data was fetched
}

/* ── Real-Time Forex News (Finnhub) ───────────────────────────────────────── */

export interface ForexNewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  published_at: string; // ISO 8601
  related_currencies: string[]; // ["USD","EUR",...]
}

export interface ForexNewsPayload {
  articles: ForexNewsArticle[];
  source: "finnhub" | "fallback";
  warning: string | null;
  updatedAt: string; // ISO
}

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
  /** Live status label: Closed / Opening Soon / Active / Peak Volatility. */
  status: SessionStatus;
  /** True for the single most-active (dominant) open session. */
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
  basis: "correlation" | "sentiment" | "neutral" | "live";
}

/**
 * Journal-integration seam. Structured now, consumed by the Smart Journal
 * later. Exposed at /api/market/context — do NOT build the integration yet.
 */
export interface MarketContext {
  /** The next upcoming high-impact event (from the live calendar), if any. */
  next_high_impact: {
    currency: string;
    event: string;
    impact: ImpactBadge;
    time_utc: string;
    minutesUntil: number;
  } | null;
  current_session: {
    name: SessionName | null;
    status: SessionStatus;
    activity: ActivityLevel;
    overlap: boolean;
  };
  /** Pairs likely affected by the next high-impact event. */
  affected_pairs: string[];
  news_risk_level: NewsRiskLevel;
  pair_sentiment: Record<string, { label: SentimentLabel; strength: number }>;
  correlation_flags: Array<{
    pair: string; // "EURUSD ↔ GBPUSD"
    value: number;
    note: string;
  }>;
  generatedAt: string; // ISO
}
