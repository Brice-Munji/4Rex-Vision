import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getUsageSummary } from "@/lib/usage";
import { getAnalysisHistory } from "@/lib/rex/history";
import { PLAN_DISPLAY_NAMES } from "@/lib/constants";
import type { AnalysisItem, Direction } from "@/lib/dashboard-data";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ExplorerWorkspace } from "@/components/dashboard/explorer-workspace";
import { RecentAnalyses } from "@/components/dashboard/recent-analyses";
import { JournalPreview } from "@/components/dashboard/journal-preview";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { SubscriptionStatus } from "@/components/dashboard/subscription-status";
import { NotificationsCard } from "@/components/dashboard/notifications-card";
import { ContinueMomentum } from "@/components/dashboard/continue-momentum";
import { LockedFeatureGrid } from "@/components/dashboard/locked-feature-card";
import { DashSectionHeader } from "@/components/dashboard/section-header";

export const metadata: Metadata = {
  title: "Command Center · 4RexVision AI",
};

export const dynamic = "force-dynamic";

function relativeLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const usage = await getUsageSummary(user);
  const isFree = user.plan === "FREE";

  // Real recent analyses (newest first) — replaces placeholder data.
  const recent: AnalysisItem[] = (await getAnalysisHistory(user.id, 6)).map((r) => ({
    id: r.id,
    pair: r.pair ?? "Unknown pair",
    direction: (r.direction === "Bullish" || r.direction === "Bearish" || r.direction === "Neutral"
      ? r.direction
      : "Neutral") as Direction,
    confidence: r.confidence ?? 0,
    timeAgo: relativeLabel(r.createdAt),
    timeframe: r.timeframe ?? "—",
  }));

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
          <ExplorerWorkspace
            plan={user.plan}
            used={usage.used}
            limit={usage.unlimited ? 0 : usage.limit}
            unlimited={usage.unlimited}
          />
          <RecentAnalyses items={recent} />
        </div>

        <aside className="space-y-6">
          <SubscriptionStatus
            plan={user.plan}
            used={usage.used}
            limit={usage.unlimited ? 0 : usage.limit}
            unlimited={usage.unlimited}
          />
          <AiInsightsPanel />
          <NotificationsCard />
          <JournalPreview />
        </aside>
      </div>

      {/* Aspirational premium features for Explorer users */}
      {isFree && (
        <>
          <section>
            <DashSectionHeader
              title="Unlock with Vision Pro"
              description="Premium intelligence that compounds your edge over time."
              action={{ label: "See plans", href: "/billing" }}
            />
            <LockedFeatureGrid />
          </section>

          <ContinueMomentum />
        </>
      )}
    </div>
  );
}
