"use client";

import { CreditCard, ShieldCheck } from "lucide-react";
import { UnlockRexProButton } from "./unlock-rex-pro";
import { PAYMENT_METHODS } from "@/lib/payments/catalog";
import type { PaymentMethodId } from "@/lib/payments/types";

/**
 * Shows the payment rail currently backing the subscription. "Change" reopens
 * the checkout modal so the user can switch method (MTN, Orange, card, …).
 */
export function ActivePaymentMethod({
  method,
}: {
  method: PaymentMethodId | null;
}) {
  const meta = method ? PAYMENT_METHODS.find((m) => m.id === method) : null;

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <CreditCard className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">Payment method</h3>
      </div>

      {meta ? (
        <>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-12 items-center justify-center rounded-lg bg-secondary text-xl">
                {meta.emoji}
              </span>
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="text-xs text-muted-foreground">
                  {meta.region ? `${meta.region} · ` : ""}Active
                </p>
              </div>
            </div>
            <UnlockRexProButton label="Change" variant="ghost" size="sm" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Payments are verified securely on our servers.
          </p>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">
            No payment method on file yet.
          </p>
          <div className="mt-3 flex justify-center">
            <UnlockRexProButton label="Add payment method" variant="secondary" size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}
