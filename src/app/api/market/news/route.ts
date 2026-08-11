import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { getForexNews } from "@/lib/market/forex-news";

export const dynamic = "force-dynamic";

/** Real-Time Forex News (Finnhub, category=forex). Rex Pro only. */
export async function GET() {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const payload = await getForexNews();
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
