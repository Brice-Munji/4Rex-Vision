import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashSectionHeader } from "@/components/dashboard/section-header";
import { UsageAnalytics } from "@/components/dashboard/usage-analytics";
import { AiGrowth } from "@/components/dashboard/ai-growth";
import { DisciplineScore } from "@/components/dashboard/discipline-score";
import { Achievements } from "@/components/dashboard/achievements";
import { ContinueMomentum } from "@/components/dashboard/continue-momentum";

export const metadata: Metadata = {
  title: "AI Growth · 4RexVision",
};

export default async function GrowthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isFree = user.plan === "FREE";

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="AI Growth"
        description="Track how your trading is improving over time."
      />

      <section>
        <DashSectionHeader
          title="Usage analytics"
          description="Your activity and AI engagement at a glance."
        />
        <UsageAnalytics />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AiGrowth />
        <DisciplineScore />
      </div>

      <Achievements />

      {isFree && <ContinueMomentum />}
    </div>
  );
}
