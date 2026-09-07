import "server-only";

/**
 * Live Economic Calendar — now sourced from the provider-agnostic economic
 * calendar service (Forex Factory by default, Finnhub fallback). This file is a
 * thin ADAPTER that maps the service's normalized snapshot onto the existing
 * `CalendarPayload` shape so the Market Intelligence UI stays unchanged.
 *
 * Honesty: no fabricated events. When the provider is unavailable the card shows
 * an empty list with a clear "unavailable" warning rather than a fake schedule.
 */

import { getCalendarSnapshot } from "@/lib/economicCalendar/service";
import { minutesUntil } from "@/lib/economicCalendar/normalize";
import type { NormalizedImpact } from "@/lib/economicCalendar/types";
import type { CalendarEvent, CalendarPayload, ImpactBadge, NewsRiskLevel } from "./types";

const WINDOW_MIN = 24 * 60; // surface the next 24h

/** Only High/Medium/Low map to the UI badge; Non-Economic/Unknown are dropped. */
function toBadge(impact: NormalizedImpact): ImpactBadge | null {
  if (impact === "High" || impact === "Medium" || impact === "Low") return impact;
  return null;
}

function riskFromEvents(events: CalendarEvent[]): NewsRiskLevel {
  const nextHigh = events.find((e) => e.impact === "High" && e.minutesUntil >= 0);
  if (!nextHigh) return "LOW";
  if (nextHigh.minutesUntil <= 60) return "HIGH";
  if (nextHigh.minutesUntil <= 180) return "MEDIUM";
  return "LOW";
}

/**
 * Public accessor kept for backward compatibility. Returns a normalized, cached,
 * sorted `CalendarPayload` sourced from the economic-calendar service.
 */
export async function getEconomicCalendar(now: Date = new Date()): Promise<CalendarPayload> {
  const snapshot = await getCalendarSnapshot(now);

  const events: CalendarEvent[] = snapshot.events
    .map((e) => {
      const badge = toBadge(e.impact);
      if (!badge) return null;
      const mins = minutesUntil(e.timestampUtc, now);
      if (mins < -2 || mins > WINDOW_MIN) return null; // upcoming (next 24h) only
      return {
        id: e.id,
        currency: e.currency,
        event: e.title,
        impact: badge,
        time_utc: e.timestampUtc,
        time_local: e.timestampUtc, // client re-derives its own local time
        previous: e.previous,
        forecast: e.forecast,
        actual: e.actual,
        minutesUntil: mins,
      } as CalendarEvent;
    })
    .filter((e): e is CalendarEvent => e !== null)
    .sort((a, b) => a.minutesUntil - b.minutesUntil);

  return {
    events,
    riskLevel: riskFromEvents(events),
    source: snapshot.source,
    warning: snapshot.warning,
    updatedAt: snapshot.lastSuccessfulSyncUtc ?? now.toISOString(),
  };
}
