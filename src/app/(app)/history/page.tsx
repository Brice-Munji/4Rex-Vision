import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecentAnalyses } from "@/components/dashboard/recent-analyses";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Analysis History · 4RexVision AI",
};

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Analysis History"
        description="Every AI report you've generated, searchable and reviewable."
      />
      <RecentAnalyses />
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
