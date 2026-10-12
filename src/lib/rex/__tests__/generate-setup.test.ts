/**
 * Regression tests for the "Generate Setup" flow: economic-calendar guard →
 * APA setup engine. Runnable with:
 *   npx tsx src/lib/rex/__tests__/generate-setup.test.ts
 *
 * These assert the exact behavior the button depends on: a valid APA setup is
 * produced when no relevant high-impact news is within 20 minutes, is blocked
 * only inside that window, and the 1:2 R:R + "no valid setup" rules hold.
 * Fixed `now`/timestamps — never Date.now()/browser time.
 */
import { buildTradeSetup, MIN_RR } from "../trade-setup";
import { evaluateNewsGuard } from "@/lib/economicCalendar/blocking";
import type { NormalizedEvent } from "@/lib/economicCalendar/types";

const NOW = new Date("2026-09-10T12:00:00.000Z");

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

function evt(currency: string, impact: NormalizedEvent["impact"], mins: number): NormalizedEvent {
  return {
    id: `${currency}:${impact}:${mins}`,
    timestampUtc: new Date(NOW.getTime() + mins * 60000).toISOString(),
    currency,
    title: `${currency} ${impact} event`,
    impact,
    actual: null,
    forecast: null,
    previous: null,
    source: "forexfactory",
  };
}
const guard = (events: NormalizedEvent[], pair: string, providerStatus: "live" | "stale" | "unavailable" = "live") =>
  evaluateNewsGuard({ events, pair, now: NOW, providerStatus });

// A known-valid bullish APA payload with a structural ≥1:2 target.
const validApa = (pair: string) => ({
  pair,
  timeframe: "H1",
  bias: "Bullish" as const,
  confidence: 80,
  currentPrice: "1.2705",
  priceLevels: [
    { type: "Support", value: "1.2700" },
    { type: "Resistance", value: "1.2780" },
    { type: "Entry", value: "1.2710" },
    { type: "Take Profit", value: "1.2850" },
    { type: "Invalidation", value: "1.2680" },
  ],
  trend: { direction: "Uptrend", strength: "Strong" },
  evidence: [{ label: "BOS", explanation: "break of structure HH HL demand liquidity" }],
});

// 1. Valid APA + no relevant news → SETUP GENERATED
check("1 valid + no news → generated", buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: guard([], "GBPUSD") }).kind === "directional");

// 2. Valid APA + relevant HIGH 45m away → GENERATED
check("2 valid + USD High 45m → generated", buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: guard([evt("USD", "High", 45)], "GBPUSD") }).kind === "directional");

// 3. Valid APA + relevant HIGH 10m away → BLOCKED
check("3 valid + USD High 10m → blocked", buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: guard([evt("USD", "High", 10)], "GBPUSD") }).kind === "blocked");

// 4. Valid APA + relevant MEDIUM 10m away → WARNING + GENERATED
{
  const g = guard([evt("USD", "Medium", 10)], "GBPUSD");
  const s = buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: g });
  check("4 valid + USD Medium 10m → generated", s.kind === "directional");
  check("4 medium is not a hard block", g.state !== "blocked");
}

// 5. Valid APA + UNRELATED HIGH 10m away → GENERATED
check("5 valid + JPY High 10m (GBPUSD) → generated", buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: guard([evt("JPY", "High", 10)], "GBPUSD") }).kind === "directional");

// 6. No valid APA structure → NO VALID TRADE SETUP
check("6 no structure → none", buildTradeSetup({ pair: "GBPUSD", timeframe: "H1", bias: "Bullish", confidence: 40, currentPrice: "1.2705", priceLevels: [], trend: { direction: "Sideways", strength: "Weak" }, evidence: [], newsGuard: guard([], "GBPUSD") }).kind === "none");

// 7. Valid APA but R:R below 1:2 → NO VALID TRADE SETUP
check("7 R:R < 1:2 → none", buildTradeSetup({
  pair: "GBPUSD", timeframe: "H1", bias: "Bullish", confidence: 70, currentPrice: "1.2705",
  priceLevels: [{ type: "Support", value: "1.2700" }, { type: "Entry", value: "1.2710" }, { type: "Resistance", value: "1.2718" }, { type: "Take Profit", value: "1.2720" }, { type: "Invalidation", value: "1.2680" }],
  trend: { direction: "Uptrend", strength: "Strong" }, evidence: [{ label: "BOS", explanation: "bos HH HL demand liquidity" }],
  newsGuard: guard([], "GBPUSD"),
}).kind === "none");

// 8. Missing/invalid calendar timestamp → MUST NOT falsely block
//    (invalid rows are dropped in normalization, so the guard sees no blocker)
check("8 no valid events → not blocked", buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: guard([], "GBPUSD") }).kind !== "blocked");

// 9. Calendar unavailable → safe fallback (allow) + status reported, NOT blocked
{
  const g = guard([], "GBPUSD", "unavailable");
  const s = buildTradeSetup({ ...validApa("GBPUSD"), newsGuard: g });
  check("9 unavailable → generated (safe default)", s.kind === "directional");
  check("9 unavailable → status reported", g.state === "unavailable" && /unavailable/i.test(g.status));
}

// Anti-chase (retest entry): a retest/limit entry sitting a pullback away from
// current price is VALID and must generate; only price PAST Target 1 is chasing.
{
  // Bearish EUR/USD: supply retest entry ABOVE current (price at recent low).
  const read = (current: string) => ({
    pair: "EURUSD", timeframe: "H1", bias: "Bearish" as const, confidence: 78, currentPrice: current,
    priceLevels: [
      { type: "Resistance", value: "1.0990" }, { type: "Support", value: "1.0760" },
      { type: "Entry", value: "1.0980" }, { type: "Take Profit", value: "1.0700" },
      { type: "Invalidation", value: "1.1010" },
    ],
    trend: { direction: "Downtrend", strength: "Strong" },
    evidence: [{ label: "CHOCH", explanation: "lower highs supply rejection bos liquidity" }],
    newsGuard: guard([], "EURUSD"),
  });
  check("chase A: retest a pullback away → generated", buildTradeSetup(read("1.0790")).kind === "directional");
  check("chase B: reasonably close to entry → generated", buildTradeSetup(read("1.0950")).kind === "directional");
  check("chase C: overextended past T1 → none (chase)", buildTradeSetup(read("1.0740")).kind === "none");
}

// XAU relevance (extra): USD blocks, EUR doesn't
check("X XAUUSD + USD High 10m → blocked", buildTradeSetup({ ...validApa("XAUUSD"), newsGuard: guard([evt("USD", "High", 10)], "XAUUSD") }).kind === "blocked");
check("X XAUUSD + EUR High 10m → generated", buildTradeSetup({ ...validApa("XAUUSD"), newsGuard: guard([evt("EUR", "High", 10)], "XAUUSD") }).kind === "directional");

/* ── 1M Scalping support ──────────────────────────────────────────────────
 * The APA engine (buildTradeSetup) never reads `timeframe` for its structural
 * math — it's already timeframe-agnostic. These tests confirm that holds for
 * "M1", that the 1:2 R:R / anti-chase / news-calendar rules are unaffected,
 * and that the new (optional, M1-only) higher-timeframe-context labeling
 * behaves correctly whether that context is available, absent, or conflicting.
 */

// 1M-A. Valid APA structure at M1 → a real scalping setup is generated, with
// 1M-specific (not "drop to a lower timeframe") confirmation wording.
{
  const s = buildTradeSetup({ ...validApa("EURUSD"), timeframe: "M1", newsGuard: guard([], "EURUSD") });
  check("1M-A valid M1 structure → generated", s.kind === "directional");
  if (s.kind === "directional") {
    check(
      "1M-A confirmation wording is 1-minute-aware (no 'drop to a lower timeframe')",
      s.lowerTimeframeConfirmation.some((c) => /already the 1-minute chart/i.test(c)) &&
        !s.lowerTimeframeConfirmation.some((c) => /drop to a lower timeframe/i.test(c))
    );
    check("1M-A R:R still ≥ 1:2 at M1", s.rr1 >= MIN_RR);
  }
}

// 1M-B. Missing/weak confirmation at M1 (minimal APA confluence, no real
// confirmation/BOS/MTF signal) → NO VALID SETUP, even though R:R and
// structure gates alone would otherwise pass. Also carries a Medium-impact
// news item to prove news stays a risk WARNING (qNews only), never a block.
{
  const s = buildTradeSetup({
    pair: "EURUSD",
    timeframe: "M1",
    bias: "Bullish",
    confidence: 55,
    currentPrice: "1.09200",
    priceLevels: [
      { type: "Entry", value: "1.09200" },
      { type: "Resistance", value: "1.09151" },
      { type: "Take Profit", value: "1.09265" },
    ],
    trend: { direction: "Sideways", strength: "Weak" },
    evidence: [{ label: "Note", explanation: "momentum building near a minor support trendline" }],
    newsGuard: guard([evt("USD", "Medium", 10)], "EURUSD"),
  });
  check("1M-B weak confirmation → none", s.kind === "none");
  check(
    "1M-B not blocked by the Medium news (warning only)",
    s.kind !== "blocked" && guard([evt("USD", "Medium", 10)], "EURUSD").state !== "blocked"
  );
}

// 1M-C. Invalid risk/reward at M1 (identical ratios to the H1 R:R-fail case
// above, just relabeled M1) → the 1:2 minimum is enforced the same regardless
// of timeframe.
check(
  "1M-C R:R < 1:2 at M1 → none",
  buildTradeSetup({
    pair: "EURUSD", timeframe: "M1", bias: "Bullish", confidence: 70, currentPrice: "1.2705",
    priceLevels: [{ type: "Support", value: "1.2700" }, { type: "Entry", value: "1.2710" }, { type: "Resistance", value: "1.2718" }, { type: "Take Profit", value: "1.2720" }, { type: "Invalidation", value: "1.2680" }],
    trend: { direction: "Uptrend", strength: "Strong" }, evidence: [{ label: "BOS", explanation: "bos HH HL demand liquidity" }],
    newsGuard: guard([], "EURUSD"),
  }).kind === "none"
);

// 1M-D. Anti-chase still applies at M1 (same math as the H1 case above).
check(
  "1M-D overextended past T1 at M1 → none (chase)",
  buildTradeSetup({
    pair: "EURUSD", timeframe: "M1", bias: "Bearish", confidence: 78, currentPrice: "1.0740",
    priceLevels: [
      { type: "Resistance", value: "1.0990" }, { type: "Support", value: "1.0760" },
      { type: "Entry", value: "1.0980" }, { type: "Take Profit", value: "1.0700" },
      { type: "Invalidation", value: "1.1010" },
    ],
    trend: { direction: "Downtrend", strength: "Strong" },
    evidence: [{ label: "CHOCH", explanation: "lower highs supply rejection bos liquidity" }],
    newsGuard: guard([], "EURUSD"),
  }).kind === "none"
);

// 1M-E. Higher-timeframe context UNAVAILABLE (no upload required) → clearly
// labeled as such, setup still generates (never required, never forced/blocked).
{
  const s = buildTradeSetup({ ...validApa("EURUSD"), timeframe: "M1", newsGuard: guard([], "EURUSD") });
  check("1M-E generated without HTF context", s.kind === "directional");
  if (s.kind === "directional") {
    check(
      "1M-E HTF note clearly labels 'unavailable'",
      !!s.higherTimeframeNote && /unavailable/i.test(s.higherTimeframeNote)
    );
  }
}

// 1M-F. Higher-timeframe context AVAILABLE + agrees → used as context (folds
// into multi-timeframe confluence) but still never required/blocking.
{
  const s = buildTradeSetup({
    ...validApa("EURUSD"), timeframe: "M1", newsGuard: guard([], "EURUSD"),
    higherTimeframeContext: { timeframe: "H4", bias: "Bullish" },
  });
  check("1M-F generated with agreeing HTF context", s.kind === "directional");
  if (s.kind === "directional") {
    check("1M-F HTF note reports agreement", !!s.higherTimeframeNote && /agrees/i.test(s.higherTimeframeNote));
    check("1M-F confluence includes multi-timeframe agreement", s.confluence.includes("Multi-timeframe agreement"));
  }
}

// 1M-G. Higher-timeframe context AVAILABLE but CONFLICTS → labeled as a
// conflict, but direction still follows the uploaded 1M analysis only (Rule
// 3 — HTF context never sets direction) and the setup is NOT blocked.
{
  const s = buildTradeSetup({
    ...validApa("EURUSD"), timeframe: "M1", newsGuard: guard([], "EURUSD"),
    higherTimeframeContext: { timeframe: "H4", bias: "Bearish" },
  });
  check("1M-G still generated (never forced/blocked by conflicting HTF)", s.kind === "directional");
  if (s.kind === "directional") {
    check("1M-G direction unchanged by conflicting HTF", s.bias === "Bullish");
    check("1M-G HTF note reports the conflict", !!s.higherTimeframeNote && /conflict/i.test(s.higherTimeframeNote));
  }
}

// 1M-H. Non-M1 timeframes are unaffected: no higherTimeframeNote field at all,
// even when higherTimeframeContext is supplied (feature scoped to M1 only).
{
  const s = buildTradeSetup({
    ...validApa("EURUSD"), newsGuard: guard([], "EURUSD"), // timeframe stays "H1" from validApa
    higherTimeframeContext: { timeframe: "Daily", bias: "Bullish" },
  });
  check("1M-H H1 setup unaffected by HTF-context feature", s.kind === "directional" && s.higherTimeframeNote === undefined);
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nGenerate-Setup regression tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exit(1);
}
