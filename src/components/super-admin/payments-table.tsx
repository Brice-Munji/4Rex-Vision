"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "./data-table";
import { StatusBadge, formatCurrency, formatDate } from "./ui";
import type { PaymentRow } from "@/lib/admin/queries";

const STATUSES = ["all", "success", "pending", "failed", "refunded"];

export function PaymentsTable({
  initial,
  providers,
}: {
  initial: PaymentRow[];
  providers: string[];
}) {
  const [rows, setRows] = React.useState<PaymentRow[]>(initial);
  const [provider, setProvider] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  const load = React.useCallback(async (p: string, s: string) => {
    const params = new URLSearchParams();
    if (p !== "all") params.set("provider", p);
    if (s !== "all") params.set("status", s);
    const res = await fetch(`/api/admin/payments?${params.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setRows(data.payments ?? []);
    }
  }, []);

  React.useEffect(() => {
    load(provider, status);
  }, [provider, status, load]);

  const columns: Column<PaymentRow>[] = [
    {
      key: "user",
      header: "User",
      cell: (r) => (
        <div>
          <div className="font-medium text-[var(--a-text)]">{r.user}</div>
          <div className="text-xs text-[var(--a-muted)]">{r.email}</div>
        </div>
      ),
    },
    { key: "provider", header: "Provider", cell: (r) => <span className="capitalize text-[var(--a-text)]">{r.provider}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => (
        <span className="font-medium text-[var(--a-text)]">
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
    },
    { key: "currency", header: "Currency", cell: (r) => <span className="text-[var(--a-muted)]">{r.currency}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { key: "date", header: "Date", cell: (r) => <span className="text-[var(--a-muted)]">{formatDate(r.date, true)}</span> },
    {
      key: "tx",
      header: "Transaction ID",
      cell: (r) => (
        <span className="font-mono text-xs text-[var(--a-muted)]">{r.transactionId}</span>
      ),
    },
  ];

  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
        active
          ? "border-[#3b82f6] bg-[#3b82f6]/12 text-[var(--a-text)]"
          : "border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-muted)] hover:text-[var(--a-text)]"
      )}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--a-muted)]">
            Provider
          </span>
          <Chip active={provider === "all"} onClick={() => setProvider("all")}>
            All
          </Chip>
          {providers.map((p) => (
            <Chip key={p} active={provider === p} onClick={() => setProvider(p)}>
              {p}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--a-muted)]">
            Status
          </span>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={rows} empty="No payments match these filters." />
    </div>
  );
}
