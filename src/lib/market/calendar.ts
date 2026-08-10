import "server-only";

/**
 * Live Economic Calendar backed by Finnhub's economic-calendar endpoint.
 *
 *   GET /calendar/economic?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * We fetch a 2-day window, keep only upcoming events (next 24h) for the eight
 * major currencies, normalize + sort by nearest, and cache for 5 minutes.
 *
 * The economic-calendar endpoint is a Finnhub *premium* resource; on free keys
 * it returns an access error. To honour "never break the layout", we fall back
 * to a deterministic built-in schedule and flag `source: "fallback"` + a subtle
 * warning so the card stays useful while clearly signalling degraded data.
 */

import { finnhubGet, withCache } from "./finnhub";
import type {
  CalendarEvent,
  CalendarPayload,
  ImpactBadge,
  NewsRiskLevel,
} from "./types";

const CALENDAR_TTL_MS = 5 * 60 * 1000; // 5 minutes
const WINDOW_MS = 24 * 60 * 60 * 1000; // next 24h

/** Currencies we surface, per spec. */
const ALLOWED = new Set(["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"]);

/** Finnhub reports a country (ISO-3166) — map it to the traded currency. */
const COUNTRY_TO_CCY: Record<string, string> = {
  US: "USD", USA: "USD",
  GB: "GBP", UK: "GBP",
  JP: "JPY",
  CH: "CHF",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  // Eurozone members all trade the euro.
  EA: "EUR", EU: "EUR", EMU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", GR: "EUR", FI: "EUR",
};

interface FinnhubEconEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string; // "high" | "medium" | "low" | ""
  prev: number | null;
  time: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
  unit?: string;
}

function toCurrency(country: string): string | null {
  if (!country) return null;
  const c = country.toUpperCase();
  if (ALLOWED.has(c)) return c; // already a currency
  return COUNTRY_TO_CCY[c] ?? null;
}

function toImpact(raw: string): ImpactBadge {
  const s = (raw || "").toLowerCase();
  if (s === "high" || s === "3") return "High";
  if (s === "medium" || s === "2") return "Medium";
  return "Low";
}

/** Parse a Finnhub UTC timestamp ("YYYY-MM-DD HH:MM:SS") into a Date. */
function parseUtc(time: string): Date {
  return new Date(time.replace(" ", "T") + "Z");
}

function riskFromEvents(events: CalendarEvent[]): NewsRiskLevel {
  const nextHigh = events.find((e) => e.impact === "High" && e.minutesUntil >= 0);
  if (!nextHigh) return "LOW";
  if (nextHigh.minutesUntil <= 60) return "HIGH";
  if (nextHigh.minutesUntil <= 180) return "MEDIUM";
  return "LOW";
}

function normalize(rows: FinnhubEconEvent[], now: Date): CalendarEvent[] {
  const from = now.getTime();
  const to = from + WINDOW_MS;

  const out: CalendarEvent[] = [];
  for (const r of rows) {
    const currency = toCurrency(r.country);
    if (!currency) continue;
    const at = parseUtc(r.time);
    const t = at.getTime();
    if (isNaN(t) || t < from || t > to) continue; // upcoming, next 24h only

    out.push({
      id: `${currency}-${r.event}-${r.time}`.replace(/\s+/g, "_"),
      currency,
      event: r.event,
      impact: toImpact(r.impact),
      time_utc: at.toISOString(),
      time_local: at.toISOString(),
      previous: r.prev ?? null,
      forecast: r.estimate ?? null,
      actual: r.actual ?? null,
      minutesUntil: Math.round((t - from) / 60000),
    });
  }
  return out.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Live fetch (throws on failure so withCache can serve last-good). */
async function fetchLive(now: Date): Promise<CalendarEvent[]> {
  const from = ymd(now);
  const to = ymd(new Date(now.getTime() + WINDOW_MS + 12 * 60 * 60 * 1000));
  const json = await finnhubGet<{ economicCalendar?: FinnhubEconEvent[] }>(
    "/calendar/economic",
    { from, to }
  );
  const rows = json.economicCalendar ?? [];
  return normalize(rows, now);
}

/* ── Deterministic fallback schedule ──────────────────────────────────────── */

interface Sched { hour: number; minute: number; currency: string; event: string; impact: ImpactBadge; }

const FALLBACK_SCHEDULE: Sched[] = [
  { hour: 1, minute: 30, currency: "AUD", event: "RBA Rate Statement", impact: "High" },
  { hour: 6, minute: 0, currency: "EUR", event: "German Factory Orders m/m", impact: "Medium" },
  { hour: 8, minute: 30, currency: "GBP", event: "BoE Financial Stability Report", impact: "Medium" },
  { hour: 12, minute: 30, currency: "USD", event: "Core PCE Price Index m/m", impact: "High" },
  { hour: 12, minute: 30, currency: "CAD", event: "Employment Change", impact: "High" },
  { hour: 13, minute: 30, currency: "USD", event: "CPI m/m", impact: "High" },
  { hour: 14, minute: 45, currency: "EUR", event: "ECB Press Conference", impact: "High" },
  { hour: 16, minute: 0, currency: "GBP", event: "BoE Gov Speaks", impact: "Medium" },
  { hour: 18, minute: 0, currency: "USD", event: "FOMC Meeting Minutes", impact: "High" },
  { hour: 21, minute: 45, currency: "NZD", event: "CPI q/q", impact: "Medium" },
  { hour: 23, minute: 30, currency: "JPY", event: "Tokyo Core CPI y/y", impact: "Medium" },
];

/** Build fallback events spanning the next 24h (today + tomorrow anchors). */
function fallbackEvents(now: Date): CalendarEvent[] {
  const from = now.getTime();
  const to = from + WINDOW_MS;
  const out: CalendarEvent[] = [];

  for (const dayOffset of [0, 1]) {
    const base = new Date(now);
    base.setUTCHours(0, 0, 0, 0);
    base.setUTCDate(base.getUTCDate() + dayOffset);
    for (const s of FALLBACK_SCHEDULE) {
      const at = new Date(base);
      at.setUTCHours(s.hour, s.minute, 0, 0);
      const t = at.getTime();
      if (t < from || t > to) continue;
      out.push({
        id: `fb-${s.currency}-${s.event}-${at.toISOString()}`.replace(/\s+/g, "_"),
        currency: s.currency,
        event: s.event,
        impact: s.impact,
        time_utc: at.toISOString(),
        time_local: at.toISOString(),
        previous: null,
        forecast: null,
        actual: null,
        minutesUntil: Math.round((t - from) / 60000),
      });
    }
  }
  return out.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

/**
 * Public accessor. Returns a normalized, cached, sorted calendar. Falls back to
 * the built-in schedule (with a warning) when Finnhub is unavailable.
 */
export async function getEconomicCalendar(now: Date = new Date()): Promise<CalendarPayload> {
  try {
    const cached = await withCache("finnhub:calendar", CALENDAR_TTL_MS, () => fetchLive(now));
    // Recompute minutesUntil relative to *now* (cache may be a few minutes old).
    const events = refreshCountdowns(cached.data, now);
    if (events.length > 0) {
      return {
        events,
        riskLevel: riskFromEvents(events),
        source: "finnhub",
        warning: cached.stale ? "Live market data temporarily unavailable." : null,
        updatedAt: new Date(cached.fetchedAt).toISOString(),
      };
    }
    // Live succeeded but nothing upcoming in-window → use fallback for a useful card.
    const fb = fallbackEvents(now);
    return {
      events: fb,
      riskLevel: riskFromEvents(fb),
      source: "fallback",
      warning: "Live market data temporarily unavailable.",
      updatedAt: now.toISOString(),
    };
  } catch {
    const fb = fallbackEvents(now);
    return {
      events: fb,
      riskLevel: riskFromEvents(fb),
      source: "fallback",
      warning: "Live market data temporarily unavailable.",
      updatedAt: now.toISOString(),
    };
  }
}

/** Recompute countdowns and drop anything now in the past (>2m elapsed). */
function refreshCountdowns(events: CalendarEvent[], now: Date): CalendarEvent[] {
  const from = now.getTime();
  return events
    .map((e) => ({ ...e, minutesUntil: Math.round((new Date(e.time_utc).getTime() - from) / 60000) }))
    .filter((e) => e.minutesUntil >= -2 && e.minutesUntil <= 24 * 60)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
}
