import { getProSubscribers } from "@/lib/admin/queries";
import { AdminPageHeader, StatusBadge, formatDate } from "@/components/super-admin/ui";
import { DataTable, type Column } from "@/components/super-admin/data-table";
import type { ProSubscriberRow } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function ProSubscribersPage() {
  const subs = await getProSubscribers();
  const expiringSoon = subs.filter((s) => s.expiringSoon).length;

  const columns: Column<ProSubscriberRow>[] = [
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
    { key: "source", header: "Source", cell: (r) => <StatusBadge value={r.source} /> },
    { key: "started", header: "Started", cell: (r) => <span className="text-[var(--a-muted)]">{formatDate(r.started)}</span> },
    {
      key: "expires",
      header: "Expires",
      cell: (r) => (
        <span className="text-[var(--a-muted)]">
          {r.expires ? formatDate(r.expires) : "Lifetime"}
        </span>
      ),
    },
    {
      key: "days",
      header: "Days Remaining",
      cell: (r) =>
        r.daysRemaining === null ? (
          <span className="text-[#3b82f6]">∞</span>
        ) : (
          <span
            className={
              r.expiringSoon
                ? "font-semibold text-amber-400"
                : r.daysRemaining < 0
                ? "text-rose-400"
                : "text-[var(--a-text)]"
            }
          >
            {r.daysRemaining < 0 ? "Expired" : `${r.daysRemaining}d`}
          </span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Pro Subscribers"
        description={`${subs.length} active Rex Pro ${subs.length === 1 ? "subscriber" : "subscribers"}${
          expiringSoon ? ` · ${expiringSoon} expiring within 7 days` : ""
        }.`}
      />
      <DataTable
        columns={columns}
        rows={subs}
        empty="No Rex Pro subscribers yet."
        rowClassName={(r) => (r.expiringSoon ? "bg-amber-500/[0.04]" : "")}
      />
    </div>
  );
}
