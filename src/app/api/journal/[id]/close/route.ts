import { NextResponse } from "next/server";
import { getJournalAccess } from "@/lib/journal/access";
import { closeEntry } from "@/lib/journal/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.canEdit) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

  const entry = await closeEntry(access.user.id, id, {
    exitPrice: num(body.exitPrice),
    resultAmount: num(body.resultAmount),
    resultR: num(body.resultR),
    note: typeof body.note === "string" ? body.note : null,
  });
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ entry });
}
