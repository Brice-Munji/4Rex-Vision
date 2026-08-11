import { getOverview, getLiveActivity, getAnalysisActivity } from "@/lib/admin/queries";
import { AdminPageHeader, AdminCard, SectionTitle } from "@/components/super-admin/ui";
import { KpiGrid } from "@/components/super-admin/kpi-grid";
import { LiveActivity } from "@/components/super-admin/live-activity";
import { AreaChart } from "@/components/super-admin/charts";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [{ kpis }, activity, { series }] = await Promise.all([
    getOverview(),
    getLiveActivity(),
    getAnalysisActivity(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Full operational snapshot of the 4RexVision AI platform."
      />

      <KpiGrid kpis={kpis} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminCard className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>Daily Analyses · Last 30 days</SectionTitle>
          </div>
          <AreaChart data={series} valueKey="count" labelKey="date" height={240} />
        </AdminCard>

        <div className="lg:col-span-1">
          <LiveActivity initial={activity} />
        </div>
      </div>
    </div>
  );
}
