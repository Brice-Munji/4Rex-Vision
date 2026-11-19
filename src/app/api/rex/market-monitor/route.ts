import { NextResponse } from "next/server";
import { getDistinctTrackedPairs, recordMarketPriceObservations } from "@/lib/rex/lifecycle";
import { getCurrentPrice } from "@/lib/market/forex-price";

export const dynamic = "force-dynamic";

/**
 * Market Price Monitoring (Sprint 4) — the one entry point that advances
 * tracked setups from an INDEPENDENT market-data feed, as opposed to the
 * pre-existing upload-driven path (recordLifecycleObservations, fired from
 * the analyze flow). Deliberately NOT called from, or linked by, any page —
 * "keep monitoring independent of frontend rendering" / "avoid triggering
 * market requests whenever a user opens the Tracked Setups page" means this
 * must be reachable ONLY by a scheduler, never by a user's navigation.
 *
 * AUTH: requires `Authorization: Bearer <CRON_SECRET>` matching the
 * server-only CRON_SECRET env var. Fails CLOSED — if CRON_SECRET isn't
 * configured at all, every request is rejected rather than allowed through,
 * same "never trust an unauthenticated caller" posture as the rest of this
 * app's server-side routes. Vercel Cron automatically sends this exact
 * header (`Authorization: Bearer $CRON_SECRET`) when CRON_SECRET is set as
 * a project env var — see vercel.json for the schedule. Any other external
 * scheduler can call this route the same way.
 *
 * METHOD: both GET and POST run the identical job — Vercel Cron invokes
 * scheduled routes with GET; a manual/alternate trigger may prefer POST.
 *
 * CONCURRENCY: an in-process guard (`activeRun`) collapses an overlapping
 * invocation into a no-op response instead of running a second pass in
 * parallel. This is necessarily best-effort — it only protects a single
 * server process, not multiple serverless instances — so correctness does
 * NOT depend on it: recordMarketPriceObservations()'s own per-setup
 * MIN_MARKET_RECHECK_MS gate plus the DB-level unique constraint on
 * (setupId, sourceAnalysisId) are what actually make repeated/concurrent
 * runs safe (cheap no-op / in-place upsert) even without this guard.
 */

let activeRun: Promise<unknown> | null = null;

interface PairOutcome {
  pair: string;
  ok: boolean;
  reason?: string;
  source?: string;
  updated?: number;
  skipped?: number;
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: unconfigured means unreachable, not open
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function runMonitor(): Promise<{
  processedPairs: number;
  updatedSetups: number;
  skippedSetups: number;
  failedPairs: number;
  pairs: PairOutcome[];
}> {
  const now = new Date();
  const cycleId = now.toISOString();
  const pairs = await getDistinctTrackedPairs();

  const outcomes: PairOutcome[] = [];
  let updatedSetups = 0;
  let skippedSetups = 0;
  let failedPairs = 0;

  // Sequential, not parallel — a handful of distinct pairs at most, and
  // deliberately gentle on the two free upstream providers ("respect
  // provider rate limits") rather than bursting every pair at once.
  for (const pair of pairs) {
    const priceResult = await getCurrentPrice(pair, now);
    if (!priceResult.ok) {
      failedPairs++;
      outcomes.push({ pair, ok: false, reason: priceResult.reason });
      // eslint-disable-next-line no-console
      console.warn("[rex.market-monitor] price unavailable", { pair, reason: priceResult.reason });
      continue;
    }

    const { quote } = priceResult;
    const result = await recordMarketPriceObservations({ pair, price: quote.price, cycleId });
    if (result.failed) {
      failedPairs++;
      outcomes.push({ pair, ok: false, reason: "persist_failed", source: quote.source });
      continue;
    }

    updatedSetups += result.updated;
    skippedSetups += result.skipped;
    outcomes.push({ pair, ok: true, source: quote.source, updated: result.updated, skipped: result.skipped });
    // eslint-disable-next-line no-console
    console.info("[rex.market-monitor] pair processed", {
      pair,
      source: quote.source,
      asOfUtc: quote.asOfUtc,
      updated: result.updated,
      skipped: result.skipped,
    });
  }

  return { processedPairs: pairs.length, updatedSetups, skippedSetups, failedPairs, pairs: outcomes };
}

async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    if (activeRun) {
      return NextResponse.json(
        { skipped: true, reason: "already_running" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const run = runMonitor();
    activeRun = run;
    const summary = await run;
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.market-monitor] run failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    activeRun = null;
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
