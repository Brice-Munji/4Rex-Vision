/**
 * Provider-agnostic economic calendar. Public surface for the rest of the app.
 *
 * - Pure, testable core: impact normalization, pair relevance, event
 *   normalization, and the 20-minute high-impact news-blocking rule.
 * - Server-only service: provider selection (Forex Factory by default, Finnhub
 *   fallback), caching, freshness, stale/unavailable handling, diagnostics.
 *
 * Swap providers via the `ECONOMIC_CALENDAR_PROVIDER` env var without touching
 * the calendar UI or the news-blocking logic.
 */

export type {
  NormalizedEvent,
  NormalizedImpact,
  CalendarSnapshot,
  CalendarSource,
  ProviderStatus,
  EconomicCalendarProvider,
  RawProviderEvent,
} from "./types";
export { normalizeImpact } from "./impact";
export { currenciesForPair, isRelevant, isInformationalForPair } from "./relevance";
export { normalizeEvents, toUtcIso, minutesUntil } from "./normalize";
export {
  evaluateNewsGuard,
  DEFAULT_NEWS_GUARD_CONFIG,
  type NewsGuard,
  type NewsGuardConfig,
  type NewsGuardState,
  type NewsRisk,
} from "./blocking";
export { parseForexFactory } from "./forexFactory";
// Server-only: import directly from "./service" in server code.
