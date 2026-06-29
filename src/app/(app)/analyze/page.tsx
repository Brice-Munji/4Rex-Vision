import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AiWorkspace } from "@/components/dashboard/workspace/ai-workspace";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";

export const metadata: Metadata = {
  title: "Analyze Chart · 4RexVision AI",
};

export default function AnalyzePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ScanSearch className="h-5 w-5" />}
        title="Analyze Chart"
        description="Upload a screenshot and receive an institutional-grade AI breakdown."
      />
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiWorkspace />
        </div>
        <aside>
          <AiInsightsPanel />
        </aside>
      </div>
    </div>
  );
}
