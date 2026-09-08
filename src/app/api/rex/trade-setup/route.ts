import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { buildTradeSetup, type TradeSetupInput } from "@/lib/rex/trade-setup";
import { getNewsGuardForPair } from "@/lib/economicCalendar/service";

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
  if (!body || typeof body.pair !== "string" || !body.pair.trim()) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    // ── ECONOMIC-CALENDAR SAFETY GUARD (server-side authority) ───────────────
    // Compute the news-timing guard from the provider-agnostic economic calendar
    // (Forex Factory). Applied as a GUARD before NEW setup generation; it never
    // feeds directional info into the APA engine. The client cannot spoof it.
    // A calendar outage resolves to "unavailable" inside the service (never
    // throws), so it can never silently block a setup.
    const { guard } = await getNewsGuardForPair(body.pair);

    const setup = buildTradeSetup({
      pair: body.pair,
      timeframe: typeof body.timeframe === "string" ? body.timeframe : null,
      bias: typeof body.bias === "string" ? body.bias : null,
      confidence: typeof body.confidence === "number" ? body.confidence : null,
      currentPrice: typeof body.currentPrice === "string" ? body.currentPrice : null,
      priceLevels: Array.isArray(body.priceLevels) ? body.priceLevels : [],
      economicImpacts: Array.isArray(body.economicImpacts) ? body.economicImpacts : [],
      economicEvents: Array.isArray(body.economicEvents) ? body.economicEvents : [],
      newsGuard: guard,
      trend: body.trend ?? null,
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
    });

    return NextResponse.json({ setup }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Never leak internals; return parseable JSON so the client shows a real error.
    // eslint-disable-next-line no-console
    console.error(
      "[rex.trade-setup] generation failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : err
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
