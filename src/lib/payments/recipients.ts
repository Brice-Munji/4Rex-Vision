import "server-only";
import type { PaymentDestination, PaymentMethodId } from "./types";

/**
 * Payment recipient (destination) configuration — the SINGLE backend source of
 * truth for *where* each rail's money is received.
 *
 * SECURITY
 *  - Recipient numbers live in environment variables only, never in the repo or
 *    the frontend bundle. This module is `server-only`, so importing it from a
 *    client component is a build error.
 *  - The checkout modal collects the *payer's* phone; it never sees these
 *    receiving accounts. The backend resolves the destination at payment time.
 *
 * OWNER CONFIGURATION
 *  - Change a number by editing its env var — no code change, no redeploy of the
 *    frontend. The account owner name is a single shared config value
 *    (`PAYMENT_OWNER_NAME`).
 *
 * FUTURE EXPANSION
 *  - Add a rail by appending one entry to `RECIPIENTS`. Rails that settle to a
 *    provider merchant account (cards, hosted Flutterwave, Stripe, PayPal, …)
 *    don't need a per-recipient number here — they authenticate with that
 *    provider's own keys — so they simply have no entry and `getPaymentDestination`
 *    returns `null` for them.
 */

interface RecipientEnvConfig {
  method: PaymentMethodId;
  /** Human label for the rail. */
  label: string;
  /** Env var holding the receiving account number for this rail. */
  accountEnv: string;
  /** ISO country the rail settles in. */
  country?: string;
  /** Settlement currency for the rail. */
  currency?: string;
}

/**
 * Rails that credit a specific receiving account. Extend this list to onboard a
 * new direct-payout rail; nothing else in the payment interface changes.
 */
const RECIPIENTS: RecipientEnvConfig[] = [
  {
    method: "mtn_momo",
    label: "MTN Mobile Money",
    accountEnv: "PAYMENT_MTN_MOMO_NUMBER",
    country: "CM",
    currency: "XAF",
  },
  {
    method: "orange_money",
    label: "Orange Money",
    accountEnv: "PAYMENT_ORANGE_MONEY_NUMBER",
    country: "CM",
    currency: "XAF",
  },
];

/** The configured account owner, shared across every rail. */
function ownerName(): string {
  return process.env.PAYMENT_OWNER_NAME?.trim() || "4RexVision AI";
}

/** Read + trim the receiving account for a rail (null when unset). */
function accountFor(cfg: RecipientEnvConfig): string | null {
  const raw = process.env[cfg.accountEnv];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Resolve the receiving account for a payment method. Returns `null` when the
 * rail has no configured recipient (e.g. cards settle to the provider merchant
 * account, not a number). Always resolved server-side.
 */
export function getPaymentDestination(
  method: PaymentMethodId
): PaymentDestination | null {
  const cfg = RECIPIENTS.find((r) => r.method === method);
  if (!cfg) return null;

  const account = accountFor(cfg);
  return {
    method: cfg.method,
    label: cfg.label,
    ownerName: ownerName(),
    account,
    country: cfg.country,
    currency: cfg.currency,
    configured: account !== null,
  };
}

/** All configured destinations — handy for a backend health/config check. */
export function listPaymentDestinations(): PaymentDestination[] {
  return RECIPIENTS.map((r) => getPaymentDestination(r.method)!).filter(
    (d): d is PaymentDestination => d !== null
  );
}

/** True when every rail that requires a recipient has one configured. */
export function areRecipientsConfigured(): boolean {
  return listPaymentDestinations().every((d) => d.configured);
}
