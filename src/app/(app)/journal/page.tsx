import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { JournalPreviewLocked } from "@/components/journal/journal-preview-locked";
import { JournalDashboard } from "@/components/journal/journal-dashboard";
import { getJournalAccess } from "@/lib/journal/access";

export const metadata: Metadata = {
  title: "Smart Journal · 4RexVision AI",
};

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const access = await getJournalAccess();
  if (!access) redirect("/login");

  // Free users with no journal data see the premium locked preview.
  if (!access.canView) {
    return <JournalPreviewLocked />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Smart Journal"
        description="Turn every analysis into a measurable trading journey."
      />
      <JournalDashboard initialCanEdit={access.canEdit} />
    </div>
  );
}
