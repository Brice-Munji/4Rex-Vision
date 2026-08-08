import { NextResponse } from "next/server";
import { getJournalAccess } from "@/lib/journal/access";
import { getEntry, updateEntry } from "@/lib/journal/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.canView) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const entry = await getEntry(access.user.id, id);
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ entry, canEdit: access.canEdit }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.canEdit) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : undefined);

  const entry = await updateEntry(access.user.id, id, {
    traderNote: typeof body.traderNote === "string" ? body.traderNote : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    emotions: Array.isArray(body.emotions) ? body.emotions : undefined,
    entryPrice: num(body.entryPrice),
    stopLoss: num(body.stopLoss),
    takeProfit: num(body.takeProfit),
    lotSize: num(body.lotSize),
    riskAmount: num(body.riskAmount),
  });
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ entry });
}
