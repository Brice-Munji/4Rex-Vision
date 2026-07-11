import {
  Plan,
  ExperienceLevel,
  TradingStyle,
  ThemePreference,
} from "@prisma/client";

/** Daily AI-analysis allowance per plan. Logic is prepared; AI is not implemented yet. */
export const PLAN_DAILY_LIMITS: Record<Plan, number> = {
  FREE: 3,
  PROFESSIONAL: Infinity,
  ENTERPRISE: Infinity,
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

/** Product plan names used across the dashboard, billing and pricing surfaces. */
export const PLAN_DISPLAY_NAMES: Record<Plan, string> = {
  FREE: "Explorer",
  PROFESSIONAL: "Rex Pro",
  ENTERPRISE: "Vision Elite",
};

export const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "BEGINNER",
    label: "Beginner",
    description: "New to trading or still learning the fundamentals.",
  },
  {
    value: "INTERMEDIATE",
    label: "Intermediate",
    description: "Comfortable with charts and managing your own positions.",
  },
  {
    value: "PROFESSIONAL",
    label: "Professional",
    description: "Trading is your craft — you want institutional-grade depth.",
  },
];

export const TRADING_STYLE_OPTIONS: {
  value: TradingStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "SCALPING",
    label: "Scalping",
    description: "Fast, frequent trades on the smallest timeframes.",
  },
  {
    value: "DAY_TRADING",
    label: "Day Trading",
    description: "Intraday setups, closed before the session ends.",
  },
  {
    value: "SWING_TRADING",
    label: "Swing Trading",
    description: "Multi-day moves following the broader trend.",
  },
  {
    value: "POSITION_TRADING",
    label: "Position Trading",
    description: "Long-horizon positions driven by macro structure.",
  },
];

export const CURRENCY_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
] as const;

export const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  { value: "DARK", label: "Dark", description: "Easy on the eyes, our default." },
  { value: "LIGHT", label: "Light", description: "Bright and crisp." },
  { value: "SYSTEM", label: "System", description: "Match your device." },
];

export const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days
export const SESSION_MAX_AGE_DEFAULT = 24 * 60 * 60; // 1 day
