import type {
  CalendarSource,
  InvalidEvent,
  NormalizedEvent,
  NormalizeResult,
  RawProviderEvent,
} from "./types";
import { normalizeImpact } from "./impact";

/** Parse a provider date/timestamp to a UTC ISO string, or null if invalid. */
export function toUtcIso(dateRaw: string | null | undefined): string | null {
  if (!dateRaw) return null;
  const s = String(dateRaw).trim();
  if (!s) return null;
  // If it looks like a naive "YYYY-MM-DD HH:MM:SS" with no offset, treat as UTC.
  const naive = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s);
  const iso = naive ? s.replace(" ", "T") + "Z" : s;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Stable id used for dedup/revision when the provider gives none. */
function deriveId(source: CalendarSource, currency: string, title: string, ts: string): string {
  return `${source}:${currency}:${slug(title)}:${ts}`;
}

function coalesce<T>(next: T | null | undefined, prev: T | null | undefined): T | null {
  if (next !== null && next !== undefined && next !== "") return next as T;
  if (prev !== null && prev !== undefined && prev !== "") return prev as T;
  return null;
}

/**
 * Normalize raw provider events into clean NormalizedEvents:
 *  - deterministic impact mapping (never guessed)
 *  - timestamps parsed to UTC (never fabricated — missing/invalid ⇒ invalid)
 *  - currency validated (must be a 3-letter code)
 *  - de-duplicated by stable id; a later occurrence REVISES the earlier one
 *    (updated actual/forecast/previous/timestamp) rather than duplicating it.
 */
export function normalizeEvents(
  raws: RawProviderEvent[],
  source: CalendarSource
): NormalizeResult {
  const byId = new Map<string, NormalizedEvent>();
  const invalid: InvalidEvent[] = [];

  for (const raw of raws) {
    const title = (raw.title ?? "").trim();
    if (!title) {
      invalid.push({ reason: "missing-title", raw });
      continue;
    }

    const currency = (raw.currency ?? "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      invalid.push({ reason: "invalid-currency", raw });
      continue;
    }

    const hasDate = !!(raw.timestampUtc || raw.dateRaw);
    if (!hasDate) {
      invalid.push({ reason: "missing-timestamp", raw });
      continue;
    }
    const ts = toUtcIso(raw.timestampUtc ?? raw.dateRaw);
    if (!ts) {
      invalid.push({ reason: "invalid-timestamp", raw });
      continue;
    }

    const impact = normalizeImpact(raw.impactRaw);
    const id = (raw.providerId && String(raw.providerId).trim()) || deriveId(source, currency, title, ts);

    const event: NormalizedEvent = {
      id,
      timestampUtc: ts,
      currency,
      title,
      impact,
      actual: raw.actual ?? null,
      forecast: raw.forecast ?? null,
      previous: raw.previous ?? null,
      source,
    };

    const existing = byId.get(id);
    if (existing) {
      // Revision: merge, preferring the newer non-empty values.
      byId.set(id, {
        ...existing,
        timestampUtc: ts,
        impact: impact !== "Unknown" ? impact : existing.impact,
        actual: coalesce(event.actual, existing.actual),
        forecast: coalesce(event.forecast, existing.forecast),
        previous: coalesce(event.previous, existing.previous),
      });
    } else {
      byId.set(id, event);
    }
  }

  const events = [...byId.values()].sort(
    (a, b) => Date.parse(a.timestampUtc) - Date.parse(b.timestampUtc)
  );
  return { events, invalid };
}

/** Minutes from `now` until the event (negative ⇒ already passed). */
export function minutesUntil(timestampUtc: string, now: Date): number {
  return Math.round((Date.parse(timestampUtc) - now.getTime()) / 60000);
}
