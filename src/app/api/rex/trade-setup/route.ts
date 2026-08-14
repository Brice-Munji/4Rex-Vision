import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { buildTradeSetup, type TradeSetupInput } from "@/lib/rex/trade-setup";

export const dynamic = "force-dynamic";

/**
 * Generate a Rex Trade Setup from a completed analysis. Rex Pro only — this is
 * where "free users cannot generate the setup" is actually enforced (the UI gate
 * is just UX; this route is the authority).
 */
export async function POST(req: Request) {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Partial<TradeSetupInput> | null;
  if (!body || typeof body.pair !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const setup = buildTradeSetup({
    pair: body.pair,
    timeframe: typeof body.timeframe === "string" ? body.timeframe : null,
    bias: typeof body.bias === "string" ? body.bias : null,
    confidence: typeof body.confidence === "number" ? body.confidence : null,
    currentPrice: typeof body.currentPrice === "string" ? body.currentPrice : null,
    priceLevels: Array.isArray(body.priceLevels) ? body.priceLevels : [],
    economicImpacts: Array.isArray(body.economicImpacts) ? body.economicImpacts : [],
  });

  return NextResponse.json({ setup }, { headers: { "Cache-Control": "no-store" } });
}
