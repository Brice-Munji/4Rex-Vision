/**
 * Focused tests for the Sprint 5 Review Entry Freshness engine
 * (src/lib/rex/entry-freshness.ts). Pure/deterministic — fixed `now`
 * timestamps, never Date.now(). Run with:
 *   npx tsx src/lib/rex/__tests__/entry-freshness.test.ts
 * or:
 *   npm run test:entry-freshness
 */
import { evaluateEntryFreshness, TERMINAL_FRESHNESS_STATES, type EntryFreshnessState } from "../entry-freshness";
import type { LifecycleOriginalLevels } from "../setup-lifecycle";
import { SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME, DEFAULT_EXPIRY_MINUTES } from "../sniper-entry";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const GENERATED_AT = new Date("2026-11-20T12:00:00.000Z");
const NOW = new Date("2026-11-20T12:30:00.000Z"); // 30 min later — well within every expiry window

// Same EURUSD fixture numbers used elsewhere in this suite (lifecycle-ownership.test.ts).
const BULLISH: LifecycleOriginalLevels = {
  bias: "Bullish",
  entryZone: "1.2700 – 1.2710",
  invalidationMid: 1.268,
  target1: "1.2850 – 1.2860",
  target1Mid: 1.2855,
  target2: "1.2950 – 1.2960",
  target2Mid: 1.2955,
};

// Mirrored GBPUSD-style bearish fixture — invalidation ABOVE entry, targets BELOW.
const BEARISH: LifecycleOriginalLevels = {
  bias: "Bearish",
  entryZone: "1.2700 – 1.2710",
  invalidationMid: 1.274,
  target1: "1.2550 – 1.2560",
  target1Mid: 1.2555,
  target2: "1.2450 – 1.2460",
  target2Mid: 1.2455,
};

function evalAt(
  original: LifecycleOriginalLevels,
  price: number,
  previous: EntryFreshnessState | null,
  opts: { now?: Date; generatedAt?: Date; timeframe?: string | null } = {}
) {
  return evaluateEntryFreshness({
    original,
    price,
    now: opts.now ?? NOW,
    generatedAt: opts.generatedAt ?? GENERATED_AT,
    timeframe: opts.timeframe ?? "H1",
    previous,
  });
}

/* ── 1. Bullish: approaching / reached / missed ────────────────────────── */
{
  // Below the zone, within one zone-width (width 0.001) of the low edge.
  check("1a bullish approaching from below", evalAt(BULLISH, 1.2695, null) === "APPROACHING");
  // Inside the zone.
  check("1b bullish entry reached", evalAt(BULLISH, 1.2705, null) === "ENTRY_REACHED");
  // Beyond the zone's far (upper) edge, nowhere near a target.
  check("1c bullish entry missed", evalAt(BULLISH, 1.29, null) === "ENTRY_MISSED");
  // Below the zone, OUTSIDE the one-zone-width approach window, but still
  // above the invalidation level (1.2683 > invalidationMid 1.268) — a
  // "merely far away" price, not an invalidation.
  check("1d bullish still fresh (far away, not invalidated)", evalAt(BULLISH, 1.2683, null) === "FRESH");
  // At/through the invalidation level.
  check("1e bullish invalidated", evalAt(BULLISH, 1.268, null) === "INVALIDATED");
}

/* ── 2. Bearish: approaching / reached / missed — NOT identical directional
 *      assumptions to bullish (this is the actual "directional integrity"
 *      requirement, not just a label swap) ─────────────────────────────── */
{
  // Above the zone (bearish approaches from ABOVE, opposite of bullish).
  check("2a bearish approaching from above", evalAt(BEARISH, 1.2715, null) === "APPROACHING");
  check("2b bearish entry reached", evalAt(BEARISH, 1.2705, null) === "ENTRY_REACHED");
  // Beyond the zone's far (LOWER) edge for a bearish setup — the opposite
  // side from the bullish case above; using the bullish formula here would
  // wrongly classify this.
  check("2c bearish entry missed", evalAt(BEARISH, 1.26, null) === "ENTRY_MISSED");
  // Above the zone, outside the approach window, but still below the
  // (higher, for a short) invalidation level (1.273 < invalidationMid 1.274).
  check("2d bearish still fresh (far away, not invalidated)", evalAt(BEARISH, 1.273, null) === "FRESH");
  // At/through the (higher, for a short) invalidation level.
  check("2e bearish invalidated", evalAt(BEARISH, 1.274, null) === "INVALIDATED");
  // Sanity: the SAME raw price that invalidates the bearish setup (1.274)
  // would NOT invalidate the bullish one (it's above entry, not a breach).
  check("2f same price, opposite verdict by direction", evalAt(BULLISH, 1.274, null) !== "INVALIDATED");
}

/* ── 3. Staleness — reuses SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME verbatim ──── */
{
  // 1.2683: far from the zone and NOT invalidated (same safe "merely far
  // away" price as 1d above) — isolates the staleness check specifically.
  const FAR_NOT_INVALIDATED = 1.2683;
  check("3a table has H1 → 1440", SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME.H1 === 1440);
  const justUnder = new Date(GENERATED_AT.getTime() + 1439 * 60 * 1000);
  const justOver = new Date(GENERATED_AT.getTime() + 1441 * 60 * 1000);
  check(
    "3b still within H1's window → not stale",
    evalAt(BULLISH, FAR_NOT_INVALIDATED, null, { now: justUnder, timeframe: "H1" }) === "FRESH"
  );
  check(
    "3c past H1's window → STALE",
    evalAt(BULLISH, FAR_NOT_INVALIDATED, null, { now: justOver, timeframe: "H1" }) === "STALE"
  );
  // A different timeframe has a DIFFERENT window — M15's 360min fallback
  // would already be stale at the same elapsed time H1 is still fine at.
  check(
    "3d M15's shorter window is already stale at H1's still-fine age",
    evalAt(BULLISH, FAR_NOT_INVALIDATED, null, { now: justUnder, timeframe: "M15" }) === "STALE"
  );
  // Unrecognized/null timeframe falls back to DEFAULT_EXPIRY_MINUTES.
  check("3e DEFAULT_EXPIRY_MINUTES is 1440", DEFAULT_EXPIRY_MINUTES === 1440);
  check(
    "3f null timeframe uses the default window, not an invented one",
    evalAt(BULLISH, FAR_NOT_INVALIDATED, null, { now: justUnder, timeframe: null }) === "FRESH" &&
      evalAt(BULLISH, FAR_NOT_INVALIDATED, null, { now: justOver, timeframe: null }) === "STALE"
  );
  // Staleness does not depend on where price happens to be — even sitting
  // inside the entry zone past the window reports STALE, not ENTRY_REACHED
  // (see module doc on why INVALIDATED/STALE outrank zone geometry).
  check(
    "3g stale even if price is coincidentally inside the entry zone",
    evalAt(BULLISH, 1.2705, null, { now: justOver, timeframe: "H1" }) === "STALE"
  );
}

/* ── 4. Stickiness / no regression / idempotency ───────────────────────── */
{
  // Once ENTRY_REACHED, price moving AWAY must not downgrade it.
  const reached = evalAt(BULLISH, 1.2705, null);
  check("4a reached once", reached === "ENTRY_REACHED");
  const afterMovingAway = evalAt(BULLISH, 1.0, reached); // price retreats far from the zone
  check("4b entry-reached verdict is sticky, not downgraded to FRESH", afterMovingAway === "ENTRY_REACHED");

  // Once ENTRY_MISSED, price returning to the zone must not "un-miss" it.
  const missed = evalAt(BULLISH, 1.29, null);
  check("4c missed once", missed === "ENTRY_MISSED");
  const afterReturning = evalAt(BULLISH, 1.2705, missed); // price comes back inside the original zone
  check("4d entry-missed verdict is sticky, not flipped to ENTRY_REACHED", afterReturning === "ENTRY_MISSED");

  // Once STALE, a later "fresh-looking" call must not revive it.
  const stale = evalAt(BULLISH, 1.2683, null, { now: new Date(GENERATED_AT.getTime() + 1441 * 60 * 1000) });
  check("4e went stale", stale === "STALE");
  const afterStaleRetest = evalAt(BULLISH, 1.2705, stale, { now: new Date(GENERATED_AT.getTime() + 1500 * 60 * 1000) });
  check("4f stale verdict is sticky, not revived by a later retest", afterStaleRetest === "STALE");

  // Once INVALIDATED, nothing revives it.
  const invalidated = evalAt(BULLISH, 1.268, null);
  check("4g invalidated once", invalidated === "INVALIDATED");
  const afterInvalidRecovery = evalAt(BULLISH, 1.2705, invalidated);
  check("4h invalidated verdict is sticky, never revived", afterInvalidRecovery === "INVALIDATED");

  // Idempotency: calling twice with the IDENTICAL inputs (including the
  // same `previous`) always returns the identical result — a direct
  // consequence of this being a pure function, re-stated explicitly as its
  // own check per the task's "repeated evaluation" requirement.
  const callA = evalAt(BULLISH, 1.2695, null);
  const callB = evalAt(BULLISH, 1.2695, null);
  check("4i repeated evaluation with identical inputs is idempotent", callA === callB, `${callA} vs ${callB}`);
  // And simulating an actual repeated monitoring cycle — the SAME resolved
  // verdict fed back in as `previous` (as lifecycle.ts does on every poll)
  // reproduces itself, not just by sticky-override but because the
  // underlying price fact is unchanged too.
  check(
    "4i' a resolved verdict fed back as its own `previous` reproduces itself",
    evalAt(BULLISH, 1.2705, "ENTRY_REACHED") === "ENTRY_REACHED"
  );

  // FRESH <-> APPROACHING may legitimately fluctuate — neither is a
  // "resolved" verdict, so this is NOT a prevented regression.
  const approaching = evalAt(BULLISH, 1.2695, null);
  check("4j approaching is not sticky/terminal", !TERMINAL_FRESHNESS_STATES.has(approaching as EntryFreshnessState));
  const backToFresh = evalAt(BULLISH, 1.2683, approaching);
  check("4k fresh/approaching may fluctuate freely (not a regression)", backToFresh === "FRESH");
}

/* ── 5. Malformed/missing input — never guess, never invent a 7th state ── */
{
  const malformedZone: LifecycleOriginalLevels = { ...BULLISH, entryZone: "not a zone" };
  check("5a unparsable entry zone with no previous → null (can't classify)", evalAt(malformedZone, 1.27, null) === null);
  check(
    "5b unparsable entry zone WITH a previous verdict → previous preserved, never cleared",
    evalAt(malformedZone, 1.27, "APPROACHING") === "APPROACHING"
  );
  check("5c non-finite price with no previous → null", evalAt(BULLISH, NaN, null) === null);
  check("5d non-finite price preserves an existing previous verdict", evalAt(BULLISH, NaN, "FRESH") === "FRESH");
}

/* ── 6. Original levels are never mutated by evaluation ─────────────────── */
{
  const original = { ...BULLISH };
  const snapshot = JSON.stringify(original);
  evalAt(original, 1.2705, null);
  evalAt(original, 1.0, "ENTRY_REACHED");
  check("6a evaluateEntryFreshness never mutates its `original` input", JSON.stringify(original) === snapshot);
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nEntry Freshness tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
