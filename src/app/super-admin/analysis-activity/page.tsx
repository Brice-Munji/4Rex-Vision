import { getAnalysisActivity } from "@/lib/admin/queries";
import { AdminPageHeader, AdminCard, SectionTitle } from "@/components/super-admin/ui";
import { DataTable, type Column } from "@/components/super-admin/data-table";
import { AreaChart } from "@/components/super-admin/charts";
import type { UserActivityRow } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AnalysisActivityPage() {
  const { rows, series } = await getAnalysisActivity();
  const totalToday = rows.reduce((s, r) => s + r.today, 0);
  const totalLifetime = rows.reduce((s, r) => s + r.lifetime, 0);

  const num = (n: number) => <span className="tabular-nums text-[var(--a-text)]">{n}</span>;

  const columns: Column<UserActivityRow>[] = [
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
    { key: "today", header: "Today", cell: (r) => num(r.today) },
    { key: "yesterday", header: "Yesterday", cell: (r) => num(r.yesterday) },
    { key: "last7", header: "Last 7d", cell: (r) => num(r.last7) },
    { key: "last30", header: "Last 30d", cell: (r) => num(r.last30) },
    { key: "lifetime", header: "Lifetime", cell: (r) => num(r.lifetime) },
    {
      key: "pair",
      header: "Top Pair",
      cell: (r) =>
        r.topPair ? (
          <span className="rounded-md bg-[var(--a-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--a-text)]">
            {r.topPair}
          </span>
        ) : (
          <span className="text-[var(--a-muted)]">—</span>
        ),
    },
    {
      key: "conf",
      header: "Avg Conf.",
      cell: (r) =>
        r.avgConfidence !== null ? (
          <span className="text-[var(--a-text)]">{r.avgConfidence}%</span>
        ) : (
          <span className="text-[var(--a-muted)]">—</span>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Analysis Activity"
        description="Per-user chart analysis usage across every time window."
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminCard className="p-5 lg:col-span-2">
          <SectionTitle>Platform Analyses · Last 30 days</SectionTitle>
          <div className="mt-4">
            <AreaChart data={series} valueKey="count" labelKey="date" height={220} />
          </div>
        </AdminCard>
        <AdminCard className="flex flex-col justify-center gap-6 p-5">
          <div>
            <p className="text-sm text-[var(--a-muted)]">Analyses Today</p>
            <p className="mt-1 text-3xl font-bold text-[var(--a-text)]">{totalToday}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--a-muted)]">Lifetime Analyses</p>
            <p className="mt-1 text-3xl font-bold text-[var(--a-text)]">{totalLifetime}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--a-muted)]">Tracked Users</p>
            <p className="mt-1 text-3xl font-bold text-[var(--a-text)]">{rows.length}</p>
          </div>
        </AdminCard>
      </div>

      <DataTable columns={columns} rows={rows} empty="No analysis activity recorded yet." />
    </div>
  );
}
