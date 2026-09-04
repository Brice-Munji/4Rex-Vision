import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { buildTradeSetup, type TradeSetupInput } from "@/lib/rex/trade-setup";
import { getEconomicCalendar } from "@/lib/market/calendar";
import { currenciesFromPair } from "@/lib/rex/economic";

export const dynamic = "force-dynamic";

/**
 * Fetch the LIVE, timed high-impact events for the analyzed pair's currencies.
 * `available` is true only when the source is the live feed (Finnhub) — a
 * built-in fallback schedule is NOT treated as reliable timing, so Rex shows
 * "news data unavailable" rather than a false "clear".
 */
async function getPairNewsTiming(pair: string): Promise<TradeSetupInput["news"]> {
  try {
    const cal = await getEconomicCalendar();
    const available = cal.source === "finnhub" && !cal.warning;
    const curs = currenciesFromPair(pair).map((c) => c.toUpperCase());
    const events = cal.events
      .filter((e) => e.impact === "High" && curs.includes(e.currency.toUpperCase()))
      .map((e) => ({ currency: e.currency, title: e.event, minutesUntil: e.minutesUntil }));
    return { available, events };
  } catch {
    return { available: false, events: [] };
  }
}

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

  // Live, pair-relevant, timed high-impact news drives the 20-minute timing gate
  // (server-side authority — the client can't spoof or bypass it).
  const news = await getPairNewsTiming(body.pair);

  const setup = buildTradeSetup({
    pair: body.pair,
    timeframe: typeof body.timeframe === "string" ? body.timeframe : null,
    bias: typeof body.bias === "string" ? body.bias : null,
    confidence: typeof body.confidence === "number" ? body.confidence : null,
    currentPrice: typeof body.currentPrice === "string" ? body.currentPrice : null,
    priceLevels: Array.isArray(body.priceLevels) ? body.priceLevels : [],
    economicImpacts: Array.isArray(body.economicImpacts) ? body.economicImpacts : [],
    economicEvents: Array.isArray(body.economicEvents) ? body.economicEvents : [],
    news,
    trend: body.trend ?? null,
    evidence: Array.isArray(body.evidence) ? body.evidence : [],
  });

  return NextResponse.json({ setup }, { headers: { "Cache-Control": "no-store" } });
}
