import "server-only";

/**
 * Current-price retrieval for tracked Forex instruments (Sprint 4 — Market
 * Price Monitoring).
 *
 * WHY NOT FINNHUB (verified, not assumed): this app's only configured
 * market-data key is FINNHUB_API_KEY, already used for forex news and the
 * economic-calendar fallback (see finnhub.ts, forex-news.ts). Finnhub was
 * directly probed with the project's real key before writing this file:
 * `/quote` on any `OANDA:*` forex symbol, `/forex/rates`, and `/forex/candle`
 * all return `{"error":"You don't have access to this resource."}` on the
 * configured plan — while `/quote` for a plain stock (AAPL) and crypto
 * (BINANCE:BTCUSDT) on the SAME key succeed. Only `/forex/symbol` (the
 * symbol list, no prices) is reachable. `.env.example`'s own comment
 * confirms this was never expected to cover prices: "Finnhub API key (forex
 * news + economic-calendar FALLBACK provider)". So a new provider for
 * prices is NECESSARY, not optional — introducing one is explicitly allowed
 * by this sprint's own "do not introduce an UNNECESSARY new provider" rule.
 *
 * PROVIDERS CHOSEN (both free, no API key/signup — no new npm dependency;
 * plain `fetch()`, mirroring economicCalendar/forexFactory.ts's own
 * established "free public data source" pattern — each directly verified
 * live against the actual service before being wired in here):
 *  - fxratesapi.com — standard Forex pairs. `GET /latest?base=X&currencies=Y`.
 *    Verified: its own reported `timestamp` matched the real clock to the
 *    minute at verification time — genuinely current, not a once-daily
 *    snapshot (the obvious free alternatives, open.er-api.com and
 *    Frankfurter/ECB, were checked too and are confirmed once-per-day only).
 *  - gold-api.com — Gold. `GET /price/XAU`. Verified: its own `updatedAt`
 *    was seconds old at verification time. Neither of the two FX-rate APIs
 *    above carries XAU/XAG at all (confirmed empirically) since those are
 *    ISO fiat-rate feeds, not metals — Gold genuinely needs its own source.
 *
 * SCOPE: exactly the two instrument kinds src/lib/rex/instruments.ts already
 * marks `supported` (Forex pairs, and Gold quoted in USD). Every real XAU
 * usage in this codebase is "XAUUSD" specifically (sentiment card, news-risk,
 * correlations, tests — grepped, none use another gold cross) — a gold pair
 * quoted in anything other than USD is recognized by normalizeInstrument()
 * but intentionally NOT guessed at here (see getCurrentPrice below); it is
 * reported as unsupported rather than silently cross-computed from two
 * independently-fetched rates.
 *
 * VALIDATION ("ensure prices belong to the correct instrument"): each
 * provider response is checked against the SYMBOL IT ITSELF REPORTS
 * (fxratesapi's `base` field; gold-api's `symbol`/`currency` fields) before
 * its number is ever trusted — never a blind positional read. Each is also
 * checked for staleness against the provider's OWN reported timestamp, both
 * at fetch time (so a stale reading is never cached as good) and again at
 * serve time (so withCache's last-good-on-failure fallback can never hand
 * back an old reading as if it were current). A forex weekend close (no
 * fresh upstream tick for ~2 days) will therefore correctly show as
 * unavailable/stale here — that is honest, not a bug.
 */

import { normalizeInstrument } from "@/lib/rex/instruments";
import { withCache } from "./finnhub";

const FXRATESAPI_BASE = "https://api.fxratesapi.com/latest";
const GOLDAPI_BASE = "https://api.gold-api.com/price";

/** How long a provider reading may be trusted before this module refuses to
 *  serve it as "current" — generous enough for normal provider/network
 *  cadence, tight enough to catch a genuinely stuck upstream feed. Also the
 *  mechanism that correctly marks weekend-stale forex data as unavailable. */
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes

/** A provider timestamp further in the future than this (clock skew aside)
 *  is treated as an invalid response rather than trusted. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/** Short, process-local cache so many setups sharing one pair within the
 *  same monitoring run cost one upstream fetch, not N — "respect provider
 *  rate limits". Reuses finnhub.ts's existing generic cache/last-good
 *  helper rather than a second parallel cache implementation. */
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PriceReading {
  price: number;
  /** The PROVIDER's own reported as-of time, ISO 8601 UTC. */
  asOfUtc: string;
}

export type PriceValidation = { ok: true; reading: PriceReading } | { ok: false; reason: string };

/**
 * Pure — validates an fxratesapi.com `/latest` response actually answers the
 * EXACT base/quote requested, and is fresh, before its rate is trusted. No
 * network; independently testable with fabricated response bodies.
 */
export function validateFxRatesApiResponse(
  base: string,
  quote: string,
  json: unknown,
  nowMs: number
): PriceValidation {
  if (!json || typeof json !== "object") return { ok: false, reason: "malformed_response" };
  const r = json as {
    success?: unknown;
    base?: unknown;
    timestamp?: unknown;
    date?: unknown;
    rates?: unknown;
  };
  if (r.success === false) return { ok: false, reason: "provider_error" };
  if (typeof r.base !== "string" || r.base.toUpperCase() !== base) {
    return { ok: false, reason: "symbol_mismatch" };
  }
  if (!r.rates || typeof r.rates !== "object") return { ok: false, reason: "missing_rates" };
  const rate = (r.rates as Record<string, unknown>)[quote];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return { ok: false, reason: "invalid_price" };
  }
  const tsMs = typeof r.timestamp === "number" ? r.timestamp * 1000 : Date.parse(String(r.date ?? ""));
  return finishValidation(rate, tsMs, nowMs);
}

/**
 * Pure — validates a gold-api.com `/price/XAU` response is actually for
 * XAU priced in USD, and is fresh, before its price is trusted. No network;
 * independently testable with fabricated response bodies.
 */
export function validateGoldApiResponse(json: unknown, nowMs: number): PriceValidation {
  if (!json || typeof json !== "object") return { ok: false, reason: "malformed_response" };
  const r = json as { symbol?: unknown; currency?: unknown; price?: unknown; updatedAt?: unknown };
  if (typeof r.symbol !== "string" || r.symbol.toUpperCase() !== "XAU") {
    return { ok: false, reason: "symbol_mismatch" };
  }
  if (typeof r.currency !== "string" || r.currency.toUpperCase() !== "USD") {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (typeof r.price !== "number" || !Number.isFinite(r.price) || r.price <= 0) {
    return { ok: false, reason: "invalid_price" };
  }
  const tsMs = Date.parse(String(r.updatedAt ?? ""));
  return finishValidation(r.price, tsMs, nowMs);
}

/** Shared freshness/sanity tail for both validators above. */
function finishValidation(price: number, tsMs: number, nowMs: number): PriceValidation {
  if (!Number.isFinite(tsMs)) return { ok: false, reason: "missing_timestamp" };
  if (tsMs - nowMs > FUTURE_TOLERANCE_MS) return { ok: false, reason: "future_timestamp" };
  if (nowMs - tsMs > STALE_THRESHOLD_MS) return { ok: false, reason: "stale" };
  return { ok: true, reading: { price, asOfUtc: new Date(tsMs).toISOString() } };
}

/** Is a reading (already validated once, possibly minutes ago) still fresh
 *  enough to serve as "current" right now? Re-checked at serve time because
 *  withCache's last-good-on-failure fallback can hand back an older reading
 *  than this call's own cache TTL would suggest. */
function isFreshEnough(asOfUtc: string, now: Date): boolean {
  const tsMs = Date.parse(asOfUtc);
  return Number.isFinite(tsMs) && now.getTime() - tsMs <= STALE_THRESHOLD_MS;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "4RexVision/1.0 (market-price-monitor)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Throws (never returns an ok:false shape) so withCache's own
 *  success/failure contract applies correctly: an invalid or stale reading
 *  must never be cached as if it were good. */
async function fetchFxRate(base: string, quote: string, now: Date): Promise<PriceReading> {
  const json = await fetchJson(`${FXRATESAPI_BASE}?base=${base}&currencies=${quote}`);
  const result = validateFxRatesApiResponse(base, quote, json, now.getTime());
  if (!result.ok) throw new Error(result.reason);
  return result.reading;
}

async function fetchGoldUsd(now: Date): Promise<PriceReading> {
  const json = await fetchJson(`${GOLDAPI_BASE}/XAU`);
  const result = validateGoldApiResponse(json, now.getTime());
  if (!result.ok) throw new Error(result.reason);
  return result.reading;
}

export type PriceSource = "fxratesapi" | "gold-api";

export interface PriceQuote {
  /** Compact symbol as stored on TradeSetupLifecycle.pair, e.g. "EURUSD". */
  pair: string;
  price: number;
  asOfUtc: string;
  source: PriceSource;
}

export type PriceQuoteResult = { ok: true; quote: PriceQuote } | { ok: false; reason: string };

/**
 * Retrieve the current price for a tracked Forex instrument. Validates the
 * symbol first (reuses instruments.ts's own normalizer — the same authority
 * trade-setup generation already uses, never a second parsing rule), then
 * routes to whichever provider actually covers that instrument kind, then
 * re-validates freshness once more before returning. Never throws; never
 * guesses — any failure mode (unsupported symbol, provider error, malformed
 * or mismatched response, stale reading) comes back as `{ ok: false, reason }`.
 */
export async function getCurrentPrice(pair: string, now: Date = new Date()): Promise<PriceQuoteResult> {
  const normalized = normalizeInstrument(pair);
  if (!normalized || !normalized.supported) {
    return { ok: false, reason: "unsupported_instrument" };
  }

  const symbol = normalized.symbol; // compact, e.g. "EURUSD" / "XAUUSD"
  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3, 6);

  let source: PriceSource;
  let reading: PriceReading;
  try {
    if (normalized.isGold) {
      // Every real usage in this app is XAUUSD (see module doc) — a
      // different gold cross is recognized but intentionally not guessed.
      if (quote !== "USD") return { ok: false, reason: "unsupported_gold_cross" };
      source = "gold-api";
      reading = (await withCache(`price:${symbol}`, PRICE_CACHE_TTL_MS, () => fetchGoldUsd(now))).data;
    } else if (normalized.isForex) {
      if (base === quote) return { ok: false, reason: "degenerate_pair" };
      source = "fxratesapi";
      reading = (await withCache(`price:${symbol}`, PRICE_CACHE_TTL_MS, () => fetchFxRate(base, quote, now))).data;
    } else {
      return { ok: false, reason: "unsupported_instrument" };
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "fetch_failed" };
  }

  if (!isFreshEnough(reading.asOfUtc, now)) {
    return { ok: false, reason: "stale" };
  }

  return { ok: true, quote: { pair: symbol, price: reading.price, asOfUtc: reading.asOfUtc, source } };
}
