"use client";

import { CreditCard, Plus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD, BILLING_ADDRESS } from "@/lib/billing-data";

export function PaymentMethodCard({ hasMethod = true }: { hasMethod?: boolean }) {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <CreditCard className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">Payment method</h3>
      </div>

      {hasMethod ? (
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white">
              {PAYMENT_METHOD.brand}
            </div>
            <div>
              <p className="text-sm font-medium">
                •••• •••• •••• {PAYMENT_METHOD.last4}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires {String(PAYMENT_METHOD.expMonth).padStart(2, "0")}/
                {PAYMENT_METHOD.expYear}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
            Update
          </Button>
        </div>
      ) : (
        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-sky-500/40 hover:text-foreground">
          <Plus className="h-4 w-4" />
          Add payment method
        </button>
      )}
    </div>
  );
}

export function BillingAddressCard() {
  const filled = BILLING_ADDRESS.name !== "—";
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <MapPin className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">Billing address</h3>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-4">
        {filled ? (
          <address className="text-sm not-italic leading-relaxed text-foreground/90">
            {BILLING_ADDRESS.name}
            <br />
            {BILLING_ADDRESS.line1}
            <br />
            {BILLING_ADDRESS.city}, {BILLING_ADDRESS.region} {BILLING_ADDRESS.postal}
            <br />
            {BILLING_ADDRESS.country}
          </address>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{BILLING_ADDRESS.line1}</p>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
