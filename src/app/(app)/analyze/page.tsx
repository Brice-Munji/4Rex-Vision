import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScanSearch } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getUsageSummary } from "@/lib/usage";
import { PageHeader } from "@/components/dashboard/page-header";
import { RexAnalyzer } from "@/components/rex/rex-analyzer";

export const metadata: Metadata = {
  title: "Analyze Chart · 4RexVision",
};

export default async function AnalyzePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const usage = await getUsageSummary(user);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        icon={<ScanSearch className="h-5 w-5" />}
        title="Analyze Chart"
        description="Upload a chart and let Rex prepare a professional market report."
      />
      <RexAnalyzer
        usage={{
          plan: user.plan,
          used: usage.used,
          limit: usage.unlimited ? 0 : usage.limit,
          unlimited: usage.unlimited,
        }}
      />
    </div>
  );
}
