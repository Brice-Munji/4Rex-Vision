import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getJournalAccess } from "@/lib/journal/access";
import { getEntry } from "@/lib/journal/service";
import { TradeDetail } from "@/components/journal/trade-detail";

export const metadata: Metadata = {
  title: "Trade · Smart Journal · 4RexVision",
};

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getJournalAccess();
  if (!access) redirect("/login");
  // Free users (no data) can't view individual trades — send to the preview.
  if (!access.canView) redirect("/journal");

  const { id } = await params;
  const entry = await getEntry(access.user.id, id);
  if (!entry) notFound();

  return <TradeDetail entry={entry} canEdit={access.canEdit} />;
}
