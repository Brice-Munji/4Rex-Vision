/**
 * Product + payment-method catalog. Client-safe (no secrets, no server-only) so
 * the checkout modal can render straight from it.
 */
import type { Plan } from "@prisma/client";
import type { PaymentMethodId } from "./types";

export interface RexProduct {
  /** Internal plan this product grants. */
  plan: Exclude<Plan, "FREE">;
  name: string;
  tagline: string;
  priceLabel: string;
  /** Amount in minor units (cents). */
  amount: number;
  currency: string;
  interval: "month";
  features: string[];
}

/** Rex Pro — the single paid subscription. */
export const REX_PRO: RexProduct = {
  plan: "PROFESSIONAL",
  name: "Rex Pro",
  tagline: "Your full-time AI trading partner.",
  priceLabel: "$15.99",
  amount: 1599,
  currency: "USD",
  interval: "month",
  features: [
    "Unlimited AI Analyses",
    "Unlimited RAE",
    "Unlimited AI Chat",
    "Unlimited Journal",
    "Advanced Market Intelligence",
    "PDF Reports",
    "Priority AI Processing",
  ],
};

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** Emoji used as a lightweight, dependency-free icon in the picker. */
  emoji: string;
  region?: string;
  /** Card networks / wallets surfaced under the method. */
  badges?: string[];
  /** Launch priority (1 = Africa-first, 2 = global). */
  priority: 1 | 2;
  /** Whether the method collects a mobile-money phone number. */
  needsPhone?: boolean;
}

/**
 * Ordered as they appear in checkout. Africa-first (priority 1) on top; adding a
 * new rail is a one-line entry here + a provider in `registry.ts`.
 */
export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: "mtn_momo",
    label: "MTN Mobile Money",
    description: "Approve the prompt on your MTN MoMo line.",
    emoji: "📱",
    region: "Cameroon",
    priority: 1,
    needsPhone: true,
  },
  {
    id: "orange_money",
    label: "Orange Money",
    description: "Approve the prompt on your Orange Money line.",
    emoji: "📱",
    region: "Cameroon",
    priority: 1,
    needsPhone: true,
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    description: "Cards, bank transfer & mobile money across Africa.",
    emoji: "🌍",
    priority: 1,
  },
  {
    id: "card",
    label: "Card",
    description: "Visa, Mastercard, Apple Pay & Google Pay.",
    emoji: "💳",
    badges: ["Visa", "Mastercard", "Apple Pay", "Google Pay"],
    priority: 2,
  },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> =
  Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label])) as Record<
    PaymentMethodId,
    string
  >;

export function formatAmount(minor: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      minor / 100
    );
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
