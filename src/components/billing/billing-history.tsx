"use client";

import { Download, ReceiptText, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { INVOICES } from "@/lib/billing-data";
import { EmptyState } from "@/components/dashboard/empty-state";

const STATUS: Record<string, string> = {
  Paid: "bg-emerald-500/10 text-emerald-500",
  Open: "bg-amber-500/10 text-amber-500",
  Refunded: "bg-rose-500/10 text-rose-500",
};

export function BillingHistory({ hasHistory = true }: { hasHistory?: boolean }) {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">Billing history</h3>
          <p className="text-sm text-muted-foreground">Invoices and receipts.</p>
        </div>
      </div>

      {hasHistory ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
          {INVOICES.map((inv, i) => (
            <div
              key={inv.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 text-sm transition-colors hover:bg-secondary/40",
                i !== INVOICES.length - 1 && "border-b border-border/40"
              )}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{inv.number}</p>
                <p className="text-xs text-muted-foreground">{inv.date}</p>
              </div>
              <span className="font-medium">{inv.amount}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  STATUS[inv.status]
                )}
              >
                {inv.status}
              </span>
              <button
                aria-label={`Download ${inv.number}`}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={<ReceiptText className="h-8 w-8" />}
            title="No invoices yet"
            description="Your invoices will appear here once you upgrade to a paid plan."
          />
        </div>
      )}
    </div>
  );
}
