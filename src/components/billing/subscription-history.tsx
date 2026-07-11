"use client";

import { ReceiptText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PAYMENT_METHOD_LABELS, formatAmount } from "@/lib/payments/catalog";
import type { PaymentMethodId } from "@/lib/payments/types";

export interface TransactionRow {
  id: string;
  reference: string;
  method: string;
  provider: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  amount: number;
  currency: string;
  date: string;
  description: string | null;
}

const STATUS_META: Record<
  TransactionRow["status"],
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SUCCESS: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  PENDING: { label: "Pending", cls: "bg-amber-500/10 text-amber-500", icon: Clock },
  FAILED: { label: "Failed", cls: "bg-rose-500/10 text-rose-500", icon: XCircle },
};

export function SubscriptionHistory({ items }: { items: TransactionRow[] }) {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">Subscription history</h3>
          <p className="text-sm text-muted-foreground">Payments and receipts.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
          {items.map((tx, i) => {
            const meta = STATUS_META[tx.status];
            const Icon = meta.icon;
            const methodLabel =
              PAYMENT_METHOD_LABELS[tx.method as PaymentMethodId] ?? tx.method;
            return (
              <div
                key={tx.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 text-sm transition-colors hover:bg-secondary/40",
                  i !== items.length - 1 && "border-b border-border/40"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    tx.status === "SUCCESS"
                      ? "text-emerald-500"
                      : tx.status === "PENDING"
                        ? "text-amber-500"
                        : "text-rose-500"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {tx.description ?? "Rex Pro — monthly subscription"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.date} · {methodLabel}
                  </p>
                </div>
                <span className="font-medium">{formatAmount(tx.amount, tx.currency)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    meta.cls
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={<ReceiptText className="h-8 w-8" />}
            title="No payments yet"
            description="Your subscription payments will appear here once you upgrade to Rex Pro."
          />
        </div>
      )}
    </div>
  );
}
