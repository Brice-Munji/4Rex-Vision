/**
 * Provider-agnostic payment contracts.
 *
 * Everything the app knows about a payment flows through these types, so adding
 * a new provider (Paystack, Stripe, a direct MTN/Orange integration, …) never
 * touches the subscription system — you only implement `PaymentProvider` and
 * register it in `registry.ts`.
 */

/** The payment rails a user can pick in checkout. */
export type PaymentMethodId = "mtn_momo" | "orange_money" | "flutterwave" | "card";

export interface PaymentCustomer {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
}

/**
 * Where a payment is routed — the business's receiving account for a rail
 * (e.g. an MTN MoMo / Orange Money number). Values come exclusively from
 * backend configuration (see `recipients.ts`); the raw account number is never
 * sent to the client. This is a plain type, so sharing it here leaks nothing.
 */
export interface PaymentDestination {
  method: PaymentMethodId;
  /** Human label for the rail (e.g. "MTN Mobile Money"). */
  label: string;
  /** Configured account owner (backend config, shared across rails). */
  ownerName: string;
  /** Recipient account identifier — a mobile-money number, merchant id, … */
  account: string | null;
  /** ISO country the rail settles in (mobile money = Cameroon). */
  country?: string;
  /** Settlement currency for the rail (mobile money = XAF). */
  currency?: string;
  /** True only when a recipient account is actually configured. */
  configured: boolean;
}

export interface InitiatePaymentParams {
  /** Our own idempotent transaction reference. */
  reference: string;
  method: PaymentMethodId;
  /** Amount in minor units (e.g. cents). */
  amount: number;
  currency: string;
  customer: PaymentCustomer;
  description: string;
  /** Absolute URL the provider redirects back to after a hosted payment. */
  redirectUrl: string;
  /**
   * Resolved recipient for this rail (optional & non-breaking). Providers that
   * credit a specific account (direct mobile money) route to it; providers that
   * settle to their own merchant account (cards, hosted Flutterwave) may ignore
   * or attach it as metadata.
   */
  destination?: PaymentDestination;
}

export type InitiateResult =
  | {
      ok: true;
      /** Provider hosts a checkout page — send the user to `redirectUrl`. */
      mode: "redirect";
      redirectUrl: string;
      providerReference?: string;
    }
  | {
      ok: true;
      /** Payment is confirmed out-of-band (mobile-money prompt) — poll verify. */
      mode: "inline";
      providerReference?: string;
    }
  | { ok: false; message: string };

export type PaymentOutcome = "success" | "pending" | "failed";

export type VerifyResult =
  | {
      ok: true;
      status: PaymentOutcome;
      providerReference?: string;
      amount?: number;
      currency?: string;
    }
  /** Transport / configuration error — the payment state is unknown. */
  | { ok: false; message: string };

/**
 * A payment rail implementation. Providers are stateless and never touch the
 * database — verification results are returned to the caller, which is the
 * single place that activates a subscription.
 */
export interface PaymentProvider {
  readonly id: string;
  isConfigured(): boolean;
  supports(method: PaymentMethodId): boolean;
  initiate(params: InitiatePaymentParams): Promise<InitiateResult>;
  verify(reference: string, providerReference?: string): Promise<VerifyResult>;
}
