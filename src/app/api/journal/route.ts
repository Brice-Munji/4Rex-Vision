import { NextResponse } from "next/server";
import { getJournalAccess } from "@/lib/journal/access";
import { listEntries, createEntry, computeStats } from "@/lib/journal/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.canView) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const [entries, stats] = await Promise.all([
    listEntries(access.user.id, {
      pair: searchParams.get("pair"),
      timeframe: searchParams.get("timeframe"),
      direction: searchParams.get("direction"),
      result: searchParams.get("result"),
      newsRisk: searchParams.get("newsRisk"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      search: searchParams.get("search"),
    }),
    computeStats(access.user.id),
  ]);

  return NextResponse.json(
    { entries, stats, canEdit: access.canEdit },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const access = await getJournalAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Rex Pro required to create entries.
  if (!access.canEdit) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.pair || typeof body.pair !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
  const entry = await createEntry(access.user.id, {
    analysisId: typeof body.analysisId === "string" ? body.analysisId : null,
    pair: body.pair,
    timeframe: body.timeframe ?? null,
    direction: body.direction ?? null,
    confidence: num(body.confidence),
    entryPrice: num(body.entryPrice),
    stopLoss: num(body.stopLoss),
    takeProfit: num(body.takeProfit),
    lotSize: num(body.lotSize),
    riskAmount: num(body.riskAmount),
    traderNote: typeof body.traderNote === "string" ? body.traderNote : null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    emotions: Array.isArray(body.emotions) ? body.emotions : [],
  });

  return NextResponse.json({ entry }, { status: 201 });
}
