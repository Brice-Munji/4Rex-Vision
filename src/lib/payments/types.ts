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
