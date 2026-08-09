import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { getPairSentiment } from "@/lib/market/sentiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const payload = await getPairSentiment();
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
