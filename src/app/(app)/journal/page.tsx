import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { JournalPreview } from "@/components/dashboard/journal-preview";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = {
  title: "Trading Journal · 4RexVision AI",
};

export default function JournalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Trading Journal"
        description="Track your trades, review your edge and learn from every setup."
      />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <JournalPreview />
        </div>
        <div className="lg:col-span-2">
          <ComingSoon
            title="Your full journal is on the way"
            description="The journal will auto-log every analysis with notes, tags, screenshots and AI-driven performance reviews."
            features={[
              "Auto-logged analyses",
              "Custom notes & tags",
              "Win-rate analytics",
              "AI performance reviews",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
