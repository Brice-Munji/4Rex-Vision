import "server-only";
import type {
  InitiatePaymentParams,
  InitiateResult,
  PaymentMethodId,
  PaymentProvider,
  VerifyResult,
} from "../types";

const API_BASE = "https://api.flutterwave.com/v3";

/**
 * Flutterwave provider — a single integration that covers all four launch rails
 * (MTN MoMo & Orange Money for Cameroon, cards, and Flutterwave's own hosted
 * checkout). Secret key is read from the server environment only and is never
 * shipped to the client.
 *
 * Enable by setting `FLUTTERWAVE_SECRET_KEY`. Until then the DemoProvider handles
 * checkout so the flow stays testable.
 */
export class FlutterwaveProvider implements PaymentProvider {
  readonly id = "flutterwave";

  private get secret(): string | undefined {
    return process.env.FLUTTERWAVE_SECRET_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.secret);
  }

  supports(_method: PaymentMethodId): boolean {
    return true;
  }

  /** Map our method ids to Flutterwave `payment_options`. */
  private paymentOptions(method: PaymentMethodId): string | undefined {
    switch (method) {
      case "card":
        return "card";
      case "mtn_momo":
      case "orange_money":
        // Cameroon (XAF) francophone mobile money.
        return "mobilemoneyfranco";
      case "flutterwave":
      default:
        return undefined; // let the hosted page show every option
    }
  }

  async initiate(params: InitiatePaymentParams): Promise<InitiateResult> {
    if (!this.secret) return { ok: false, message: "Flutterwave is not configured." };

    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: params.reference,
          amount: (params.amount / 100).toFixed(2),
          currency: params.currency,
          redirect_url: params.redirectUrl,
          payment_options: this.paymentOptions(params.method),
          customer: {
            email: params.customer.email,
            name: params.customer.name ?? undefined,
            phonenumber: params.customer.phone ?? undefined,
          },
          customizations: {
            title: "Rex Pro",
            description: params.description,
          },
          // Route to the backend-configured recipient for this rail. Attached as
          // metadata so it's recorded with the transaction and available to a
          // direct mobile-money payout integration without any interface change.
          meta: params.destination?.configured
            ? {
                recipient_method: params.destination.method,
                recipient_account: params.destination.account,
                recipient_name: params.destination.ownerName,
              }
            : undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      const json = (await res.json()) as {
        status?: string;
        message?: string;
        data?: { link?: string };
      };

      if (!res.ok || json.status !== "success" || !json.data?.link) {
        return { ok: false, message: json.message ?? "Failed to start payment." };
      }
      return { ok: true, mode: "redirect", redirectUrl: json.data.link };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Network error.",
      };
    }
  }

  async verify(reference: string): Promise<VerifyResult> {
    if (!this.secret) return { ok: false, message: "Flutterwave is not configured." };

    try {
      const res = await fetch(
        `${API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${this.secret}` },
          signal: AbortSignal.timeout(30_000),
        }
      );

      const json = (await res.json()) as {
        status?: string;
        data?: {
          id?: number;
          status?: string;
          amount?: number;
          currency?: string;
        };
      };

      if (!res.ok || json.status !== "success" || !json.data) {
        // No verified transaction yet — treat as still pending, not failed.
        return { ok: true, status: "pending" };
      }

      const providerReference = json.data.id ? String(json.data.id) : undefined;
      const fwStatus = (json.data.status ?? "").toLowerCase();

      if (fwStatus === "successful") {
        return {
          ok: true,
          status: "success",
          providerReference,
          amount: json.data.amount != null ? Math.round(json.data.amount * 100) : undefined,
          currency: json.data.currency,
        };
      }
      if (fwStatus === "pending") {
        return { ok: true, status: "pending", providerReference };
      }
      return { ok: true, status: "failed", providerReference };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Network error.",
      };
    }
  }
}
