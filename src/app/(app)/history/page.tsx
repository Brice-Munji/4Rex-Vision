import type { Metadata } from "next";
import { History } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnalysisHistoryList } from "@/components/dashboard/analysis-history-list";
import { getAnalysisHistory } from "@/lib/rex/history";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Analysis History · 4RexVision",
};

// Always render fresh so a just-completed analysis is present on first paint.
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const initial = await getAnalysisHistory(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Analysis History"
        description="Every AI report you've generated, searchable and reviewable."
      />
      <AnalysisHistoryList initial={initial} />
      <ComingSoon
        title="Searchable history & filters coming soon"
        description="Soon you'll filter by pair, direction, confidence and date, and revisit full reports."
        features={[
          "Filter by pair & direction",
          "Confidence sorting",
          "Date range search",
          "Full report replay",
        ]}
      />
    </div>
  );
}
