import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { analyzeImage } from "@/lib/rex/image-analysis";
import { validateImage, classifyChart } from "@/lib/rex/vision";
import { analyzeChartImage, type MediaType } from "@/lib/rex/vision-providers";
import { getNewsGuardForPair } from "@/lib/economicCalendar/service";
import {
  evaluateSniperEntry,
  type SniperOriginalSetup,
  type SniperConfirmationInput,
} from "@/lib/rex/sniper-entry";

export const dynamic = "force-dynamic";

function mediaTypeFor(format: string): MediaType {
  if (format === "jpeg" || format === "jpg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

/** Validate the minimal shape of the ALREADY-GENERATED setup slice the
 *  client sends back — this route never looks the setup up itself (it's
 *  never persisted server-side), so it trusts nothing beyond basic shape;
 *  evaluateSniperEntry() re-derives everything it needs from real inputs. */
function parseOriginal(body: unknown): SniperOriginalSetup | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.pair !== "string" || !o.pair.trim()) return null;
  if (typeof o.timeframe !== "string" || !o.timeframe.trim()) return null;
  if (o.bias !== "Bullish" && o.bias !== "Bearish") return null;
  if (typeof o.entryZone !== "string" || !o.entryZone.trim()) return null;
  if (typeof o.invalidationMid !== "number" || !Number.isFinite(o.invalidationMid)) return null;
  if (typeof o.generatedAtIso !== "string" || !Number.isFinite(new Date(o.generatedAtIso).getTime())) return null;
  return {
    pair: o.pair,
    timeframe: o.timeframe,
    bias: o.bias,
    entryZone: o.entryZone,
    invalidationMid: o.invalidationMid,
    generatedAtIso: o.generatedAtIso,
  };
}

/**
 * Rex Sniper Entry — lower-timeframe execution-CONFIRMATION only.
 *
 * Rex Pro only (same gate as /api/rex/trade-setup). Deliberately does NOT
 * use the daily analysis usage allowance (actions/analyze.ts's gated
 * action) — this is a secondary confirmation check on a setup the user
 * already paid an analysis for, not a new chart analysis. Because it
 * bypasses that quota, it carries its own short-window rate limit instead
 * (abuse protection — this still spends a real Vision provider call).
 *
 * Never generates a new directional setup, never calls buildTradeSetup(),
 * and never returns a modified copy of the original setup — only a
 * WAITING/CONFIRMED/INVALIDATED verdict.
 */
export async function POST(req: Request) {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // ── ABUSE PROTECTION — this path bypasses the normal daily usage quota,
  // so it needs its own throttle. Mirrors actions/analyze.ts's anti-spam
  // rate limit (same Pro-tier number: 20/min/user, 40/min/ip).
  const ip = await clientIp();
  const rlUser = rateLimit(`sniper:user:${access.user.id}`, 20, 60_000);
  const rlIp = rateLimit(`sniper:ip:${ip}`, 40, 60_000);
  if (!rlUser.ok || !rlIp.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { base64?: unknown; original?: unknown } | null;
  const original = parseOriginal(body?.original);
  if (!body || typeof body.base64 !== "string" || !body.base64 || !original) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const requestId = req.headers.get("x-request-id") ?? req.headers.get("x-correlation-id") ?? randomUUID();

  try {
    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.base64, "base64");
    } catch {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    // Cheap, real (non-AI) checks BEFORE spending a Vision call — same chain
    // actions/analyze.ts uses, important here since this path has no daily
    // usage cap to fall back on.
    const metrics = await analyzeImage(buffer, buffer.length);
    if (!metrics) {
      return NextResponse.json(
        { result: { state: "WAITING", reason: "Rex couldn't read that image. Please upload a clear PNG, JPG or JPEG screenshot." } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const validation = validateImage(metrics);
    const formatOk = validation.checks.find((c) => c.key === "format")?.ok;
    if (!formatOk) {
      return NextResponse.json(
        { result: { state: "WAITING", reason: "That file type isn't supported. Please upload a PNG, JPG or JPEG chart screenshot." } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const classification = classifyChart(metrics);
    if (!classification.isChart) {
      return NextResponse.json(
        { result: { state: "WAITING", reason: "Rex didn't recognize a trading chart in that screenshot." } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ── VISION — reused directly (bypasses actions/analyze.ts's usage gate
    // entirely; no AnalysisUsage row is written for this call).
    const mediaType = mediaTypeFor(metrics.format);
    const vision = await analyzeChartImage(body.base64, mediaType, { requestId });
    if (vision.status !== "ok") {
      return NextResponse.json(
        { result: { state: "WAITING", reason: "Rex couldn't read the confirmation chart just now. Please try again." } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ── NEWS GUARD — re-checked fresh, server-side authority (time has
    // passed since the original setup was generated).
    const { guard } = await getNewsGuardForPair(original.pair);

    const confirmation: SniperConfirmationInput = {
      pair: vision.data.instrument,
      symbol: vision.data.symbol,
      timeframe: vision.data.timeframe === "Unknown" ? null : vision.data.timeframe,
      currentPrice: vision.data.currentPrice,
      priceAxisLegible: vision.data.priceAxisLegible,
      trendDirection: vision.data.trendDirection,
      evidence: vision.data.evidence,
    };

    const result = evaluateSniperEntry(original, confirmation, guard);

    // eslint-disable-next-line no-console
    console.info("[rex.sniper-entry] outcome", {
      timestamp: new Date().toISOString(),
      requestId,
      pair: original.pair,
      originalTimeframe: original.timeframe,
      confirmationTimeframe: confirmation.timeframe,
      state: result.state,
    });

    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "[rex.sniper-entry] failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : err
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
