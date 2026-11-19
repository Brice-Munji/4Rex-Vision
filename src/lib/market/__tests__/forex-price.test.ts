/**
 * Focused tests for the Sprint 4 market-price feed (src/lib/market/
 * forex-price.ts). Pure/deterministic — fixed `now` timestamps, never
 * Date.now(). Run with:
 *   npx tsx src/lib/market/__tests__/forex-price.test.ts
 * or:
 *   npm run test:price-feed
 *
 * Two layers are covered:
 *  1. The pure validators (validateFxRatesApiResponse/validateGoldApiResponse)
 *     — fed fabricated provider response bodies, no network.
 *  2. getCurrentPrice() itself, with `global.fetch` temporarily stubbed so
 *     its symbol-validation/routing/caching/failure-handling behavior is
 *     exercised end-to-end without ever making a real network call. Each
 *     stubbed scenario below uses its OWN pair symbol so none of them can
 *     collide through the shared withCache() store (a module-level
 *     singleton imported from finnhub.ts, alive for the whole process).
 */
import {
  validateFxRatesApiResponse,
  validateGoldApiResponse,
  getCurrentPrice,
} from "../forex-price";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const NOW_MS = new Date("2026-11-19T14:30:00.000Z").getTime();

/* ── 1. validateFxRatesApiResponse — pure ──────────────────────────────── */
{
  const valid = { success: true, base: "EUR", timestamp: Math.floor(NOW_MS / 1000) - 60, rates: { USD: 1.085 } };
  const r1 = validateFxRatesApiResponse("EUR", "USD", valid, NOW_MS);
  check("1a valid fxratesapi response accepted", r1.ok === true && r1.ok && Math.abs(r1.reading.price - 1.085) < 1e-9, JSON.stringify(r1));

  const wrongBase = { success: true, base: "GBP", timestamp: Math.floor(NOW_MS / 1000), rates: { USD: 1.3 } };
  const r2 = validateFxRatesApiResponse("EUR", "USD", wrongBase, NOW_MS);
  check("1b base mismatch rejected (correct-instrument check)", r2.ok === false && r2.reason === "symbol_mismatch", JSON.stringify(r2));

  const missingQuote = { success: true, base: "EUR", timestamp: Math.floor(NOW_MS / 1000), rates: { GBP: 0.9 } };
  const r3 = validateFxRatesApiResponse("EUR", "USD", missingQuote, NOW_MS);
  check("1c target currency absent from rates rejected", r3.ok === false && r3.reason === "invalid_price", JSON.stringify(r3));

  const negativePrice = { success: true, base: "EUR", timestamp: Math.floor(NOW_MS / 1000), rates: { USD: -1 } };
  const r4 = validateFxRatesApiResponse("EUR", "USD", negativePrice, NOW_MS);
  check("1d non-positive rate rejected", r4.ok === false && r4.reason === "invalid_price", JSON.stringify(r4));

  const staleTs = { success: true, base: "EUR", timestamp: Math.floor((NOW_MS - 2 * 60 * 60 * 1000) / 1000), rates: { USD: 1.08 } };
  const r5 = validateFxRatesApiResponse("EUR", "USD", staleTs, NOW_MS);
  check("1e reading older than 60min rejected as stale", r5.ok === false && r5.reason === "stale", JSON.stringify(r5));

  const futureTs = { success: true, base: "EUR", timestamp: Math.floor((NOW_MS + 60 * 60 * 1000) / 1000), rates: { USD: 1.08 } };
  const r6 = validateFxRatesApiResponse("EUR", "USD", futureTs, NOW_MS);
  check("1f far-future timestamp rejected", r6.ok === false && r6.reason === "future_timestamp", JSON.stringify(r6));

  const providerError = { success: false };
  const r7 = validateFxRatesApiResponse("EUR", "USD", providerError, NOW_MS);
  check("1g provider error flag rejected", r7.ok === false && r7.reason === "provider_error", JSON.stringify(r7));

  const malformed = "not even an object";
  const r8 = validateFxRatesApiResponse("EUR", "USD", malformed, NOW_MS);
  check("1h non-object response rejected", r8.ok === false && r8.reason === "malformed_response", JSON.stringify(r8));

  const noTimestamp = { success: true, base: "EUR", rates: { USD: 1.08 } };
  const r9 = validateFxRatesApiResponse("EUR", "USD", noTimestamp, NOW_MS);
  check("1i missing timestamp/date rejected", r9.ok === false && r9.reason === "missing_timestamp", JSON.stringify(r9));
}

/* ── 2. validateGoldApiResponse — pure ─────────────────────────────────── */
{
  const valid = { symbol: "XAU", currency: "USD", price: 3710.77, updatedAt: new Date(NOW_MS - 30_000).toISOString() };
  const g1 = validateGoldApiResponse(valid, NOW_MS);
  check("2a valid gold-api response accepted", g1.ok === true && g1.ok && g1.reading.price === 3710.77, JSON.stringify(g1));

  const wrongSymbol = { symbol: "XAG", currency: "USD", price: 45.07, updatedAt: new Date(NOW_MS).toISOString() };
  const g2 = validateGoldApiResponse(wrongSymbol, NOW_MS);
  check("2b wrong metal symbol rejected (correct-instrument check)", g2.ok === false && g2.reason === "symbol_mismatch", JSON.stringify(g2));

  const wrongCurrency = { symbol: "XAU", currency: "EUR", price: 3400, updatedAt: new Date(NOW_MS).toISOString() };
  const g3 = validateGoldApiResponse(wrongCurrency, NOW_MS);
  check("2c non-USD currency rejected", g3.ok === false && g3.reason === "currency_mismatch", JSON.stringify(g3));

  const zeroPrice = { symbol: "XAU", currency: "USD", price: 0, updatedAt: new Date(NOW_MS).toISOString() };
  const g4 = validateGoldApiResponse(zeroPrice, NOW_MS);
  check("2d zero price rejected", g4.ok === false && g4.reason === "invalid_price", JSON.stringify(g4));

  const staleGold = { symbol: "XAU", currency: "USD", price: 3700, updatedAt: new Date(NOW_MS - 3 * 60 * 60 * 1000).toISOString() };
  const g5 = validateGoldApiResponse(staleGold, NOW_MS);
  check("2e stale gold reading rejected", g5.ok === false && g5.reason === "stale", JSON.stringify(g5));
}

/* ── 3. getCurrentPrice() — fetch stubbed, each case its own pair symbol ── */
type FetchImpl = (url: string) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;

async function withStubFetch<T>(impl: FetchImpl, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  // @ts-expect-error - test stub intentionally narrower than the lib.dom fetch signature
  globalThis.fetch = async (url: string) => impl(url);
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

async function main() {
  const NOW = new Date(NOW_MS);

  // 3a. Happy path — standard forex pair.
  {
    let calls = 0;
    const result = await withStubFetch(
      async () => {
        calls++;
        return jsonResponse({ success: true, base: "EUR", timestamp: Math.floor(NOW_MS / 1000) - 10, rates: { USD: 1.09 } });
      },
      () => getCurrentPrice("EURUSD", NOW)
    );
    check("3a EURUSD resolves via fxratesapi", result.ok === true && result.ok && result.quote.source === "fxratesapi" && result.quote.pair === "EURUSD", JSON.stringify(result));
    check("3a exactly one fetch for a single call", calls === 1, `calls=${calls}`);
  }

  // 3b. Happy path — Gold (gold-api.com).
  {
    const result = await withStubFetch(
      async () => jsonResponse({ symbol: "XAU", currency: "USD", price: 3715.2, updatedAt: new Date(NOW_MS - 5_000).toISOString() }),
      () => getCurrentPrice("XAUUSD", NOW)
    );
    check("3b XAUUSD resolves via gold-api", result.ok === true && result.ok && result.quote.source === "gold-api" && Math.abs(result.quote.price - 3715.2) < 1e-9, JSON.stringify(result));
  }

  // 3c. Unsupported instrument (an index) — rejected before any fetch.
  {
    let calls = 0;
    const result = await withStubFetch(
      async () => {
        calls++;
        return jsonResponse({});
      },
      () => getCurrentPrice("US30", NOW)
    );
    check("3c unsupported instrument (index) rejected", result.ok === false && result.reason === "unsupported_instrument", JSON.stringify(result));
    check("3c never fetched for an unsupported symbol", calls === 0, `calls=${calls}`);
  }

  // 3d. Gold cross other than XAUUSD — recognized but intentionally not guessed.
  {
    let calls = 0;
    const result = await withStubFetch(
      async () => {
        calls++;
        return jsonResponse({});
      },
      () => getCurrentPrice("XAUEUR", NOW)
    );
    check("3d non-USD gold cross rejected without fetching", result.ok === false && result.reason === "unsupported_gold_cross", JSON.stringify(result));
    check("3d never fetched for an unsupported gold cross", calls === 0, `calls=${calls}`);
  }

  // 3e. Correct instrument/pair association — provider answers a DIFFERENT
  //     base than requested; must be rejected, not silently trusted.
  {
    const result = await withStubFetch(
      async () => jsonResponse({ success: true, base: "USD", timestamp: Math.floor(NOW_MS / 1000), rates: { USD: 1.26 } }),
      () => getCurrentPrice("GBPUSD", NOW)
    );
    check("3e provider answering the wrong base is rejected", result.ok === false && result.reason === "symbol_mismatch", JSON.stringify(result));
  }

  // 3f. Stale provider data end-to-end through getCurrentPrice.
  {
    const result = await withStubFetch(
      async () =>
        jsonResponse({ success: true, base: "USD", timestamp: Math.floor((NOW_MS - 4 * 60 * 60 * 1000) / 1000), rates: { JPY: 155.2 } }),
      () => getCurrentPrice("USDJPY", NOW)
    );
    check("3f stale provider reading rejected end-to-end", result.ok === false && result.reason === "stale", JSON.stringify(result));
  }

  // 3g. Missing market data — network failure must come back as a clean
  //     ok:false, never an unhandled rejection/crash.
  {
    let threw = false;
    const result = await withStubFetch(
      async () => {
        throw new Error("network unreachable");
      },
      () => getCurrentPrice("AUDUSD", NOW).catch(() => {
        threw = true;
        return { ok: false as const, reason: "unreachable" };
      })
    );
    check("3g network failure never throws out of getCurrentPrice", !threw);
    check("3g network failure resolves ok:false", result.ok === false, JSON.stringify(result));
  }

  // 3h. Caching — a second call for the same pair within the TTL window
  //     must NOT hit the network again ("respect provider rate limits").
  {
    let calls = 0;
    const impl: FetchImpl = async () => {
      calls++;
      return jsonResponse({ success: true, base: "USD", timestamp: Math.floor(NOW_MS / 1000), rates: { CAD: 1.36 } });
    };
    const original = globalThis.fetch;
    // @ts-expect-error - test stub intentionally narrower than the lib.dom fetch signature
    globalThis.fetch = impl;
    try {
      const first = await getCurrentPrice("USDCAD", NOW);
      const second = await getCurrentPrice("USDCAD", NOW);
      check("3h both calls succeed", first.ok === true && second.ok === true);
      check("3h second call within TTL reuses the cache (one fetch total)", calls === 1, `calls=${calls}`);
    } finally {
      globalThis.fetch = original;
    }
  }

  const total = passed + failures.length;
  // eslint-disable-next-line no-console
  console.log(`\nForex Price Feed tests: ${passed}/${total} passed`);
  if (failures.length) {
    // eslint-disable-next-line no-console
    console.log("FAILURES:\n - " + failures.join("\n - "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Forex Price Feed tests crashed:", err);
  process.exitCode = 1;
});
