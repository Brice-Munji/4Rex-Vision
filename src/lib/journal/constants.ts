/**
 * Client-safe Smart Journal constants & pure helpers (no server imports).
 * Shared by the journal UI, the save modal and the API validation.
 */

export const JOURNAL_EMOTIONS = [
  "Calm",
  "Confident",
  "Hesitant",
  "Fearful",
  "FOMO",
  "Revenge",
  "Impulsive",
  "Patient",
] as const;
export type JournalEmotion = (typeof JOURNAL_EMOTIONS)[number];

export const JOURNAL_TAGS = [
  "Breakout",
  "Reversal",
  "Trend",
  "Range",
  "Liquidity Sweep",
  "London",
  "New York",
  "Gold",
  "News Trade",
] as const;
export type JournalTag = (typeof JOURNAL_TAGS)[number];

export type ResultType = "OPEN" | "WIN" | "LOSS" | "BREAKEVEN";
export const RESULT_TYPES: ResultType[] = ["OPEN", "WIN", "LOSS", "BREAKEVEN"];

export type NewsRisk = "LOW" | "MEDIUM" | "HIGH";
export const NEWS_RISKS: NewsRisk[] = ["LOW", "MEDIUM", "HIGH"];

export type TradeDirection = "Bullish" | "Bearish" | "Neutral";
export const DIRECTIONS: TradeDirection[] = ["Bullish", "Bearish", "Neutral"];

export const TIMEFRAMES = ["M15", "M30", "H1", "H4", "Daily", "Weekly"] as const;

/* Presentation --------------------------------------------------------- */

export const RESULT_STYLE: Record<ResultType, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  WIN: { label: "Win", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  LOSS: { label: "Loss", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  BREAKEVEN: { label: "Breakeven", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export const NEWS_STYLE: Record<NewsRisk, { label: string; className: string }> = {
  LOW: { label: "Low risk", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  MEDIUM: { label: "Medium risk", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  HIGH: { label: "High risk", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

/* DTOs (shared server ↔ client) --------------------------------------- */

export interface JournalOutcomeDTO {
  targetReached: boolean | null;
  mfe: number | null;
  mae: number | null;
  timeToTargetMins: number | null;
  accuracyScore: number | null;
  note: string | null;
  checkedAt: string;
}

export interface JournalEntryDTO {
  id: string;
  analysisId: string | null;
  pair: string;
  timeframe: string | null;
  direction: TradeDirection | null;
  confidence: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  riskAmount: number | null;
  resultType: ResultType;
  resultR: number | null;
  resultAmount: number | null;
  traderNote: string | null;
  newsRisk: NewsRisk | null;
  tags: string[];
  emotions: string[];
  outcome: JournalOutcomeDTO | null;
  createdAt: string;
  closedAt: string | null;
}

export interface JournalStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number; // %
  avgR: number;
  bestPair: string | null;
  bestSession: string | null;
  cumulativeR: { date: string; r: number }[];
}

export function isClosed(r: ResultType): boolean {
  return r !== "OPEN";
}
