import "server-only";
import { prisma } from "@/lib/prisma";
import {
  determineLifecycleState,
  TERMINAL_LIFECYCLE_STATES,
  type LifecycleState,
  type LifecycleOriginalLevels,
  type TradeSetupLifecycleDTO,
} from "./setup-lifecycle";

/**
 * Trade Setup Lifecycle — persistence layer (Stage 1).
 *
 * This is the ONLY place that touches the TradeSetupLifecycle /
 * SetupLifecycleObservation tables. Two entry points, matching the two
 * moments this app ever has a fresh price for a pair:
 *
 *  - createOrGetSetupLifecycle(): called once, from POST /api/rex/trade-setup,
 *    right after buildTradeSetup() returns a "directional" result. Captures
 *    the ORIGINAL levels verbatim and NEVER overwrites them on a later call
 *    for the same setupId (idempotent — re-opening the setup modal re-POSTs
 *    the same request and must get back the SAME record, not a fresh one).
 *
 *  - recordLifecycleObservations(): called once, from the main analyze
 *    server action (src/actions/analyze.ts), after EVERY completed analysis.
 *    There is no live/push price feed anywhere in this app — this is the
 *    only mechanism that ever advances a tracked setup's lifecycle, and it
 *    only fires when a later chart upload of the SAME pair produces a
 *    reliably-read price. Best-effort and additive: never throws into the
 *    analysis path, mirroring recordAnalysisEvent()'s own contract.
 */

interface LifecycleRow {
  id: string;
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
  observations: { id: string; sourceAnalysisId: string; price: number | null; state: string; observedAt: Date }[];
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
    })),
  };
}

const OBSERVATIONS_INCLUDE = {
  observations: { orderBy: { observedAt: "desc" as const }, take: 20 },
};

export interface CreateLifecycleInput {
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
 * Create the lifecycle record for a just-generated directional setup, or
 * return the EXISTING one untouched if this exact setupId was already
 * tracked (idempotent — re-opening the Rex Trade Setup modal for the same
 * analysis must never reset or duplicate it). Original levels are only ever
 * written on first creation; this function never updates them afterward.
 *
 * Best-effort: returns null (never throws) on any failure so a persistence
 * problem can never break setup generation itself.
 */
export async function createOrGetSetupLifecycle(
  input: CreateLifecycleInput
): Promise<TradeSetupLifecycleDTO | null> {
  try {
    const existing = await prisma.tradeSetupLifecycle.findUnique({
      where: { setupId: input.setupId },
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

/** Fetch a single tracked setup by its stable setupId (report.id). Used to
 *  re-fetch (never recompute) lifecycle state across page refreshes. */
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
 * advance every one of this user's still-live tracked setups for that pair:
 *   1. Retrieve the relevant active setup(s) (non-terminal, same user+pair).
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
      await prisma.setupLifecycleObservation.upsert({
        where: { setupId_sourceAnalysisId: { setupId: setup.id, sourceAnalysisId: input.sourceAnalysisId } },
        create: {
          setupId: setup.id,
          sourceAnalysisId: input.sourceAnalysisId,
          price: input.price,
          state: newState,
        },
        // Same source analysis reprocessed: refresh the reading in place
        // rather than add a second row for the identical event.
        update: { price: input.price, state: newState },
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
