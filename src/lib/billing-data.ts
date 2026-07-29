/**
 * Placeholder billing, usage and growth data for the subscription experience.
 * Replace with Stripe data + real analytics queries when those services exist.
 */

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: "Paid" | "Open" | "Refunded";
}

export const INVOICES: Invoice[] = [
  { id: "in_004", number: "INV-2026-004", date: "Jun 1, 2026", amount: "$23.00", status: "Paid" },
  { id: "in_003", number: "INV-2026-003", date: "May 1, 2026", amount: "$23.00", status: "Paid" },
  { id: "in_002", number: "INV-2026-002", date: "Apr 1, 2026", amount: "$23.00", status: "Paid" },
  { id: "in_001", number: "INV-2026-001", date: "Mar 1, 2026", amount: "$23.00", status: "Paid" },
];

export interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export const PAYMENT_METHOD: PaymentMethod = {
  brand: "Visa",
  last4: "4242",
  expMonth: 8,
  expYear: 2028,
};

export interface BillingAddress {
  name: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
  country: string;
}

export const BILLING_ADDRESS: BillingAddress = {
  name: "—",
  line1: "Add a billing address",
  city: "",
  region: "",
  postal: "",
  country: "",
};

/* ----------------------------- Usage analytics ---------------------------- */

export interface UsageStat {
  key: string;
  label: string;
  value: string | number;
  suffix?: string;
  icon: string;
  accent: string;
  delta?: string;
}

export const USAGE_ANALYTICS: UsageStat[] = [
  { key: "today", label: "Today's Analyses", value: 3, icon: "Activity", accent: "text-sky-500 bg-sky-500/10", delta: "+50%" },
  { key: "weekly", label: "Weekly Analyses", value: 18, icon: "CalendarDays", accent: "text-cyan-500 bg-cyan-500/10", delta: "+12%" },
  { key: "monthly", label: "Monthly Analyses", value: 74, icon: "CalendarRange", accent: "text-indigo-500 bg-indigo-500/10", delta: "+8%" },
  { key: "confidence", label: "Avg AI Confidence", value: 82, suffix: "%", icon: "Gauge", accent: "text-emerald-500 bg-emerald-500/10", delta: "+6%" },
  { key: "journal", label: "Journal Entries", value: 48, icon: "BookOpen", accent: "text-amber-500 bg-amber-500/10", delta: "+4" },
  { key: "time", label: "Est. Time Saved", value: 26, suffix: "h", icon: "Clock", accent: "text-fuchsia-500 bg-fuchsia-500/10", delta: "+3h" },
  { key: "pair", label: "Most Analyzed Pair", value: "EUR/USD", icon: "TrendingUp", accent: "text-sky-500 bg-sky-500/10" },
  { key: "session", label: "Favorite Session", value: "London", icon: "Clock4", accent: "text-rose-500 bg-rose-500/10" },
  { key: "timeframe", label: "Favorite Timeframe", value: "H1", icon: "LineChart", accent: "text-violet-500 bg-violet-500/10" },
];

/* ------------------------------- AI Growth -------------------------------- */

export interface GrowthMetric {
  key: string;
  label: string;
  value: number; // 0-100 (or count for analyses)
  display: string;
  trend: string;
}

export const AI_GROWTH: GrowthMetric[] = [
  { key: "analyses", label: "Analyses Completed", value: 74, display: "128", trend: "+18 this month" },
  { key: "discipline", label: "Trading Discipline", value: 88, display: "88%", trend: "+4 vs last month" },
  { key: "patience", label: "Patience Score", value: 81, display: "81%", trend: "+7 vs last month" },
  { key: "risk", label: "Risk Management", value: 90, display: "90%", trend: "+2 vs last month" },
  { key: "journal", label: "Journal Consistency", value: 76, display: "76%", trend: "+11 vs last month" },
  { key: "confidence", label: "Decision Confidence", value: 84, display: "84%", trend: "+5 vs last month" },
];

/* ------------------------------ Achievements ------------------------------ */

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number; // 0-100 for locked
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: "100-analyses", title: "100 Analyses Completed", description: "Logged your 100th AI analysis.", icon: "Target", unlocked: true },
  { key: "10-reviewed", title: "First 10 Reviewed Trades", description: "Reviewed 10 trades in your journal.", icon: "CheckCheck", unlocked: true },
  { key: "30-day-streak", title: "30-Day Journal Streak", description: "Journaled every day for a month.", icon: "Flame", unlocked: false, progress: 73 },
  { key: "90-discipline", title: "90% Trading Discipline", description: "Reached a 90% discipline grade.", icon: "ShieldCheck", unlocked: false, progress: 88 },
];

/* --------------------------- Trading discipline --------------------------- */

export const DISCIPLINE = {
  score: 88,
  grade: "A−",
  strengths: ["Risk Management", "Journal Consistency", "Patience"],
  needsWork: ["Entering Before Confirmation", "Trading During High Impact News"],
};

/* --------------------------- Progress comparison -------------------------- */

export interface ComparisonStat {
  key: string;
  label: string;
  today: string;
  yesterday: string;
  delta: string;
  positive: boolean;
}

export const PROGRESS_COMPARISON: ComparisonStat[] = [
  { key: "analyses", label: "Today's Analyses", today: "3", yesterday: "2", delta: "+50%", positive: true },
  { key: "confidence", label: "Average AI Confidence", today: "82%", yesterday: "76%", delta: "+6%", positive: true },
  { key: "discipline", label: "Trading Discipline", today: "88", yesterday: "84", delta: "+4", positive: true },
  { key: "journal", label: "Journal Entries", today: "2", yesterday: "1", delta: "+100%", positive: true },
];

/* --------------------------- End-of-day summary --------------------------- */

export interface SummaryStat {
  key: string;
  label: string;
  value: string | number;
  suffix?: string;
  icon: string;
  accent: string;
}

export const TODAY_SUMMARY_STATS: SummaryStat[] = [
  { key: "charts", label: "Charts Analyzed", value: 3, icon: "ScanSearch", accent: "text-sky-500 bg-sky-500/10" },
  { key: "bullish", label: "Bullish Setups", value: 2, icon: "TrendingUp", accent: "text-emerald-500 bg-emerald-500/10" },
  { key: "bearish", label: "Bearish Setups", value: 1, icon: "TrendingDown", accent: "text-rose-500 bg-rose-500/10" },
  { key: "neutral", label: "Neutral Setups", value: 0, icon: "Minus", accent: "text-amber-500 bg-amber-500/10" },
  { key: "confidence", label: "Avg AI Confidence", value: 82, suffix: "%", icon: "Gauge", accent: "text-cyan-500 bg-cyan-500/10" },
  { key: "news", label: "High Impact News", value: 4, icon: "CalendarClock", accent: "text-fuchsia-500 bg-fuchsia-500/10" },
  { key: "journal", label: "Journal Entries", value: 2, icon: "BookOpen", accent: "text-indigo-500 bg-indigo-500/10" },
  { key: "time", label: "Est. Time Saved", value: 2.5, suffix: "h", icon: "Clock", accent: "text-violet-500 bg-violet-500/10" },
];

export const TODAY_SUMMARY_MESSAGE =
  "Excellent work today. You've completed today's Explorer analyses. Today's market showed mostly bullish opportunities with an average AI confidence of 82%. I also detected four high-impact economic events that could affect market volatility. Come back tomorrow for three new analyses — or continue today with Vision Pro.";

/* ------------------------------ Notifications ----------------------------- */

export const BILLING_NOTIFICATIONS = [
  { id: "bn1", tone: "success", title: "Subscription renewed", description: "Your Vision Pro plan renewed successfully.", timeAgo: "Today" },
  { id: "bn2", tone: "info", title: "Explorer analyses refreshed", description: "Your 3 daily analyses are available again.", timeAgo: "Today" },
  { id: "bn3", tone: "success", title: "Payment successful", description: "We received your payment of $23.00.", timeAgo: "Jun 1" },
  { id: "bn4", tone: "info", title: "Invoice available", description: "Invoice INV-2026-004 is ready to download.", timeAgo: "Jun 1" },
] as const;
