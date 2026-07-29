import "server-only";
import type {
  InitiatePaymentParams,
  InitiateResult,
  PaymentMethodId,
  PaymentProvider,
  VerifyResult,
} from "../types";

/**
 * Demo / sandbox provider.
 *
 * Always "configured" so the checkout flow is fully testable without live
 * payment credentials. It still routes through the exact same server-side
 * verification path — nothing is activated on the client's word.
 *
 * It simulates the asynchronous mobile-money experience: `initiate` returns
 * `inline`, and the modal polls `verify`. A reference containing the marker
 * `-fail-` verifies as `failed`, which lets us exercise the failure UI (the
 * action adds that marker when a test number is used).
 */
export class DemoProvider implements PaymentProvider {
  readonly id = "demo";

  isConfigured(): boolean {
    return true;
  }

  supports(_method: PaymentMethodId): boolean {
    return true;
  }

  async initiate(_params: InitiatePaymentParams): Promise<InitiateResult> {
    return { ok: true, mode: "inline", providerReference: `demo_${_params.reference}` };
  }

  async verify(reference: string): Promise<VerifyResult> {
    if (reference.includes("-fail-")) {
      return { ok: true, status: "failed", providerReference: `demo_${reference}` };
    }
    return { ok: true, status: "success", providerReference: `demo_${reference}` };
  }
}
