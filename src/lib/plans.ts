import { Compass, Crown, Building2, type LucideIcon } from "lucide-react";
import type { Plan } from "@prisma/client";

export interface PlanFeature {
  label: string;
}

export interface PlanConfig {
  id: Plan;
  name: string;
  tagline: string;
  icon: LucideIcon;
  /** Monthly price in USD (per month). */
  monthly: number;
  /** Yearly price in USD (per month, billed annually). */
  yearlyMonthly: number;
  badge?: "Most Popular" | "Coming Soon";
  comingSoon?: boolean;
  highlight?: boolean;
  features: string[];
  cta: string;
  accent: string; // tailwind gradient classes
}

export const PLANS: PlanConfig[] = [
  {
    id: "FREE",
    name: "Explorer",
    tagline: "Start seeing beyond the charts.",
    icon: Compass,
    monthly: 0,
    yearlyMonthly: 0,
    features: [
      "3 AI analyses per day",
      "Basic AI Analysis",
      "Limited History",
      "Community Support",
    ],
    cta: "Your current plan",
    accent: "from-slate-400 to-slate-500",
  },
  {
    id: "PROFESSIONAL",
    name: "Vision Pro",
    tagline: "Your full-time AI trading partner.",
    icon: Crown,
    monthly: 29,
    yearlyMonthly: 23,
    badge: "Most Popular",
    highlight: true,
    features: [
      "Unlimited AI Analyses",
      "AI Coach",
      "Trading Journal",
      "AI Replay",
      "Market Monitoring",
      "Economic Intelligence",
      "Unlimited Analysis History",
      "Priority AI Processing",
      "Advanced AI Reasoning",
    ],
    cta: "Upgrade to Vision Pro",
    accent: "from-sky-500 to-cyan-400",
  },
  {
    id: "ENTERPRISE",
    name: "Vision Elite",
    tagline: "For teams, firms and institutions.",
    icon: Building2,
    monthly: 0,
    yearlyMonthly: 0,
    badge: "Coming Soon",
    comingSoon: true,
    features: [
      "Multi-user Workspaces",
      "Team Management",
      "For Trading Firms",
      "For Institutions",
      "API Access",
      "Dedicated Support",
    ],
    cta: "Contact Sales",
    accent: "from-indigo-500 to-fuchsia-500",
  },
];

export const PLAN_BY_ID: Record<Plan, PlanConfig> = PLANS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<Plan, PlanConfig>
);

export const YEARLY_DISCOUNT_PCT = 20;

/** Feature comparison matrix used in the animated comparison table. */
export interface ComparisonRow {
  feature: string;
  explorer: boolean | string;
  pro: boolean | string;
  elite: boolean | string;
}

export const COMPARISON_GROUPS: { group: string; rows: ComparisonRow[] }[] = [
  {
    group: "AI Analysis",
    rows: [
      { feature: "Daily AI analyses", explorer: "3 / day", pro: "Unlimited", elite: "Unlimited" },
      { feature: "Advanced AI Reasoning", explorer: false, pro: true, elite: true },
      { feature: "Priority AI Processing", explorer: false, pro: true, elite: true },
      { feature: "AI Replay", explorer: false, pro: true, elite: true },
    ],
  },
  {
    group: "Intelligence",
    rows: [
      { feature: "Economic Intelligence", explorer: false, pro: true, elite: true },
      { feature: "Market Monitoring", explorer: false, pro: true, elite: true },
      { feature: "AI Coach", explorer: false, pro: true, elite: true },
    ],
  },
  {
    group: "Workflow",
    rows: [
      { feature: "Trading Journal", explorer: false, pro: true, elite: true },
      { feature: "Analysis history", explorer: "Limited", pro: "Unlimited", elite: "Unlimited" },
      { feature: "Support", explorer: "Community", pro: "Priority", elite: "Dedicated" },
    ],
  },
  {
    group: "Teams",
    rows: [
      { feature: "Multi-user workspaces", explorer: false, pro: false, elite: true },
      { feature: "Team management", explorer: false, pro: false, elite: true },
      { feature: "API access", explorer: false, pro: false, elite: true },
    ],
  },
];

/** Premium features surfaced as aspirational locked cards for Explorer users. */
export interface LockedFeature {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name resolved by the card
}

export const PREMIUM_FEATURES: LockedFeature[] = [
  {
    key: "ai-replay",
    title: "AI Replay",
    description:
      "Rewind any setup and watch how the AI's read evolved candle by candle.",
    icon: "Rewind",
  },
  {
    key: "market-monitoring",
    title: "Market Monitoring",
    description:
      "The AI watches your pairs 24/7 and alerts you the moment structure shifts.",
    icon: "Radar",
  },
  {
    key: "unlimited-history",
    title: "Unlimited History",
    description:
      "Keep every analysis forever and surface patterns across your whole journey.",
    icon: "Infinity",
  },
  {
    key: "priority-analysis",
    title: "Priority Analysis",
    description:
      "Skip the queue — your charts are processed first with the fastest models.",
    icon: "Zap",
  },
  {
    key: "deep-reasoning",
    title: "Deep AI Reasoning",
    description:
      "Multi-step reasoning that weighs structure, news and probability together.",
    icon: "BrainCircuit",
  },
  {
    key: "ai-coach",
    title: "AI Coach",
    description:
      "Personalized guidance that learns your habits and sharpens your edge.",
    icon: "GraduationCap",
  },
];

export const PRO_UNLOCKS = [
  "Unlimited Analyses",
  "AI Coach",
  "AI Replay",
  "Market Monitoring",
  "Unlimited History",
  "Economic Intelligence",
  "Priority AI Processing",
];

export function formatPrice(value: number): string {
  if (value === 0) return "$0";
  return `$${value}`;
}
