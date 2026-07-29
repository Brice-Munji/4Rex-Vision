import "server-only";
import type { BillingCycle, Plan } from "@prisma/client";

/**
 * Stripe integration scaffold.
 *
 * This prepares the platform for Stripe without shipping live payments. Secret
 * keys are read from the server environment only and are NEVER exposed to the
 * client. When you're ready to go live:
 *   1. `npm i stripe`
 *   2. set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and the price IDs below
 *   3. implement the TODOs using the official SDK
 *
 * Until then `isStripeConfigured()` returns false and the app runs in a
 * simulated billing mode (plan changes are applied directly in the database).
 */

export const STRIPE_PRICE_IDS: Record<
  Exclude<Plan, "FREE">,
  Record<BillingCycle, string | undefined>
> = {
  PROFESSIONAL: {
    MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  ENTERPRISE: {
    MONTHLY: process.env.STRIPE_PRICE_ELITE_MONTHLY,
    YEARLY: process.env.STRIPE_PRICE_ELITE_YEARLY,
  },
};

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface CheckoutParams {
  userId: string;
  email: string;
  plan: Exclude<Plan, "FREE">;
  cycle: BillingCycle;
  promoCode?: string;
}

/**
 * Create a Stripe Checkout session and return its URL.
 * Returns null while Stripe is not configured (simulated mode).
 */
export async function createCheckoutSession(
  _params: CheckoutParams
): Promise<{ url: string } | null> {
  if (!isStripeConfigured()) return null;
  // TODO: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // const session = await stripe.checkout.sessions.create({ ... })
  // return { url: session.url! }
  return null;
}

/** Create a Stripe Billing Portal session for managing the subscription. */
export async function createBillingPortalSession(
  _customerId: string
): Promise<{ url: string } | null> {
  if (!isStripeConfigured()) return null;
  // TODO: stripe.billingPortal.sessions.create({ customer: customerId, ... })
  return null;
}

/** Verify and parse a Stripe webhook payload. */
export async function constructWebhookEvent(
  _payload: string | Buffer,
  _signature: string
): Promise<unknown | null> {
  if (!isStripeConfigured()) return null;
  // TODO: stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  return null;
}
