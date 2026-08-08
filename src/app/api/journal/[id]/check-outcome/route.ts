import { NextResponse } from "next/server";
import { getJournalAccess } from "@/lib/journal/access";
import { checkOutcome } from "@/lib/journal/service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.canEdit) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const entry = await checkOutcome(access.user.id, id);
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ entry });
}
