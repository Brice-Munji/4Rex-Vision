import { getSystemHealth } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/super-admin/ui";
import { SystemHealthPanel } from "@/components/super-admin/system-health-panel";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const health = await getSystemHealth();
  return (
    <div>
      <AdminPageHeader
        title="System Health"
        description="Live status of core infrastructure and services."
      />
      <SystemHealthPanel initial={health} />
    </div>
  );
}
