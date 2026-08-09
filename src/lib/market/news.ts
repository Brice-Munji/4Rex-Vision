/**
 * Upcoming High-Impact News — MVP mock service.
 *
 * A deterministic daily schedule (UTC) stands in for a real economic-calendar
 * feed. `getUpcomingNews` returns the next 3 events relative to "now" (wrapping
 * to the following day so the card is never empty) and derives an aggregate
 * news-risk level from the nearest high-impact event.
 *
 * Swap `DAILY_SCHEDULE` for a live provider later without touching callers.
 */

import type { ImpactLevel, NewsEvent, NewsPayload, NewsRiskLevel } from "./types";

interface ScheduledEvent {
  time: string; // "HH:MM" UTC
  currency: string;
  event: string;
  impact: ImpactLevel;
}

// Realistic, stable stand-in calendar (UTC). Ordered by time of day.
const DAILY_SCHEDULE: ScheduledEvent[] = [
  { time: "08:00", currency: "EUR", event: "German Ifo Business Climate", impact: "medium" },
  { time: "08:30", currency: "GBP", event: "BoE Financial Stability Report", impact: "medium" },
  { time: "12:30", currency: "USD", event: "Core PCE Price Index m/m", impact: "high" },
  { time: "13:30", currency: "USD", event: "CPI m/m", impact: "high" },
  { time: "14:45", currency: "EUR", event: "ECB Press Conference", impact: "high" },
  { time: "16:00", currency: "GBP", event: "BoE Gov Speaks", impact: "medium" },
  { time: "18:00", currency: "USD", event: "FOMC Meeting Minutes", impact: "high" },
  { time: "23:50", currency: "JPY", event: "BoJ Summary of Opinions", impact: "low" },
];

const DAY_MINUTES = 24 * 60;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutesUtc(now: Date): number {
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

/**
 * Next `count` events from `now`, wrapping past midnight so the card always has
 * something to show. `minutesUntil` is positive for the upcoming occurrence.
 */
export function getUpcomingNews(now: Date = new Date(), count = 3): NewsPayload {
  const cursor = nowMinutesUtc(now);

  const ranked = DAILY_SCHEDULE.map((e) => {
    const at = toMinutes(e.time);
    const minutesUntil = at >= cursor ? at - cursor : at - cursor + DAY_MINUTES;
    return { e, minutesUntil };
  }).sort((a, b) => a.minutesUntil - b.minutesUntil);

  const events: NewsEvent[] = ranked.slice(0, count).map(({ e, minutesUntil }, i) => ({
    id: `news-${e.currency}-${e.time.replace(":", "")}-${i}`,
    time: e.time,
    currency: e.currency,
    event: e.event,
    impact: e.impact,
    minutesUntil,
  }));

  return {
    events,
    riskLevel: deriveNewsRisk(ranked),
    updatedAt: now.toISOString(),
  };
}

/**
 * News-risk seam for the Smart Journal:
 *  HIGH   — a high-impact event within 60 minutes
 *  MEDIUM — a high-impact event within 180 minutes
 *  LOW    — otherwise
 */
function deriveNewsRisk(
  ranked: { e: ScheduledEvent; minutesUntil: number }[]
): NewsRiskLevel {
  const nextHigh = ranked
    .filter((r) => r.e.impact === "high")
    .sort((a, b) => a.minutesUntil - b.minutesUntil)[0];
  if (!nextHigh) return "LOW";
  if (nextHigh.minutesUntil <= 60) return "HIGH";
  if (nextHigh.minutesUntil <= 180) return "MEDIUM";
  return "LOW";
}
