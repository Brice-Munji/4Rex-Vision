import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_DISPLAY_NAMES } from "@/lib/constants";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AiWorkspace } from "@/components/dashboard/workspace/ai-workspace";
import { RecentAnalyses } from "@/components/dashboard/recent-analyses";
import { JournalPreview } from "@/components/dashboard/journal-preview";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { NotificationsCard } from "@/components/dashboard/notifications-card";

export const metadata: Metadata = {
  title: "Command Center · 4RexVision AI",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const usage = await getUsageSummary(user);

  return (
    <div className="space-y-8">
      <WelcomeHero
        firstName={user.firstName ?? "Trader"}
        planDisplay={PLAN_DISPLAY_NAMES[user.plan]}
        used={usage.used}
        limit={usage.unlimited ? 0 : usage.limit}
        unlimited={usage.unlimited}
      />

      <MarketOverview />

      <QuickActions />

      {/* main grid: workspace + insights rail */}
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <AiWorkspace />
          <RecentAnalyses />
        </div>

        <aside className="space-y-6">
          <AiInsightsPanel />
          <NotificationsCard />
          <JournalPreview />
        </aside>
      </div>
    </div>
  );
}
