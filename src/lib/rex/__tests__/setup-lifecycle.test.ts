/**
 * Focused tests for Rex Trade Setup Lifecycle Monitoring (Stage 1) — the
 * pure classifier only (determineLifecycleState). Deterministic fixed
 * prices, no DB, no Date.now(). Run with:
 *   npx tsx src/lib/rex/__tests__/setup-lifecycle.test.ts
 */
import {
  determineLifecycleState,
  TERMINAL_LIFECYCLE_STATES,
  type LifecycleOriginalLevels,
} from "../setup-lifecycle";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

/* ── Fixtures ──────────────────────────────────────────────────────────────
 * Entry zone width 0.0010 on both — the "approaching" band (one more
 * zone-width beyond the near edge) is therefore exactly 0.0010 wide too. */
const bullish: LifecycleOriginalLevels = {
  bias: "Bullish",
  entryZone: "1.2700 – 1.2710",
  invalidationMid: 1.268,
  target1: "1.2850 – 1.2860",
  target1Mid: 1.2855,
  target2: "1.2950 – 1.2960",
  target2Mid: 1.2955,
};
const bearish: LifecycleOriginalLevels = {
  bias: "Bearish",
  entryZone: "1.0980 – 1.0990",
  invalidationMid: 1.101,
  target1: "1.0850 – 1.0860",
  target1Mid: 1.0855,
  target2: "1.0750 – 1.0760",
  target2Mid: 1.0755,
};

/* ── Bullish: one price per state, in the setup's own favorable direction ── */
check("1a bullish: null price → UNVERIFIED", determineLifecycleState(bullish, null) === "UNVERIFIED");
check(
  "1b bullish: unparsable entry zone → UNVERIFIED",
  determineLifecycleState({ ...bullish, entryZone: "garbage" }, 1.27) === "UNVERIFIED"
);
check("2 bullish: price at/through invalidation → INVALIDATED", determineLifecycleState(bullish, 1.267) === "INVALIDATED");
check("2b bullish: price exactly AT invalidationMid → INVALIDATED (inclusive)", determineLifecycleState(bullish, 1.268) === "INVALIDATED");
check("3 bullish: price beyond Target 2 → TP2_HIT", determineLifecycleState(bullish, 1.296) === "TP2_HIT");
check("4 bullish: price at Target 1, below Target 2 → TP1_HIT", determineLifecycleState(bullish, 1.2857) === "TP1_HIT");
check("5 bullish: price nearing Target 1 (not yet there) → TARGET_APPROACHING", determineLifecycleState(bullish, 1.2845) === "TARGET_APPROACHING");
check("6 bullish: price inside the entry zone → ENTRY_ZONE_REACHED", determineLifecycleState(bullish, 1.2705) === "ENTRY_ZONE_REACHED");
check("7 bullish: price ran past the zone toward target → ENTRY_MISSED", determineLifecycleState(bullish, 1.275) === "ENTRY_MISSED");
check("8 bullish: price nearing the zone from below → APPROACHING_ENTRY", determineLifecycleState(bullish, 1.2695) === "APPROACHING_ENTRY");
check("9 bullish: price with plenty of room either side → ACTIVE", determineLifecycleState(bullish, 1.2685) === "ACTIVE");

/* ── Bearish: mirror image, same 9 checks ─────────────────────────────────── */
check("10 bearish: price at/through invalidation → INVALIDATED", determineLifecycleState(bearish, 1.1015) === "INVALIDATED");
check("11 bearish: price beyond Target 2 → TP2_HIT", determineLifecycleState(bearish, 1.075) === "TP2_HIT");
check("12 bearish: price at Target 1, above Target 2 → TP1_HIT", determineLifecycleState(bearish, 1.0853) === "TP1_HIT");
check("13 bearish: price nearing Target 1 (not yet there) → TARGET_APPROACHING", determineLifecycleState(bearish, 1.0865) === "TARGET_APPROACHING");
check("14 bearish: price inside the entry zone → ENTRY_ZONE_REACHED", determineLifecycleState(bearish, 1.0985) === "ENTRY_ZONE_REACHED");
check("15 bearish: price ran past the zone toward target → ENTRY_MISSED", determineLifecycleState(bearish, 1.09) === "ENTRY_MISSED");
check("16 bearish: price nearing the zone from above → APPROACHING_ENTRY", determineLifecycleState(bearish, 1.0995) === "APPROACHING_ENTRY");
check("17 bearish: price with plenty of room either side → ACTIVE", determineLifecycleState(bearish, 1.1005) === "ACTIVE");

/* ── Determinism + no mutation (same convention as sniper-entry.test.ts) ──── */
{
  const before = JSON.stringify(bullish);
  const r1 = determineLifecycleState(bullish, 1.2705);
  const r2 = determineLifecycleState(bullish, 1.2705);
  const after = JSON.stringify(bullish);
  check("18a same inputs → same state (deterministic)", r1 === r2 && r1 === "ENTRY_ZONE_REACHED");
  check("18b original levels object never mutated", before === after);
}

/* ── Boundary: exactly on the entry zone edges is inclusive ──────────────── */
check("19a bullish: price exactly at entry zone low edge → ENTRY_ZONE_REACHED", determineLifecycleState(bullish, 1.27) === "ENTRY_ZONE_REACHED");
check("19b bullish: price exactly at entry zone high edge → ENTRY_ZONE_REACHED", determineLifecycleState(bullish, 1.271) === "ENTRY_ZONE_REACHED");

/* ── Terminal-state set used by the DB layer to stop further monitoring ──── */
check("20a INVALIDATED is terminal", TERMINAL_LIFECYCLE_STATES.has("INVALIDATED"));
check("20b TP2_HIT is terminal", TERMINAL_LIFECYCLE_STATES.has("TP2_HIT"));
check("20c ACTIVE is NOT terminal", !TERMINAL_LIFECYCLE_STATES.has("ACTIVE"));
check("20d TP1_HIT is NOT terminal (still watched for TP2/invalidation)", !TERMINAL_LIFECYCLE_STATES.has("TP1_HIT"));
check("20e ENTRY_MISSED is NOT terminal (still watched, no replacement setup generated)", !TERMINAL_LIFECYCLE_STATES.has("ENTRY_MISSED"));

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nSetup Lifecycle tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
