/**
 * Focused tests for Rex Sniper Entry (lower-timeframe execution confirmation).
 * Pure/deterministic — fixed `now` timestamps, never Date.now(). Run with:
 *   npx tsx src/lib/rex/__tests__/sniper-entry.test.ts
 */
import {
  evaluateSniperEntry,
  isLowerTimeframe,
  hasLowerTimeframeAvailable,
  parseZoneBounds,
  SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME,
  type SniperOriginalSetup,
  type SniperConfirmationInput,
} from "../sniper-entry";
import type { NewsGuard } from "@/lib/economicCalendar/blocking";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const GENERATED_AT = "2026-09-10T12:00:00.000Z";
const NOW = new Date("2026-09-10T12:30:00.000Z"); // 30 min later — well within every expiry window

const newsClear: NewsGuard = {
  state: "clear",
  risk: "Low",
  status: "No high-impact news nearby.",
  event: null,
  currency: null,
  minutesUntil: null,
};
const newsBlocked: NewsGuard = {
  state: "blocked",
  risk: "High",
  status: "High-impact USD event in 8 minutes.",
  event: "US CPI",
  currency: "USD",
  minutesUntil: 8,
};

const bullishOriginal: SniperOriginalSetup = {
  pair: "GBPUSD",
  timeframe: "H1",
  bias: "Bullish",
  entryZone: "1.2700 – 1.2710",
  invalidationMid: 1.268,
  generatedAtIso: GENERATED_AT,
};
const bearishOriginal: SniperOriginalSetup = {
  pair: "EURUSD",
  timeframe: "H1",
  bias: "Bearish",
  entryZone: "1.0980 – 1.0990",
  invalidationMid: 1.101,
  generatedAtIso: GENERATED_AT,
};

const goodBullishConfirmation: SniperConfirmationInput = {
  pair: "GBPUSD",
  symbol: "GBPUSD",
  timeframe: "M5",
  currentPrice: "1.2705",
  priceAxisLegible: true,
  trendDirection: "Uptrend",
  evidence: [
    {
      label: "Rejection",
      explanation:
        "Bullish engulfing candle with a long lower wick rejecting the demand zone, followed by a break of structure above the recent minor high.",
    },
  ],
};
const goodBearishConfirmation: SniperConfirmationInput = {
  pair: "EURUSD",
  symbol: "EURUSD",
  timeframe: "M5",
  currentPrice: "1.0985",
  priceAxisLegible: true,
  trendDirection: "Downtrend",
  evidence: [
    {
      label: "Rejection",
      explanation:
        "Bearish engulfing candle rejecting the supply zone with a change of character breaking the recent minor low.",
    },
  ],
};

/* ── 1/7. Correct pair + lower timeframe + direction-aligned rejection and
 * structure confirmation → CONFIRMED (bullish and bearish). ──────────────── */
{
  const r = evaluateSniperEntry(bullishOriginal, goodBullishConfirmation, newsClear, NOW);
  check("1 bullish full confirmation → CONFIRMED", r.state === "CONFIRMED", JSON.stringify(r));
  if (r.state === "CONFIRMED") check("1 evidence array non-empty", r.evidence.length > 0);
}
{
  const r = evaluateSniperEntry(bearishOriginal, goodBearishConfirmation, newsClear, NOW);
  check("7 bearish full confirmation → CONFIRMED", r.state === "CONFIRMED", JSON.stringify(r));
}

/* ── 2. Wrong pair → WAITING, reason mentions pair. ───────────────────────── */
{
  const r = evaluateSniperEntry(
    bullishOriginal,
    { ...goodBullishConfirmation, pair: "EURUSD", symbol: "EURUSD" },
    newsClear,
    NOW
  );
  check("2 wrong pair → WAITING", r.state === "WAITING");
  if (r.state === "WAITING") check("2 reason mentions pair", /pair/i.test(r.reason));
}

/* ── 3. Wrong timeframe (same, and higher) → WAITING, reason mentions timeframe. */
{
  const same = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, timeframe: "H1" }, newsClear, NOW);
  check("3a same timeframe as original → WAITING", same.state === "WAITING");
  if (same.state === "WAITING") check("3a reason mentions timeframe", /timeframe/i.test(same.reason));

  const higher = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, timeframe: "H4" }, newsClear, NOW);
  check("3b higher timeframe than original → WAITING", higher.state === "WAITING");

  const unknown = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, timeframe: "Unknown" }, newsClear, NOW);
  check("3c illegible timeframe → WAITING", unknown.state === "WAITING");
}

/* ── 4. Missing current price → WAITING. ──────────────────────────────────── */
{
  const notLegible = evaluateSniperEntry(
    bullishOriginal,
    { ...goodBullishConfirmation, priceAxisLegible: false },
    newsClear,
    NOW
  );
  check("4a price axis not legible → WAITING", notLegible.state === "WAITING");

  const nullPrice = evaluateSniperEntry(
    bullishOriginal,
    { ...goodBullishConfirmation, currentPrice: null },
    newsClear,
    NOW
  );
  check("4b null currentPrice → WAITING", nullPrice.state === "WAITING");
}

/* ── 5. No retest (price outside the zone, not breaching invalidation) → WAITING. */
{
  const r = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, currentPrice: "1.2690" }, newsClear, NOW);
  check("5 no retest yet → WAITING", r.state === "WAITING");
  if (r.state === "WAITING") check("5 reason mentions retest", /retest/i.test(r.reason));
}

/* ── 6. Retest WITHOUT rejection → WAITING. ───────────────────────────────── */
{
  const r = evaluateSniperEntry(
    bullishOriginal,
    {
      ...goodBullishConfirmation,
      evidence: [{ label: "Note", explanation: "Price is moving sideways near the level with no clear signal yet." }],
    },
    newsClear,
    NOW
  );
  check("6 retest without rejection → WAITING", r.state === "WAITING");
  if (r.state === "WAITING") check("6 reason mentions rejection", /rejection/i.test(r.reason));
}

/* ── 8. Original invalidation breached → INVALIDATED (bullish and bearish). */
{
  const r = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, currentPrice: "1.2675" }, newsClear, NOW);
  check("8a bullish invalidation breached → INVALIDATED", r.state === "INVALIDATED", JSON.stringify(r));
}
{
  const r = evaluateSniperEntry(bearishOriginal, { ...goodBearishConfirmation, currentPrice: "1.1015" }, newsClear, NOW);
  check("8b bearish invalidation breached → INVALIDATED", r.state === "INVALIDATED", JSON.stringify(r));
}

/* ── 9. Fresh news block → WAITING, NEVER INVALIDATED, even with otherwise-
 * perfect confirmation evidence (non-negotiable rule). ──────────────────── */
{
  const r = evaluateSniperEntry(bullishOriginal, goodBullishConfirmation, newsBlocked, NOW);
  check("9 news blocked → WAITING (not INVALIDATED)", r.state === "WAITING", JSON.stringify(r));
  if (r.state === "WAITING") check("9 reason mentions news", /news/i.test(r.reason));
}

/* ── 10. Expired setup → WAITING, even with otherwise-perfect confirmation. */
{
  const expiryMinutes = SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME["H1"];
  const farFuture = new Date(new Date(GENERATED_AT).getTime() + (expiryMinutes + 60) * 60000);
  const r = evaluateSniperEntry(bullishOriginal, goodBullishConfirmation, newsClear, farFuture);
  check("10 expired setup → WAITING", r.state === "WAITING", JSON.stringify(r));
  if (r.state === "WAITING") check("10 reason mentions expired", /expired/i.test(r.reason));
}

/* ── 11. Missing or conflicting evidence → WAITING. ───────────────────────── */
{
  const empty = evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, evidence: [] }, newsClear, NOW);
  check("11a empty evidence → WAITING", empty.state === "WAITING");
  if (empty.state === "WAITING") check("11a reason mentions evidence", /evidence/i.test(empty.reason));

  // Conflicting: bullish original, but the confirmation chart's own evidence
  // describes BEARISH structure (lower high/low) despite a rejection keyword.
  const conflicting = evaluateSniperEntry(
    bullishOriginal,
    {
      ...goodBullishConfirmation,
      trendDirection: "Downtrend",
      evidence: [
        {
          label: "Rejection",
          explanation: "Bearish engulfing rejection forming a lower high and lower low, break of structure down.",
        },
      ],
    },
    newsClear,
    NOW
  );
  check("11b conflicting (opposite) structure → WAITING, not CONFIRMED", conflicting.state === "WAITING", JSON.stringify(conflicting));
}

/* ── 12. Confirmation NEVER changes the original setup's own values. ─────── */
{
  const before = JSON.stringify(bullishOriginal);
  evaluateSniperEntry(bullishOriginal, goodBullishConfirmation, newsClear, NOW);
  evaluateSniperEntry(bullishOriginal, { ...goodBullishConfirmation, currentPrice: "1.2675" }, newsClear, NOW);
  const after = JSON.stringify(bullishOriginal);
  check("12 original setup object untouched across calls", before === after);
}

/* ── Helper exports ────────────────────────────────────────────────────────── */
check("13a isLowerTimeframe(M5, H1) true", isLowerTimeframe("M5", "H1") === true);
check("13b isLowerTimeframe(H1, M5) false", isLowerTimeframe("H1", "M5") === false);
check("13c isLowerTimeframe(H1, H1) false (same tf is not lower)", isLowerTimeframe("H1", "H1") === false);

check("14a hasLowerTimeframeAvailable(M1) false — no lower tf exists", hasLowerTimeframeAvailable("M1") === false);
check("14b hasLowerTimeframeAvailable(H1) true", hasLowerTimeframeAvailable("H1") === true);
check("14c hasLowerTimeframeAvailable(null) false", hasLowerTimeframeAvailable(null) === false);

{
  const b = parseZoneBounds("1.2700 – 1.2710");
  check("15a parseZoneBounds parses both sides", !!b && Math.abs(b.low - 1.27) < 1e-9 && Math.abs(b.high - 1.271) < 1e-9, JSON.stringify(b));
  check("15b parseZoneBounds garbage → null", parseZoneBounds("not a zone") === null);
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nSniper Entry tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
