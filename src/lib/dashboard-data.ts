/**
 * Placeholder data for the Trading Command Center dashboard.
 *
 * This is realistic mock data used purely to render the interface. No AI or
 * live market feed is wired up yet — replace these with real queries/streams
 * when the analysis engine and market data services come online.
 */

export type Direction = "Bullish" | "Bearish" | "Neutral";

export interface AnalysisItem {
  id: string;
  pair: string;
  direction: Direction;
  confidence: number;
  timeAgo: string;
  timeframe: string;
}

export const RECENT_ANALYSES: AnalysisItem[] = [
  {
    id: "a1",
    pair: "EUR/USD",
    direction: "Bullish",
    confidence: 84,
    timeAgo: "2 hours ago",
    timeframe: "H1",
  },
  {
    id: "a2",
    pair: "GBP/USD",
    direction: "Bearish",
    confidence: 76,
    timeAgo: "Yesterday",
    timeframe: "M15",
  },
  {
    id: "a3",
    pair: "XAU/USD",
    direction: "Neutral",
    confidence: 61,
    timeAgo: "Yesterday",
    timeframe: "H4",
  },
];

export interface EconomicEvent {
  id: string;
  currency: "USD" | "EUR" | "GBP" | "JPY";
  title: string;
  time: string;
  impact: "high" | "medium" | "low";
}

export const HIGH_IMPACT_EVENTS: EconomicEvent[] = [
  { id: "e1", currency: "USD", title: "CPI m/m", time: "13:30", impact: "high" },
  { id: "e2", currency: "EUR", title: "ECB Press Conference", time: "14:45", impact: "high" },
  { id: "e3", currency: "GBP", title: "BoE Gov Speaks", time: "16:00", impact: "medium" },
];

export type MarketSentiment = "Bullish" | "Neutral" | "Bearish";

export const MARKET_SENTIMENT: {
  value: MarketSentiment;
  score: number;
} = {
  value: "Bullish",
  score: 68,
};

export interface TradingSession {
  name: "Sydney" | "Tokyo" | "London" | "New York";
  active: boolean;
  volumePct: number;
}

export const SESSIONS: TradingSession[] = [
  { name: "Sydney", active: false, volumePct: 18 },
  { name: "Tokyo", active: false, volumePct: 32 },
  { name: "London", active: true, volumePct: 91 },
  { name: "New York", active: false, volumePct: 64 },
];

export const MOST_ACTIVE_SESSION = SESSIONS.find((s) => s.active)?.name ?? "London";

export const AI_INSIGHTS: string[] = [
  "Avoid trading during major news releases.",
  "Risk management beats prediction.",
  "Your strongest timeframe is H1.",
  "Market structure confirms trend better than indicators alone.",
  "The London–New York overlap carries the deepest liquidity.",
  "A 1:2 risk-reward keeps you profitable at a 40% win rate.",
];

export interface JournalStats {
  winRate: number;
  tradesReviewed: number;
  aiSuggestions: number;
  recentNotes: { id: string; pair: string; note: string; timeAgo: string }[];
}

export const JOURNAL_STATS: JournalStats = {
  winRate: 62,
  tradesReviewed: 48,
  aiSuggestions: 7,
  recentNotes: [
    { id: "n1", pair: "EUR/USD", note: "Waited for the retest before entry — clean execution.", timeAgo: "3h ago" },
    { id: "n2", pair: "US30", note: "Entered too early against structure. Be patient.", timeAgo: "1d ago" },
  ],
};

export type NotificationTone = "info" | "warning" | "success";

export interface DashboardNotification {
  id: string;
  tone: NotificationTone;
  title: string;
  description: string;
  timeAgo: string;
}

export const NOTIFICATIONS: DashboardNotification[] = [
  {
    id: "nt1",
    tone: "warning",
    title: "High-impact news ahead",
    description: "USD CPI in 2 hours.",
    timeAgo: "now",
  },
  {
    id: "nt2",
    tone: "info",
    title: "Explorer plan",
    description: "You have 3 analyses remaining today.",
    timeAgo: "1h ago",
  },
  {
    id: "nt3",
    tone: "success",
    title: "Weekly report ready",
    description: "Your weekly AI report is ready to view.",
    timeAgo: "Today",
  },
];

/** The premium AI analysis sequence (interface only — no real processing yet). */
export const ANALYSIS_STEPS: string[] = [
  "Reading Candlestick Structure",
  "Detecting Support & Resistance",
  "Finding Chart Patterns",
  "Checking Market Structure",
  "Checking Economic Calendar",
  "Calculating Probability",
  "Generating Professional Report",
];

export const ACCEPTED_UPLOAD_FORMATS = [
  "PNG",
  "JPG",
  "JPEG",
  "TradingView",
  "MetaTrader",
  "cTrader",
];
