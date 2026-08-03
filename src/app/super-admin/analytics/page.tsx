import { getAnalytics } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/super-admin/ui";
import { AnalyticsView } from "@/components/super-admin/analytics-view";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Growth, conversion, usage, and revenue intelligence."
      />
      <AnalyticsView data={data} />
    </div>
  );
}
