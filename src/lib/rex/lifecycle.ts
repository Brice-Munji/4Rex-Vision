import "server-only";
import { prisma } from "@/lib/prisma";
import {
  determineLifecycleState,
  TERMINAL_LIFECYCLE_STATES,
  type LifecycleState,
  type LifecycleOriginalLevels,
  type TradeSetupLifecycleDTO,
  type ObservationSource,
} from "./setup-lifecycle";
import type { DirectionalSetup } from "./trade-setup";

/**
 * Trade Setup Lifecycle — persistence layer (Stage 1, ownership-fixed).
 *
 * This is the ONLY place that touches the TradeSetupLifecycle /
 * SetupLifecycleObservation tables. Two entry points, matching the two
 * moments this app ever has a fresh price for a pair:
 *
 *  - createOrGetSetupLifecycle(): intended to be called once, from the
 *    trade-setup generation path, right after buildTradeSetup() returns a
 *    "directional" result. Captures the ORIGINAL levels verbatim and NEVER
 *    overwrites them on a later call for the same setupId (idempotent —
 *    re-opening the setup modal re-POSTs the same request and must get back
 *    the SAME record, not a fresh one).
 *
 *  - recordLifecycleObservations(): intended to be called once, from the
 *    main analyze flow, after EVERY completed analysis. There is no
 *    live/push price feed anywhere in this app — this is the only
 *    mechanism that ever advances a tracked setup's lifecycle, and it only
 *    fires when a later chart upload of the SAME pair produces a reliably-
 *    read price. Best-effort and additive: never throws into the analysis
 *    path, mirroring recordAnalysisEvent()'s own contract.
 *
 * ── OWNERSHIP (the fix this revision exists to ship) ────────────────────────
 * `setupId` is the originating report's own id (e.g. "rex_eurusd_abc123") —
 * a predictable `rex_<pair>_<timestamp>` string (see src/actions/analyze.ts),
 * NOT a secret, unguessable token, and it arrives at the call site as
 * caller-supplied input, ultimately sourced from the client's request body.
 * It must NEVER be used as a standalone lookup/uniqueness key: the previous
 * revision of this file looked up `where: { setupId }` alone (backed by a
 * GLOBAL unique index on setupId), so a caller who supplied another user's
 * setupId got that user's full lifecycle record back, unchecked.
 *
 * Every exported function here now requires `userId` and the schema's
 * uniqueness is scoped to the compound `(userId, setupId)` key — there is no
 * code path left in this file that can resolve a row without the caller's
 * own `userId` matching. Per Prisma's own schema comment: `userId` must
 * always be derived server-side from the authenticated session (e.g. the
 * route's own `access.user.id` from getMarketAccess()/auth()), never read
 * from the request body — this file trusts whatever `userId` its caller
 * passes in, exactly as it always has; the fix is that it no longer lets
 * `setupId` alone override that trust boundary.
 */

interface LifecycleRow {
  id: string;
  userId: string;
  setupId: string;
  pair: string;
  timeframe: string | null;
  bias: string;
  entryZone: string;
  invalidationZone: string;
  target1: string;
  target2: string;
  entryMid: number;
  invalidationMid: number;
  target1Mid: number;
  target2Mid: number;
  riskReward: string;
  generatedAt: Date;
  priceAtGeneration: number | null;
  state: string;
  lastPrice: number | null;
  lastCheckedAt: Date | null;
  observations: {
    id: string;
    sourceAnalysisId: string;
    price: number | null;
    state: string;
    observedAt: Date;
    source: string;
  }[];
}

function toDTO(row: LifecycleRow): TradeSetupLifecycleDTO {
  return {
    id: row.id,
    setupId: row.setupId,
    pair: row.pair,
    timeframe: row.timeframe,
    bias: row.bias as "Bullish" | "Bearish",
    entryZone: row.entryZone,
    invalidationZone: row.invalidationZone,
    target1: row.target1,
    target2: row.target2,
    entryMid: row.entryMid,
    invalidationMid: row.invalidationMid,
    target1Mid: row.target1Mid,
    target2Mid: row.target2Mid,
    riskReward: row.riskReward,
    generatedAt: row.generatedAt.toISOString(),
    priceAtGeneration: row.priceAtGeneration,
    state: row.state as LifecycleState,
    lastPrice: row.lastPrice,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    observations: row.observations.map((o) => ({
      id: o.id,
      sourceAnalysisId: o.sourceAnalysisId,
      price: o.price,
      state: o.state as LifecycleState,
      observedAt: o.observedAt.toISOString(),
      source: o.source as ObservationSource,
    })),
  };
}

const OBSERVATIONS_INCLUDE = {
  observations: { orderBy: { observedAt: "desc" as const }, take: 20 },
};

export interface CreateLifecycleInput {
  /** MUST be derived server-side from the authenticated session by the
   *  caller — never accept this from client-supplied request data. */
  userId: string;
  setupId: string;
  pair: string;
  timeframe: string | null;
  bias: "Bullish" | "Bearish";
  entryZone: string;
  invalidationZone: string;
  target1: string;
  target2: string;
  entryMid: number;
  invalidationMid: number;
  target1Mid: number;
  target2Mid: number;
  riskReward: string;
  /** Market price at generation, ONLY when reliably available (mirrors
   *  DirectionalSetup.anticChaseChecked — never a guessed/fallback value). */
  priceAtGeneration: number | null;
  generatedAt: Date;
}

/**
 * Pure mapping from a just-generated DirectionalSetup + the caller's own
 * identifying fields to the exact CreateLifecycleInput shape
 * createOrGetSetupLifecycle() needs. Extracted so the trade-setup route and
 * this file's own integration tests build that input the SAME way, instead
 * of two independent copies of this mapping silently drifting apart —
 * "Do not duplicate persistence logic" applies to this glue too, not just
 * the DB calls themselves.
 *
 * Reads the setup's OWN already-computed levels verbatim (never
 * recalculates anything — trade-generation stays entirely inside
 * trade-setup.ts). Does not touch the database and never throws.
 */
export function toCreateLifecycleInput(args: {
  userId: string;
  setupId: string;
  pair: string;
  timeframe: string | null;
  setup: Pick<
    DirectionalSetup,
    | "bias"
    | "entryZone"
    | "invalidationZone"
    | "target1"
    | "target2"
    | "entryMid"
    | "invalidationMid"
    | "target1Mid"
    | "target2Mid"
    | "riskReward"
    | "anticChaseChecked"
  >;
  /** Raw numeric current price, if any was read from the chart. Reliability
   *  is still gated by setup.anticChaseChecked below — passing a number
   *  here does NOT by itself make it trusted. */
  currentPrice: number | null;
  generatedAt: Date;
}): CreateLifecycleInput {
  return {
    userId: args.userId,
    setupId: args.setupId,
    pair: args.pair,
    timeframe: args.timeframe,
    bias: args.setup.bias,
    entryZone: args.setup.entryZone,
    invalidationZone: args.setup.invalidationZone,
    target1: args.setup.target1,
    target2: args.setup.target2,
    entryMid: args.setup.entryMid,
    invalidationMid: args.setup.invalidationMid,
    target1Mid: args.setup.target1Mid,
    target2Mid: args.setup.target2Mid,
    riskReward: args.setup.riskReward,
    priceAtGeneration:
      args.setup.anticChaseChecked && args.currentPrice != null && Number.isFinite(args.currentPrice)
        ? args.currentPrice
        : null,
    generatedAt: args.generatedAt,
  };
}

/**
 * Create the lifecycle record for a just-generated directional setup, or
 * return the EXISTING one untouched if this exact (userId, setupId) pair
 * was already tracked (idempotent — re-opening the Rex Trade Setup modal
 * for the same analysis must never reset or duplicate it). Original levels
 * are only ever written on first creation; this function never updates them
 * afterward.
 *
 * Ownership fix: looked up by the compound (userId, setupId) key, never by
 * setupId alone — `input.userId` must be the CALLER's own authenticated
 * user id. Two different users supplying the identical setupId get two
 * entirely independent rows; neither can see or affect the other's.
 *
 * Best-effort: returns null (never throws) on any failure so a persistence
 * problem can never break setup generation itself.
 */
export async function createOrGetSetupLifecycle(
  input: CreateLifecycleInput
): Promise<TradeSetupLifecycleDTO | null> {
  try {
    const existing = await prisma.tradeSetupLifecycle.findUnique({
      where: { userId_setupId: { userId: input.userId, setupId: input.setupId } },
      include: OBSERVATIONS_INCLUDE,
    });
    if (existing) return toDTO(existing);

    const created = await prisma.tradeSetupLifecycle.create({
      data: {
        userId: input.userId,
        setupId: input.setupId,
        pair: input.pair,
        timeframe: input.timeframe,
        bias: input.bias,
        entryZone: input.entryZone,
        invalidationZone: input.invalidationZone,
        target1: input.target1,
        target2: input.target2,
        entryMid: input.entryMid,
        invalidationMid: input.invalidationMid,
        target1Mid: input.target1Mid,
        target2Mid: input.target2Mid,
        riskReward: input.riskReward,
        generatedAt: input.generatedAt,
        priceAtGeneration: input.priceAtGeneration,
        // Deliberately NOT run through determineLifecycleState() here — a
        // setup that was just generated has had no monitoring yet by
        // definition; state only ever advances on a SUBSEQUENT observation.
        state: "ACTIVE",
      },
      include: OBSERVATIONS_INCLUDE,
    });
    return toDTO(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] createOrGetSetupLifecycle failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Fetch a single tracked setup by its stable setupId (report.id), scoped
 *  to its owner. Used to re-fetch (never recompute) lifecycle state across
 *  page refreshes. Returns null both when the row doesn't exist AND when it
 *  exists but belongs to a different userId — the two cases are
 *  indistinguishable to the caller by design (never reveal whether another
 *  user's setupId happens to exist). */
export async function getSetupLifecycle(
  userId: string,
  setupId: string
): Promise<TradeSetupLifecycleDTO | null> {
  try {
    const row = await prisma.tradeSetupLifecycle.findFirst({
      where: { userId, setupId },
      include: OBSERVATIONS_INCLUDE,
    });
    return row ? toDTO(row) : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] getSetupLifecycle failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * All of a user's tracked setups, newest generated first (Sprint 3 —
 * Tracked Setups UI). Ownership is enforced HERE, by the query's own
 * `where: { userId }` — callers must resolve `userId` server-side from the
 * authenticated session and never accept it from client input (see
 * lifecycle-access.ts's getTrackedSetupsAccess()).
 *
 * Unlike the single-record lookups above, a bare array can't distinguish
 * "this user genuinely has no tracked setups" from "the query failed" —
 * both would otherwise look identical to the caller. Returns `failed: true`
 * on any error instead (setups stays [], never throws), so the UI can show
 * a real error state rather than silently rendering an empty list.
 */
export async function listTrackedSetups(
  userId: string,
  limit = 50
): Promise<{ setups: TradeSetupLifecycleDTO[]; failed: boolean }> {
  try {
    const rows = await prisma.tradeSetupLifecycle.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: OBSERVATIONS_INCLUDE,
    });
    return { setups: rows.map(toDTO), failed: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] listTrackedSetups failed:", err instanceof Error ? err.message : err);
    return { setups: [], failed: true };
  }
}

/** Count of a user's tracked setups — used only to decide whether a lapsed
 *  Pro user still has preserved data worth showing read-only (mirrors
 *  journal/access.ts's own hasData check for Smart Journal). Defaults to 0
 *  on failure: the conservative direction here is "treat as no data" rather
 *  than risk granting view access on an unverified count. */
export async function countTrackedSetups(userId: string): Promise<number> {
  try {
    return await prisma.tradeSetupLifecycle.count({ where: { userId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] countTrackedSetups failed:", err instanceof Error ? err.message : err);
    return 0;
  }
}

export interface RecordObservationInput {
  userId: string;
  pair: string;
  /** The analysis (report.id) this price reading came from — used both for
   *  de-duplication and as the observation's own provenance pointer. */
  sourceAnalysisId: string;
  /** Reliably-extracted current price for this pair, or null when the
   *  latest upload didn't yield one (e.g. axis not legible) — handled
   *  safely as an UNVERIFIED observation, never guessed. */
  price: number | null;
}

/**
 * Whenever a reliable (or explicitly unreliable) market-price reading
 * becomes available for a pair — i.e. on every completed chart analysis —
 * advance every one of THIS CALLER'S still-live tracked setups for that
 * pair:
 *   1. Retrieve the relevant active setup(s) (non-terminal, same user+pair
 *      — the `where: { userId, pair, ... }` below is what makes this
 *      function ownership-safe; it was never the vulnerable one).
 *   2/3. Compare the latest price against each one's ORIGINAL levels and
 *      determine its lifecycle state (pure, in setup-lifecycle.ts).
 *   4. Record the observation (timestamp + price), deduped per source
 *      analysis so re-processing the same upload never creates a duplicate.
 *   5. Update the lifecycle state — original trading levels are never
 *      touched (only state/lastPrice/lastCheckedAt + the observation log).
 *
 * A terminal setup (INVALIDATED / TP2_HIT) is left alone entirely — nothing
 * "comes after" either state, and Stage 1 never generates a replacement.
 * Best-effort: never throws into the analysis path.
 */
export async function recordLifecycleObservations(input: RecordObservationInput): Promise<void> {
  try {
    const candidates = await prisma.tradeSetupLifecycle.findMany({
      where: {
        userId: input.userId,
        pair: input.pair,
        state: { notIn: Array.from(TERMINAL_LIFECYCLE_STATES) },
      },
    });
    if (candidates.length === 0) return; // nothing tracked for this pair — cheap no-op

    for (const setup of candidates) {
      const original: LifecycleOriginalLevels = {
        bias: setup.bias as "Bullish" | "Bearish",
        entryZone: setup.entryZone,
        invalidationMid: setup.invalidationMid,
        target1: setup.target1,
        target1Mid: setup.target1Mid,
        target2: setup.target2,
        target2Mid: setup.target2Mid,
      };
      const newState = determineLifecycleState(original, input.price);

      // Dedup per (setupId, sourceAnalysisId) — re-processing the exact same
      // analysis (retry, duplicate request) is a safe no-op, enforced at the
      // DB level via the unique constraint, not just best-effort in app code.
      // NOTE: this `setupId` is TradeSetupLifecycle.id (the internal PK, via
      // `setup.id` below) — SetupLifecycleObservation's FK target — not the
      // external report-id correlator field. Only reachable here for a
      // setup already confirmed to belong to `input.userId` above, so no
      // separate ownership check is needed on the observation itself.
      await prisma.setupLifecycleObservation.upsert({
        where: { setupId_sourceAnalysisId: { setupId: setup.id, sourceAnalysisId: input.sourceAnalysisId } },
        create: {
          setupId: setup.id,
          sourceAnalysisId: input.sourceAnalysisId,
          price: input.price,
          state: newState,
          source: "chart_analysis",
        },
        // Same source analysis reprocessed: refresh the reading in place
        // rather than add a second row for the identical event.
        update: { price: input.price, state: newState, source: "chart_analysis" },
      });

      // Only move the setup's own headline state/lastPrice forward on a
      // RELIABLE reading — an unreliable one is still logged above (for an
      // honest, visible history) but never overwrites the last known-good
      // classification with UNVERIFIED.
      if (input.price != null) {
        await prisma.tradeSetupLifecycle.update({
          where: { id: setup.id },
          data: { state: newState, lastPrice: input.price, lastCheckedAt: new Date() },
        });
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] recordLifecycleObservations failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Minimum time between two market-data-sourced rechecks of the SAME setup.
 * Bounds how fast the observation history can grow under frequent monitor
 * invocations ("prevent duplicate or redundant observations") independently
 * of the price-feed's own 5-minute fetch cache (src/lib/market/forex-price.ts)
 * — that cache bounds how often the EXTERNAL provider is hit per pair per
 * run; this bounds how often any ONE setup gets a new observation row.
 */
const MIN_MARKET_RECHECK_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Every currently-non-terminal pair across ALL users — the monitoring job's
 * own worklist. Deliberately NOT scoped to a single userId: unlike the
 * upload-driven path above (which only ever advances the uploading user's
 * own setups, because it rides along a specific user's analyze request),
 * the market-data monitor has no "current user" — it is a scheduled,
 * instrument-scoped job (see src/app/api/rex/market-monitor/route.ts) that
 * applies the SAME real market price to every tracked setup for that
 * instrument, which is objectively correct regardless of who owns it and
 * reveals nothing about one user to another (it only ever reads `pair`
 * here, and the write path below still never returns cross-user data to
 * any caller). Best-effort: returns [] (never throws) on failure.
 */
export async function getDistinctTrackedPairs(): Promise<string[]> {
  try {
    const rows = await prisma.tradeSetupLifecycle.findMany({
      where: { state: { notIn: Array.from(TERMINAL_LIFECYCLE_STATES) } },
      distinct: ["pair"],
      select: { pair: true },
    });
    return rows.map((r) => r.pair);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] getDistinctTrackedPairs failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export interface RecordMarketObservationInput {
  /** Compact symbol matching TradeSetupLifecycle.pair, e.g. "EURUSD". */
  pair: string;
  /** Already validated by the caller (src/lib/market/forex-price.ts) —
   *  this function only ever runs for a RELIABLE reading. There is no
   *  "price: null" case on this path (contrast recordLifecycleObservations
   *  above): a monitoring run that couldn't get a trustworthy price for a
   *  pair simply never calls this function for it at all, rather than
   *  writing an UNVERIFIED row on every failed poll — see forex-price.ts's
   *  module doc for why that's the more honest choice for a machine-
   *  triggered poller than it would be for a user-driven chart upload. */
  price: number;
  /** Per-monitoring-run correlator (e.g. an ISO-minute-bucketed string from
   *  the calling route). Retrying/repeating the SAME run stays idempotent
   *  (upsert in place, no duplicate row); a later run still adds a new one. */
  cycleId: string;
}

export interface RecordMarketObservationResult {
  /** Setups whose state/lastPrice/lastCheckedAt were advanced this run. */
  updated: number;
  /** Setups for this pair that were within MIN_MARKET_RECHECK_MS of their
   *  last check and were left untouched — not a failure, just a no-op. */
  skipped: number;
  failed: boolean;
}

/**
 * Advance every currently-tracked, non-terminal setup for `pair` (across
 * ALL owners — see getDistinctTrackedPairs's own comment on why that is
 * correct here) using one externally-sourced, already-validated price
 * reading:
 *   1. Load candidates for this pair (mirrors recordLifecycleObservations's
 *      own `state: { notIn: TERMINAL }` filter — a terminal setup is left
 *      alone entirely, same as the upload-driven path).
 *   2. Skip any setup rechecked within MIN_MARKET_RECHECK_MS — safe against
 *      repeated/overlapping monitor executions without a separate lock.
 *   3. Classify with the SAME pure classifier the upload-driven path uses
 *      (determineLifecycleState) — no new/duplicated trading logic.
 *   4. Persist the observation (tagged source: "market_data", deduped per
 *      (setupId, "market:<cycleId>") so a retried run can never duplicate
 *      a row) and advance state/lastPrice/lastCheckedAt. Original entry/
 *      SL/TP levels are never touched — identical guarantee to the
 *      upload-driven path.
 * Best-effort: never throws (returns failed: true instead) so a transient
 * DB error on one pair can never take down the rest of a monitoring run.
 */
export async function recordMarketPriceObservations(
  input: RecordMarketObservationInput
): Promise<RecordMarketObservationResult> {
  try {
    const candidates = await prisma.tradeSetupLifecycle.findMany({
      where: {
        pair: input.pair,
        state: { notIn: Array.from(TERMINAL_LIFECYCLE_STATES) },
      },
    });
    if (candidates.length === 0) return { updated: 0, skipped: 0, failed: false };

    const nowMs = Date.now();
    const sourceAnalysisId = `market:${input.cycleId}`;
    let updated = 0;
    let skipped = 0;

    for (const setup of candidates) {
      if (setup.lastCheckedAt && nowMs - setup.lastCheckedAt.getTime() < MIN_MARKET_RECHECK_MS) {
        skipped++;
        continue;
      }

      const original: LifecycleOriginalLevels = {
        bias: setup.bias as "Bullish" | "Bearish",
        entryZone: setup.entryZone,
        invalidationMid: setup.invalidationMid,
        target1: setup.target1,
        target1Mid: setup.target1Mid,
        target2: setup.target2,
        target2Mid: setup.target2Mid,
      };
      const newState = determineLifecycleState(original, input.price);

      await prisma.setupLifecycleObservation.upsert({
        where: { setupId_sourceAnalysisId: { setupId: setup.id, sourceAnalysisId } },
        create: {
          setupId: setup.id,
          sourceAnalysisId,
          price: input.price,
          state: newState,
          source: "market_data",
        },
        update: { price: input.price, state: newState, source: "market_data" },
      });

      await prisma.tradeSetupLifecycle.update({
        where: { id: setup.id },
        data: { state: newState, lastPrice: input.price, lastCheckedAt: new Date() },
      });
      updated++;
    }

    return { updated, skipped, failed: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.lifecycle] recordMarketPriceObservations failed:", err instanceof Error ? err.message : err);
    return { updated: 0, skipped: 0, failed: true };
  }
}
