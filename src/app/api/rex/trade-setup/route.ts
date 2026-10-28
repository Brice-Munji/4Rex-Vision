import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { buildTradeSetup, type TradeSetupInput } from "@/lib/rex/trade-setup";
import { getNewsGuardForPair } from "@/lib/economicCalendar/service";
import type { NewsGuard } from "@/lib/economicCalendar/blocking";

export const dynamic = "force-dynamic";

/**
 * Diagnostic-only trace of the server-computed news guard for EVERY
 * setup-generation attempt (clear, blocked, and unavailable alike) — closes
 * the evidence gap found when diagnosing whether setups respect economic
 * news: previously nothing was logged at this route for a successful or
 * blocked attempt, only on an unhandled exception. No secrets or
 * user-identifying data (no user id/email) — only the pair, the guard's own
 * state, and whatever relevant-event info the guard already carries.
 */
function logNewsGuard(pair: string, guard: NewsGuard, requestId: string | null) {
  // eslint-disable-next-line no-console
  console.info("[rex.trade-setup] news-guard", {
    timestamp: new Date().toISOString(),
    requestId,
    pair,
    guardState: guard.state,
    eventCurrency: guard.currency,
    eventImpact: guard.risk,
    minutesUntilEvent: guard.minutesUntil,
    event: guard.event,
  });
}

/**
 * Minimal, local re-parse of a single named price level's numeric value —
 * mirrors trade-setup.ts's own `parseNum` just closely enough to classify
 * PROVENANCE for logging. Never used for any trading decision (that stays
 * entirely inside buildTradeSetup); only to answer "was this input present,
 * and did the engine's final output actually anchor on it".
 */
function parseLevelValue(
  levels: { type: string; value: string }[] | undefined,
  type: string
): number | null {
  const raw = (levels ?? []).find((l) => l.type === type)?.value;
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Diagnostic-only trace of the APA engine's own outcome for every
 * setup-generation attempt. The existing news-guard log only shows whether
 * news blocked the attempt; it says nothing about what buildTradeSetup()
 * itself decided (directional / neutral / none / blocked, and WHY on a
 * rejection). Without this, "no setups" and "a genuine NO SETUP result" were
 * indistinguishable from the logs alone. No price levels/evidence text are
 * logged — only the pair, timeframe, bias, and the engine's own kind/reason.
 *
 * Structural-level provenance (added for the invalidation-provenance gap):
 * presence of a raw "Invalidation" input is NOT by itself proof the engine's
 * final invalidation is chart-derived — buildTradeSetup can still override it
 * (structural-side enforcement, minimum-risk enforcement) even when a raw
 * level was supplied. The only reliable signal is comparing the engine's own
 * returned `invalidationMid` against the raw parsed input value: they match
 * only when the raw level passed through untouched. Only presence flags and
 * this source classification are logged — never the actual price numbers.
 */
function logSetupOutcome(
  pair: string,
  timeframe: string | null,
  bias: string | null,
  priceLevels: { type: string; value: string }[] | undefined,
  currentPrice: string | null,
  result: ReturnType<typeof buildTradeSetup>,
  requestId: string | null
) {
  const supportPresent = parseLevelValue(priceLevels, "Support") != null;
  const resistancePresent = parseLevelValue(priceLevels, "Resistance") != null;
  const rawInvalidation = parseLevelValue(priceLevels, "Invalidation");
  // Same provenance question as the invalidation gap, but for anti-chase: a
  // missing current price means buildTradeSetup() could not run the entry-
  // quality check at all (see DirectionalSetup.anticChaseChecked). Presence
  // only — never the actual price number.
  const currentPricePresent = currentPrice != null && Number.isFinite(parseFloat(currentPrice));

  let invalidationSource: "chart-level" | "fallback" | "n/a" = "n/a";
  if (result.kind === "directional") {
    invalidationSource =
      rawInvalidation != null && Math.abs(result.invalidationMid - rawInvalidation) < 1e-9
        ? "chart-level"
        : "fallback";
  }

  // eslint-disable-next-line no-console
  console.info("[rex.trade-setup] outcome", {
    timestamp: new Date().toISOString(),
    requestId,
    pair,
    timeframe,
    bias,
    kind: result.kind,
    reason: result.kind === "none" || result.kind === "blocked" ? result.reason : null,
    ...(result.kind === "directional"
      ? { riskReward: result.riskReward, qualityScore: result.qualityScore }
      : null),
    // Provenance of the structural inputs — presence flags + source
    // classification only, never the raw numbers.
    supportOrResistancePresent: supportPresent || resistancePresent,
    invalidationLevelPresent: rawInvalidation != null,
    invalidationSource,
    usedFallbackInvalidationBuffer: invalidationSource === "fallback",
    currentPricePresent,
  });
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
  if (!body || typeof body.pair !== "string" || !body.pair.trim()) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Correlation id — ONLY if the caller already supplied one; never fabricated.
  const requestId = req.headers.get("x-request-id") ?? req.headers.get("x-correlation-id") ?? null;

  try {
    // ── ECONOMIC-CALENDAR SAFETY GUARD (server-side authority) ───────────────
    // Compute the news-timing guard from the provider-agnostic economic calendar
    // (Forex Factory). Applied as a GUARD before NEW setup generation; it never
    // feeds directional info into the APA engine. The client cannot spoof it.
    // A calendar outage resolves to "unavailable" inside the service (never
    // throws), so it can never silently block a setup.
    const { guard } = await getNewsGuardForPair(body.pair);
    // Trace EVERY attempt (clear/blocked/unavailable) — diagnostic only, never
    // affects filtering/fail-open behavior below.
    logNewsGuard(body.pair, guard, requestId);

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
      // 1M scalping support — optional higher-timeframe bias context (never
      // required; loosely validated since it's purely informational/additive).
      higherTimeframeContext:
        body.higherTimeframeContext &&
        typeof body.higherTimeframeContext === "object" &&
        typeof body.higherTimeframeContext.timeframe === "string"
          ? {
              timeframe: body.higherTimeframeContext.timeframe,
              bias:
                typeof body.higherTimeframeContext.bias === "string"
                  ? body.higherTimeframeContext.bias
                  : null,
            }
          : null,
    });

    logSetupOutcome(
      body.pair,
      typeof body.timeframe === "string" ? body.timeframe : null,
      typeof body.bias === "string" ? body.bias : null,
      Array.isArray(body.priceLevels) ? body.priceLevels : [],
      typeof body.currentPrice === "string" ? body.currentPrice : null,
      setup,
      requestId
    );

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
