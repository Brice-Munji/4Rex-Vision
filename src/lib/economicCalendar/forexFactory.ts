import type { EconomicCalendarProvider, RawProviderEvent } from "./types";

/**
 * Forex Factory calendar provider.
 *
 * DATA-ACCESS METHOD (verified): Forex Factory has NO official public API / key.
 * The only reliable automated source is Forex Factory's own weekly JSON feed,
 * served by its media partner faireconomy.media and consumed by the FF calendar
 * widget itself:
 *
 *   https://nfs.faireconomy.media/ff_calendar_thisweek.json
 *   https://nfs.faireconomy.media/ff_calendar_nextweek.json
 *
 * This is the calendar's own public data export (not HTML scraping, no bypass of
 * any auth/paywall). It is NOT an officially documented API and FF's terms
 * discourage automated redistribution, so it is used SERVER-SIDE ONLY, cached,
 * treated as best-effort, and easily swapped for another provider via the
 * abstraction. Row shape: { title, country(=currency), date(ISO+offset), impact,
 * forecast, previous }. There is no per-event id and no `actual` field in the
 * weekly export.
 */

const THIS_WEEK = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const NEXT_WEEK = "https://nfs.faireconomy.media/ff_calendar_nextweek.json";

interface FFRow {
  title?: string;
  country?: string; // currency code, e.g. "USD" (or "All" for global)
  date?: string; // ISO 8601 with tz offset, e.g. "2026-09-10T08:15:00-04:00"
  impact?: string; // "High" | "Medium" | "Low" | "Holiday"
  forecast?: string;
  previous?: string;
}

/** Pure mapper: Forex Factory rows → loose intermediate. Independently testable. */
export function parseForexFactory(json: unknown): RawProviderEvent[] {
  if (!Array.isArray(json)) return [];
  return (json as FFRow[]).map((r) => ({
    providerId: null, // FF weekly export has no stable id; normalize derives one
    currency: r.country ?? null,
    title: r.title ?? null,
    impactRaw: r.impact ?? null,
    dateRaw: r.date ?? null,
    actual: null, // not present in the weekly export
    forecast: r.forecast === "" ? null : (r.forecast ?? null),
    previous: r.previous === "" ? null : (r.previous ?? null),
  }));
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "4RexVision/1.0 (economic-calendar)" },
    });
    if (!res.ok) throw new Error(`Forex Factory ${url} → HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const forexFactoryProvider: EconomicCalendarProvider = {
  name: "forexfactory",
  async fetchRaw(): Promise<RawProviderEvent[]> {
    // this-week is the primary; next-week covers the week boundary. next-week is
    // best-effort — a failure there must not sink the whole fetch.
    const thisWeek = await fetchJson(THIS_WEEK);
    let nextWeek: unknown = [];
    try {
      nextWeek = await fetchJson(NEXT_WEEK);
    } catch {
      nextWeek = [];
    }
    return [...parseForexFactory(thisWeek), ...parseForexFactory(nextWeek)];
  },
};
