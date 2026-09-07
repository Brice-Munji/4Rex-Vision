/**
 * Provider-agnostic economic-calendar contracts.
 *
 * The rest of the app (news blocker, calendar UI) depends ONLY on these types,
 * never on a specific provider, so Forex Factory / Finnhub / any future feed can
 * be swapped without touching the UI or the news-blocking logic.
 */

export type NormalizedImpact = "High" | "Medium" | "Low" | "Non-Economic" | "Unknown";

export type CalendarSource = "forexfactory" | "finnhub" | "fallback";

/** A single normalized event. Timestamps are ALWAYS stored as UTC ISO strings. */
export interface NormalizedEvent {
  id: string; // stable id (provider id when available, else derived) — for dedup
  timestampUtc: string; // ISO 8601 in UTC (e.g. "2026-09-10T12:15:00.000Z")
  currency: string; // ISO currency code, e.g. "USD"
  title: string;
  impact: NormalizedImpact;
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
  source: CalendarSource;
}

/** Loose intermediate a provider maps its raw payload into before normalization. */
export interface RawProviderEvent {
  providerId?: string | null;
  currency?: string | null;
  title?: string | null;
  impactRaw?: string | null;
  /** Provider date string; may carry a timezone offset (e.g. "…-04:00"). */
  dateRaw?: string | null;
  /** Already-UTC ISO, when the provider supplies it directly. */
  timestampUtc?: string | null;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
}

/** An event that could not be reliably normalized — kept for diagnostics only. */
export interface InvalidEvent {
  reason:
    | "missing-timestamp"
    | "invalid-timestamp"
    | "invalid-currency"
    | "invalid-impact"
    | "missing-title";
  raw: RawProviderEvent;
}

export interface NormalizeResult {
  events: NormalizedEvent[];
  invalid: InvalidEvent[];
}

export type ProviderStatus = "live" | "stale" | "unavailable";

/** A cached, freshness-tagged calendar snapshot returned by the service. */
export interface CalendarSnapshot {
  events: NormalizedEvent[];
  source: CalendarSource;
  providerStatus: ProviderStatus;
  /** When the underlying provider data was last successfully fetched (UTC ISO). */
  lastSuccessfulSyncUtc: string | null;
  /** When the service will attempt the next refresh (UTC ISO). */
  nextRefreshUtc: string | null;
  /** Human-readable note when data is stale/unavailable; null when live. */
  warning: string | null;
}

/** A provider fetches its feed and maps it to the loose intermediate shape. */
export interface EconomicCalendarProvider {
  readonly name: CalendarSource;
  /** Fetch raw events (network). Throws on failure so the service can fall back. */
  fetchRaw(): Promise<RawProviderEvent[]>;
}
