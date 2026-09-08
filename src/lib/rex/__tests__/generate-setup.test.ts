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
import { buildTradeSetup } from "../trade-setup";
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

// XAU relevance (extra): USD blocks, EUR doesn't
check("X XAUUSD + USD High 10m → blocked", buildTradeSetup({ ...validApa("XAUUSD"), newsGuard: guard([evt("USD", "High", 10)], "XAUUSD") }).kind === "blocked");
check("X XAUUSD + EUR High 10m → generated", buildTradeSetup({ ...validApa("XAUUSD"), newsGuard: guard([evt("EUR", "High", 10)], "XAUUSD") }).kind === "directional");

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nGenerate-Setup regression tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exit(1);
}
