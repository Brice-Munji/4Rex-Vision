import { getAuditLogs } from "@/lib/admin/queries";
import { AdminPageHeader, formatDate } from "@/components/super-admin/ui";
import { DataTable, type Column } from "@/components/super-admin/data-table";
import type { AuditRow } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  "Granted Pro": "text-emerald-400",
  "Extended Pro": "text-sky-400",
  "Revoked Pro": "text-rose-400",
  "Reset analyses": "text-amber-400",
  "Suspended user": "text-rose-400",
  "Unsuspended user": "text-emerald-400",
  "Changed settings": "text-[#3b82f6]",
};

export default async function AuditLogsPage() {
  const logs = await getAuditLogs();

  const columns: Column<AuditRow>[] = [
    {
      key: "time",
      header: "Timestamp",
      cell: (r) => <span className="text-[var(--a-muted)]">{formatDate(r.timestamp, true)}</span>,
    },
    { key: "admin", header: "Admin", cell: (r) => <span className="text-[var(--a-text)]">{r.admin}</span> },
    {
      key: "action",
      header: "Action",
      cell: (r) => (
        <span className={`font-medium ${ACTION_COLORS[r.action] ?? "text-[var(--a-text)]"}`}>
          {r.action}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target User",
      cell: (r) => <span className="text-[var(--a-muted)]">{r.targetUser ?? "—"}</span>,
    },
    {
      key: "details",
      header: "Details",
      cell: (r) => <span className="text-[var(--a-muted)]">{r.details ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Audit Logs"
        description="Immutable record of every privileged admin action."
      />
      <DataTable columns={columns} rows={logs} empty="No admin actions logged yet." />
    </div>
  );
}
