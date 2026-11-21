/**
 * Rex Trade Setup — Review Entry Freshness engine (Sprint 5).
 *
 * PURE, deterministic classifier only — no database, no "server-only", no
 * import from trade-setup.ts, and no network. Given an already-generated
 * setup's own original levels, a single ALREADY-VALIDATED market-price
 * reading (never a chart-upload price — see "SOURCE" below), and the
 * setup's PREVIOUS freshness verdict, decides whether the ORIGINAL ENTRY
 * OPPORTUNITY specifically — not the broader lifecycle `state` in
 * setup-lifecycle.ts, which also tracks post-entry TP/target progress —
 * remains actionable.
 *
 * WHY A SEPARATE ENGINE, NOT A 10TH LifecycleState VALUE: Sprint 5 asks for
 * exactly six states (FRESH/APPROACHING/ENTRY_REACHED/ENTRY_MISSED/STALE/
 * INVALIDATED) answering a narrower question than the existing 9-state
 * LifecycleState enum (which also encodes TARGET_APPROACHING/TP1_HIT/
 * TP2_HIT — post-entry progress, out of scope here). Four of the six names
 * are a direct conceptual match for four EXISTING LifecycleState values
 * (ACTIVE~FRESH, APPROACHING_ENTRY~APPROACHING, ENTRY_ZONE_REACHED~
 * ENTRY_REACHED, ENTRY_MISSED is literally identical) and INVALIDATED is
 * identical too — this module reuses THOSE EXACT geometric checks (by
 * importing setup-lifecycle.ts's now-exported isInside/isApproaching/
 * isInvalidationBreached/isBeyondEntryTowardTarget verbatim, zero
 * duplicated logic) rather than re-deriving a second, possibly-diverging
 * copy. The one genuinely NEW concept is STALE (time-based expiry), which
 * has no existing LifecycleState equivalent. Folding STALE into the
 * EXISTING state enum would require inventing a precedence against
 * TARGET_APPROACHING/TP1_HIT/TP2_HIT that Sprint 5 never asked for and
 * risks "introducing duplicate or conflicting classifications" — the one
 * thing Sprint 5 explicitly warns against. A separate, narrowly-scoped
 * field alongside `state` (TradeSetupLifecycle.entryFreshness) avoids that
 * entirely while still satisfying "use the existing lifecycle states
 * wherever possible" at the LOGIC level.
 *
 * THE STALE THRESHOLD IS NOT INVENTED: "setup has exceeded its validity
 * period" already has exactly one existing, directly-applicable answer in
 * this codebase — sniper-entry.ts's SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME,
 * which answers the SAME question ("how long, per original timeframe,
 * should this setup's entry opportunity remain worth watching") for its
 * own lower-timeframe-confirmation flow. That table (and its
 * DEFAULT_EXPIRY_MINUTES fallback) is imported and reused VERBATIM here —
 * no new number is introduced anywhere in this file.
 *
 * SOURCE: `price` here must ALWAYS be an already-validated, current market
 * observation (src/lib/market/forex-price.ts, via
 * lifecycle.ts#recordMarketPriceObservations) — never a chart-upload price.
 * This is an explicit Sprint 5 requirement ("Never use chart-upload prices
 * as though they were current market prices"): lifecycle.ts's OTHER entry
 * point, recordLifecycleObservations() (the Sprint 1-2 upload-driven path),
 * deliberately never calls this module at all.
 *
 * STICKINESS / NO REGRESSION: once a resolved verdict is reached
 * (ENTRY_REACHED, ENTRY_MISSED, STALE, or INVALIDATED — see
 * TERMINAL_FRESHNESS_STATES), it is PERMANENT: later price or time data can
 * never move freshness backward out of it. Only FRESH and APPROACHING can
 * still change on a later call (they are not "resolved" events, just "how
 * close is price right now", and fluctuating between them as price moves
 * is not a regression in any meaningful sense). This directly satisfies
 * "prevent lifecycle state regression" and, as a direct consequence, makes
 * repeated evaluation with the same inputs idempotent.
 *
 * PRECEDENCE (checked in this exact order):
 *   1. Sticky — a previous resolved verdict is returned unchanged.
 *   2. INVALIDATED — structural invalidation breach, a price fact. Kept as
 *      the HIGHEST-precedence check, mirroring determineLifecycleState()'s
 *      own "invalidation overrides everything" philosophy (the classifier
 *      this engine is told to reuse wherever possible) — a judgment call
 *      where sniper-entry.ts's own control flow (which checks staleness
 *      before invalidation) was NOT followed verbatim, because that
 *      ordering there is shaped by short-circuiting unrelated evidence-text
 *      parsing, not a statement that staleness outranks a confirmed price
 *      breach. Documented here rather than silently picked.
 *   3. STALE — validity window exceeded (time fact).
 *   4. ENTRY_REACHED — price is inside the entry zone right now.
 *   5. ENTRY_MISSED — price ran past the zone toward the target.
 *   6. APPROACHING — nearing the zone from the opposite side.
 *   7. FRESH (default) — none of the above.
 */

import {
  isInside,
  isApproaching,
  isInvalidationBreached,
  isBeyondEntryTowardTarget,
  type LifecycleOriginalLevels,
} from "./setup-lifecycle";
import { parseZoneBounds, SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME, DEFAULT_EXPIRY_MINUTES } from "./sniper-entry";

export type EntryFreshnessState =
  | "FRESH"
  | "APPROACHING"
  | "ENTRY_REACHED"
  | "ENTRY_MISSED"
  | "STALE"
  | "INVALIDATED";

/** Once reached, these are PERMANENT — see module doc's "STICKINESS" note. */
export const TERMINAL_FRESHNESS_STATES: ReadonlySet<EntryFreshnessState> = new Set([
  "ENTRY_REACHED",
  "ENTRY_MISSED",
  "STALE",
  "INVALIDATED",
]);

export interface EntryFreshnessInput {
  /** Reuses the SAME shape determineLifecycleState() takes — lifecycle.ts
   *  already builds exactly this object for that call; passing it straight
   *  through here avoids a second, near-duplicate "original levels" type.
   *  (target1/target1Mid/target2/target2Mid are present but unused by this
   *  engine — entry freshness is not concerned with target progress.) */
  original: LifecycleOriginalLevels;
  /** Already-validated current market price — see module doc's "SOURCE". */
  price: number;
  now: Date;
  /** TradeSetupLifecycle.generatedAt — the SAME timestamp
   *  SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME is already measured from. */
  generatedAt: Date;
  /** TradeSetupLifecycle.timeframe — selects the expiry window; falls back
   *  to DEFAULT_EXPIRY_MINUTES when null/unrecognized, same as Sniper Entry. */
  timeframe: string | null;
  /** The setup's CURRENT entryFreshness value (null if never evaluated) —
   *  required input for the sticky/no-regression guarantee above. */
  previous: EntryFreshnessState | null;
}

/**
 * Evaluate (or re-affirm) a setup's entry-freshness verdict. Pure and
 * deterministic — same inputs always produce the same output, which is
 * exactly "repeated evaluations are idempotent". Returns `null` only when
 * the input is too malformed to classify at all (unparsable entry zone) —
 * never a 7th invented state; the caller simply leaves the stored value
 * unchanged in that case, same as every other "can't tell, don't guess"
 * path in this codebase.
 */
export function evaluateEntryFreshness(input: EntryFreshnessInput): EntryFreshnessState | null {
  const { original, price, now, generatedAt, timeframe, previous } = input;

  // 1. Sticky: a resolved verdict is permanent.
  if (previous && TERMINAL_FRESHNESS_STATES.has(previous)) {
    return previous;
  }

  if (!Number.isFinite(price)) return previous; // defensive — see RecordMarketObservationInput's own non-null contract

  const entryBounds = parseZoneBounds(original.entryZone);
  if (!entryBounds) return previous; // can't reliably classify; never guess, never regress

  // 2. Structural invalidation — overrides everything (see module doc).
  if (isInvalidationBreached(original.bias, price, original.invalidationMid)) {
    return "INVALIDATED";
  }

  // 3. Validity-period expiry — reuses Sniper Entry's own table verbatim.
  const ageMinutes = (now.getTime() - generatedAt.getTime()) / 60000;
  const expiryMinutes = (timeframe ? SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME[timeframe] : undefined) ?? DEFAULT_EXPIRY_MINUTES;
  if (ageMinutes >= expiryMinutes) {
    return "STALE";
  }

  // 4. Entry reached right now.
  if (isInside(price, entryBounds)) {
    return "ENTRY_REACHED";
  }

  // 5. Entry missed — ran past the zone toward the target without ever
  //    being inside it (a PRIOR time it was inside is covered by the
  //    stickiness check above, once this function has ever returned that).
  if (isBeyondEntryTowardTarget(original.bias, price, entryBounds)) {
    return "ENTRY_MISSED";
  }

  // 6. Approaching the zone from the opposite side.
  if (isApproaching(price, entryBounds)) {
    return "APPROACHING";
  }

  // 7. Default — still within the validity window, nothing notable yet.
  return "FRESH";
}
