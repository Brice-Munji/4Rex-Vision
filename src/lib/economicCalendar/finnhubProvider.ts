import "server-only";
import { finnhubGet } from "@/lib/market/finnhub";
import type { EconomicCalendarProvider, RawProviderEvent } from "./types";

/**
 * Finnhub economic-calendar provider (fallback / alternative). Reuses the
 * existing Finnhub client. `country` is an ISO country code, mapped to the
 * traded currency. The endpoint is a Finnhub premium resource; on free keys it
 * errors — the service then falls back to another provider or cached data.
 */

const COUNTRY_TO_CCY: Record<string, string> = {
  US: "USD", USA: "USD",
  GB: "GBP", UK: "GBP",
  JP: "JPY",
  CH: "CHF",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  EA: "EUR", EU: "EUR", EMU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", GR: "EUR", FI: "EUR",
};
const CCY = new Set(["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"]);

interface FinnhubEconEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string;
  prev: number | null;
  time: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
}

function toCurrency(country: string): string | null {
  const c = (country || "").toUpperCase();
  if (CCY.has(c)) return c;
  return COUNTRY_TO_CCY[c] ?? null;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const finnhubProvider: EconomicCalendarProvider = {
  name: "finnhub",
  async fetchRaw(): Promise<RawProviderEvent[]> {
    const now = new Date();
    const from = ymd(now);
    const to = ymd(new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000));
    const json = await finnhubGet<{ economicCalendar?: FinnhubEconEvent[] }>(
      "/calendar/economic",
      { from, to }
    );
    const rows = json.economicCalendar ?? [];
    return rows.map((r) => ({
      providerId: null,
      currency: toCurrency(r.country), // null if unmappable → dropped as invalid
      title: r.event ?? null,
      impactRaw: r.impact ?? null,
      dateRaw: r.time ?? null, // naive UTC "YYYY-MM-DD HH:MM:SS" → parsed as UTC
      actual: r.actual ?? null,
      forecast: r.estimate ?? null,
      previous: r.prev ?? null,
    }));
  },
};
