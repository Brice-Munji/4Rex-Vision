/**
 * Sprint P0 — Pair Integrity & Correlation Guard self-test.
 * Run:  node --experimental-strip-types scripts/p0-selftest.mts
 * Covers the six sprint TESTS plus the confidence rule and banner helpers.
 */
import {
  isGold,
  arePositivelyCorrelated,
  correlationGroupOf,
  detectDivergence,
} from "../src/lib/rex/correlation.ts";
import {
  assessPairExtraction,
  guardPrimaryPair,
  applyConfidencePolicy,
  displayTimeframe,
  findPairsInText,
} from "../src/lib/rex/pair-integrity.ts";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL:", name); }
}

console.log("TEST 1 — AUDUSD upload → AUDUSD analysis only");
check("AUDUSD extracts confidently",
  assessPairExtraction({ instrument: "AUD/USD", symbol: "AUDUSD", supported: true, instrumentConfidence: 88 }).confident);
check("AUDUSD verdict is NOT flagged",
  guardPrimaryPair("AUDUSD is bullish above support; buy favored on AUD/USD.", "AUDUSD").violated === false);
check("foreign-only verdict for AUDUSD IS flagged",
  guardPrimaryPair("GBPUSD bullish, EURUSD bearish.", "AUDUSD").violated === true);

console.log("TEST 2 — EURUSD upload → no GBPUSD verdict");
{
  const g = guardPrimaryPair("GBPUSD is breaking out; bullish continuation likely.", "EURUSD");
  check("verdict about GBPUSD (not EURUSD) is flagged", g.violated === true);
  check("GBPUSD listed as foreign", g.foreignPairs.includes("GBPUSD"));
}

console.log("TEST 3 — GBPUSD upload → no EURUSD verdict");
{
  const g = guardPrimaryPair("EURUSD looks bearish below resistance.", "GBPUSD");
  check("verdict about EURUSD (not GBPUSD) is flagged", g.violated === true);
}

console.log("TEST 4 — XAUUSD upload → independent gold analysis");
check("XAUUSD is gold", isGold("XAUUSD") && isGold("XAU/USD"));
check("gold NOT positively correlated with EURUSD", arePositivelyCorrelated("XAUUSD", "EURUSD") === false);
check("gold group is 'gold'", correlationGroupOf("XAUUSD") === "gold");
{
  // Gold bullish while USD majors bearish must NOT be forced into a divergence.
  const check4 = detectDivergence(
    { symbol: "XAUUSD", bias: "Bullish" },
    [{ pair: "EURUSD", bias: "Bearish" }, { pair: "GBPUSD", bias: "Bearish" }]
  );
  check("gold divergence NOT raised vs USD majors", check4.hasDivergence === false);
}

console.log("TEST 5 — Blurry chart → pair-not-detected");
check("no instrument → not confident",
  assessPairExtraction({ instrument: null, symbol: null, supported: false, instrumentConfidence: 0 }).reason === "no-instrument");
check("low confidence → not confident",
  assessPairExtraction({ instrument: "EUR/USD", symbol: "EURUSD", supported: true, instrumentConfidence: 30 }).reason === "low-confidence");

console.log("TEST 6 — EURUSD bearish + GBPUSD bullish → Correlation Check");
{
  const c = detectDivergence(
    { symbol: "EURUSD", bias: "Bearish", note: "below resistance" },
    [{ pair: "GBPUSD", bias: "Bullish", note: "breakout above local resistance" }]
  );
  check("divergence detected", c.hasDivergence === true);
  check("title is 'Correlation Check'", c.title === "Correlation Check");
  check("explanation mentions positively correlated",
    !!c.explanation && c.explanation.includes("positively correlated"));
  check("explanation names both pairs",
    !!c.explanation && c.explanation.includes("EUR/USD") && c.explanation.includes("GBP/USD"));
  // Same-direction correlated pairs → no divergence.
  const same = detectDivergence({ symbol: "EURUSD", bias: "Bearish" }, [{ pair: "GBPUSD", bias: "Bearish" }]);
  check("aligned correlated pairs → no divergence", same.hasDivergence === false);
}

console.log("EXTRA — confidence rule + helpers");
check("mixed structure caps below 85", applyConfidencePolicy(92, { lowExtraction: false, mixedStructure: true, conflictingCorrelation: false, highNews: false }) === 84);
check("clean setup keeps high confidence", applyConfidencePolicy(92, { lowExtraction: false, mixedStructure: false, conflictingCorrelation: false, highNews: false }) === 92);
check("divergence caps below 85", applyConfidencePolicy(90, { lowExtraction: false, mixedStructure: false, conflictingCorrelation: true, highNews: false }) < 85);
check("H1 → 1H banner", displayTimeframe("H1") === "1H");
check("Daily → D1 banner", displayTimeframe("Daily") === "D1");
check("findPairsInText handles slashes", findPairsInText("EUR/USD and GBP-USD").join(",") === "EURUSD,GBPUSD");

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
