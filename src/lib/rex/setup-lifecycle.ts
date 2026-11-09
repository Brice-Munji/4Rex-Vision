/**
 * Rex Trade Setup — Lifecycle Monitoring (Stage 1).
 *
 * PURE, deterministic classifier only — no database, no "server-only", no
 * import from trade-setup.ts. Given an ALREADY-GENERATED setup's own public
 * levels (DirectionalSetup's bias/entryZone/invalidationMid/target1(Mid)/
 * target2(Mid) — never recomputed here) and a single later price reading,
 * decide which of the 9 lifecycle states currently applies.
 *
 * This module NEVER:
 *  - calls buildTradeSetup() or reads/modifies trade-setup.ts in any way,
 *  - changes bias, entry/invalidation/target levels, R:R, or quality,
 *  - generates a replacement setup,
 *  - invents a new price tolerance disconnected from the setup's own
 *    already-computed geometry (see isApproaching below).
 *
 * Reuses sniper-entry.ts's own exported `parseZoneBounds` directly (no
 * duplication) for turning a "low – high" display zone back into numeric
 * bounds — the same parser Sniper Entry already relies on for its own
 * entry-zone retest check.
 */

import { parseZoneBounds } from "./sniper-entry";

export type LifecycleState =
  | "ACTIVE"
  | "APPROACHING_ENTRY"
  | "ENTRY_ZONE_REACHED"
  | "ENTRY_MISSED"
  | "TARGET_APPROACHING"
  | "TP1_HIT"
  | "TP2_HIT"
  | "INVALIDATED"
  | "UNVERIFIED";

/** Once a tracked setup reaches one of these, monitoring stops touching it —
 *  nothing "comes after" either in the state list in Section 3 of the spec. */
export const TERMINAL_LIFECYCLE_STATES: ReadonlySet<LifecycleState> = new Set([
  "INVALIDATED",
  "TP2_HIT",
]);

/**
 * Client-safe DTO shapes (used by both the server persistence layer in
 * lifecycle.ts and the "use client" setup UI). Defined here, in a plain
 * module with no `"server-only"`/Prisma import, mirroring this codebase's
 * existing convention of keeping client-importable DTOs out of
 * `"server-only"` files (e.g. JournalEntryDTO lives in journal/constants.ts,
 * not the "server-only" journal/service.ts).
 */
export interface LifecycleObservationDTO {
  id: string;
  sourceAnalysisId: string;
  price: number | null;
  state: LifecycleState;
  observedAt: string;
}

export interface TradeSetupLifecycleDTO {
  id: string;
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
  generatedAt: string;
  priceAtGeneration: number | null;
  state: LifecycleState;
  lastPrice: number | null;
  lastCheckedAt: string | null;
  observations: LifecycleObservationDTO[];
}

/** The slice of an already-generated DirectionalSetup lifecycle monitoring
 *  needs. Deliberately just the ORIGINAL, immutable levels — bias/zones/
 *  targets are read-only inputs here, exactly as captured at generation. */
export interface LifecycleOriginalLevels {
  bias: "Bullish" | "Bearish";
  /** DirectionalSetup.entryZone's own formatted string, e.g. "1.2700 – 1.2710". */
  entryZone: string;
  invalidationMid: number;
  /** DirectionalSetup.target1's own formatted zone string. */
  target1: string;
  target1Mid: number;
  /** DirectionalSetup.target2's own formatted zone string. */
  target2: string;
  target2Mid: number;
}

function isInside(price: number, bounds: { low: number; high: number }): boolean {
  return price >= bounds.low && price <= bounds.high;
}

/**
 * "Approaching" a zone — price is outside it but within one more zone-width
 * of its nearest edge. This is NOT a new invented trading tolerance: it's a
 * purely informational/WATCH-ONLY proximity label derived entirely from the
 * zone's OWN already-computed width (the same "derive from structure, never
 * a fixed %/distance" spirit buildTradeSetup() already applies to the zones
 * themselves — see trade-setup.ts Rule 9). It never affects validity, entry,
 * invalidation, targets, R:R, or quality — display/monitoring only.
 */
function isApproaching(price: number, bounds: { low: number; high: number }): boolean {
  const width = bounds.high - bounds.low;
  if (width <= 0) return false;
  if (isInside(price, bounds)) return false;
  const distance = price < bounds.low ? bounds.low - price : price - bounds.high;
  return distance <= width;
}

/** Has price reached/passed a target level in the favorable direction? Plain
 *  numeric comparison against the setup's own already-computed target mid —
 *  not a threshold, the most literal reading of "price reached the target". */
function hasReachedLevel(bias: "Bullish" | "Bearish", price: number, levelMid: number): boolean {
  return bias === "Bullish" ? price >= levelMid : price <= levelMid;
}

/**
 * Structural-invalidation breach. The EXACT same price-vs-invalidationMid
 * comparison evaluateSniperEntry() uses at its step 6 (sniper-entry.ts) and
 * the same direction convention buildTradeSetup() itself enforces for the
 * invalidation side. Re-stated here rather than imported because the
 * original is an inline expression inside evaluateSniperEntry(), not an
 * exported function — this is the same formula, not a new threshold.
 */
function isInvalidationBreached(
  bias: "Bullish" | "Bearish",
  price: number,
  invalidationMid: number
): boolean {
  return bias === "Bullish" ? price <= invalidationMid : price >= invalidationMid;
}

/**
 * Has price moved beyond the entry zone's far (target-facing) edge — i.e.
 * left the actionable zone without being taken, heading toward the target?
 *
 * NOTE on a formula deliberately NOT reused here: trade-setup.ts's own
 * anti-chase gate (lines ~530-537, `current != null` branch) rejects a
 * BRAND-NEW setup once price has run past the entry edge by more than the
 * full entry-to-Target-1 distance. Algebraically that condition reduces
 * exactly to "price has reached Target 1" (beyond > |t1-entryEdge| ⇔ price
 * is at-or-past t1 itself, measured from the same edge) — i.e. it is the
 * SAME price fact as TP1_HIT, not a distinct "just missed it" signal.
 * Reusing it verbatim for ENTRY_MISSED would make ENTRY_MISSED practically
 * unreachable once TP1_HIT is (correctly) checked first. So ENTRY_MISSED is
 * instead built from the entry zone's own already-established edge and the
 * setup's own bias — zero new invented distance/threshold, just a
 * direction-aware comparison against a boundary the setup already has.
 */
function isBeyondEntryTowardTarget(
  bias: "Bullish" | "Bearish",
  price: number,
  entryBounds: { low: number; high: number }
): boolean {
  return bias === "Bullish" ? price > entryBounds.high : price < entryBounds.low;
}

/**
 * Classify the current lifecycle state of a tracked setup given one price
 * reading. Pure and deterministic — same inputs always produce the same
 * state. Returns "UNVERIFIED" whenever a reliable classification can't be
 * established from the inputs (missing price, unparsable zone) rather than
 * guessing.
 *
 * Precedence (checked in this exact order, each step only reached once every
 * earlier one is ruled out):
 *   1. UNVERIFIED        — no reliable price, or the entry zone can't be parsed
 *   2. INVALIDATED        — structural invalidation breached (a price fact; overrides everything)
 *   3. TP2_HIT             — price reached Target 2 (implies Target 1 already passed)
 *   4. TP1_HIT             — price reached Target 1
 *   5. TARGET_APPROACHING  — nearing (not yet at) Target 1 or Target 2
 *   6. ENTRY_ZONE_REACHED — price is currently inside the entry zone
 *   7. ENTRY_MISSED        — price ran past the entry zone toward the target without being approached/at a target yet
 *   8. APPROACHING_ENTRY   — nearing the entry zone from the opposite side
 *   9. ACTIVE (default)    — none of the above; setup is simply unfolding
 */
export function determineLifecycleState(
  original: LifecycleOriginalLevels,
  price: number | null
): LifecycleState {
  if (price == null || !Number.isFinite(price)) return "UNVERIFIED";

  const entryBounds = parseZoneBounds(original.entryZone);
  if (!entryBounds) return "UNVERIFIED";

  const { bias, invalidationMid, target1Mid, target2Mid } = original;

  // 1. Structural invalidation — a price fact, checked first (matches the
  //    precedence evaluateSniperEntry() itself uses: invalidation before retest).
  if (isInvalidationBreached(bias, price, invalidationMid)) return "INVALIDATED";

  // 2/3. Targets — TP2 before TP1 (reaching TP2 implies TP1 already passed).
  if (hasReachedLevel(bias, price, target2Mid)) return "TP2_HIT";
  if (hasReachedLevel(bias, price, target1Mid)) return "TP1_HIT";

  // 4. Target approaching — within one zone-width of either target, not yet there.
  const t1Bounds = parseZoneBounds(original.target1);
  const t2Bounds = parseZoneBounds(original.target2);
  if ((t1Bounds && isApproaching(price, t1Bounds)) || (t2Bounds && isApproaching(price, t2Bounds))) {
    return "TARGET_APPROACHING";
  }

  // 5. Entry zone reached — price is in the zone right now.
  if (isInside(price, entryBounds)) return "ENTRY_ZONE_REACHED";

  // 6. Entry missed — already past the zone toward the target (and, by the
  //    precedence above, not yet close enough to call it "approaching target").
  if (isBeyondEntryTowardTarget(bias, price, entryBounds)) return "ENTRY_MISSED";

  // 7. Approaching entry — nearing the zone from the opposite side.
  if (isApproaching(price, entryBounds)) return "APPROACHING_ENTRY";

  // 8. Default — setup is live, nothing notable yet.
  return "ACTIVE";
}
