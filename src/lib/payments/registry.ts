import "server-only";
import { FlutterwaveProvider } from "./providers/flutterwave";
import { DemoProvider } from "./providers/demo";
import type { PaymentMethodId, PaymentProvider } from "./types";

/**
 * Provider registry — the single place that decides which rail handles a
 * payment. Priority-ordered: the first *configured* provider that supports the
 * chosen method wins.
 *
 * FUTURE-READY: to add a provider (Paystack, Stripe, a direct MTN/Orange
 * integration, …) implement `PaymentProvider` and add one line here. The
 * subscription system, checkout UI and server actions need no changes.
 */
const PROVIDERS: PaymentProvider[] = [
  new FlutterwaveProvider(),
  // Always-configured fallback so checkout works before live keys are added.
  new DemoProvider(),
];

export function resolveProvider(method: PaymentMethodId): PaymentProvider | null {
  return PROVIDERS.find((p) => p.isConfigured() && p.supports(method)) ?? null;
}

export function getProviderById(id: string): PaymentProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

/** True when a real (non-demo) provider is configured. */
export function isLivePaymentsConfigured(): boolean {
  return PROVIDERS.some((p) => p.id !== "demo" && p.isConfigured());
}
