import "server-only";
import type {
  CalendarSnapshot,
  CalendarSource,
  EconomicCalendarProvider,
  InvalidEvent,
  NormalizedEvent,
  ProviderStatus,
} from "./types";
import { normalizeEvents, minutesUntil } from "./normalize";
import { evaluateNewsGuard, type NewsGuard } from "./blocking";
import { isRelevant } from "./relevance";
import { forexFactoryProvider } from "./forexFactory";
import { finnhubProvider } from "./finnhubProvider";

/**
 * Server-side calendar service: provider selection, caching, freshness tracking,
 * stale/unavailable handling and diagnostics. Never runs in the browser and
 * never exposes provider internals/keys to the client.
 */

const TTL_MS = 15 * 60 * 1000; // refresh at most every 15 minutes
const DEBUG = process.env.ECONOMIC_CALENDAR_DEBUG === "1";

const REGISTRY: Record<string, EconomicCalendarProvider> = {
  forexfactory: forexFactoryProvider,
  finnhub: finnhubProvider,
};

/** Primary provider from env (default Forex Factory), with the other as fallback. */
function providerOrder(): EconomicCalendarProvider[] {
  const primary = (process.env.ECONOMIC_CALENDAR_PROVIDER ?? "forexfactory").toLowerCase();
  const names = primary === "finnhub" ? ["finnhub", "forexfactory"] : ["forexfactory", "finnhub"];
  return names.map((n) => REGISTRY[n]).filter(Boolean);
}

interface CacheEntry {
  events: NormalizedEvent[];
  fetchedAt: number;
  source: CalendarSource;
}
let cache: CacheEntry | null = null;

function log(msg: string, extra?: unknown) {
  // eslint-disable-next-line no-console
  console.info(`[economicCalendar] ${msg}`, extra ?? "");
}
function logInvalid(source: string, invalid: InvalidEvent[]) {
  if (invalid.length === 0) return;
  const counts = invalid.reduce<Record<string, number>>((a, i) => {
    a[i.reason] = (a[i.reason] ?? 0) + 1;
    return a;
  }, {});
  // eslint-disable-next-line no-console
  console.warn(`[economicCalendar] ${source}: dropped ${invalid.length} invalid event(s)`, counts);
}

function snapshotFrom(entry: CacheEntry, status: ProviderStatus): CalendarSnapshot {
  return {
    events: entry.events,
    source: entry.source,
    providerStatus: status,
    lastSuccessfulSyncUtc: new Date(entry.fetchedAt).toISOString(),
    nextRefreshUtc: new Date(entry.fetchedAt + TTL_MS).toISOString(),
    warning: status === "stale" ? "Showing cached calendar — live refresh failed." : null,
  };
}

/**
 * Returns a normalized, cached, freshness-tagged calendar. On provider failure
 * it falls through to the next provider, then to last-good cache marked STALE,
 * and finally to an explicit UNAVAILABLE state (never fabricated events).
 */
export async function getCalendarSnapshot(now: Date = new Date()): Promise<CalendarSnapshot> {
  const nowMs = now.getTime();

  if (cache && nowMs - cache.fetchedAt < TTL_MS) {
    return snapshotFrom(cache, "live");
  }

  for (const provider of providerOrder()) {
    try {
      const raw = await provider.fetchRaw();
      const { events, invalid } = normalizeEvents(raw, provider.name);
      logInvalid(provider.name, invalid);
      if (events.length === 0) throw new Error("provider returned no valid events");
      cache = { events, fetchedAt: nowMs, source: provider.name };
      log(`refreshed from ${provider.name}: ${events.length} events`);
      return snapshotFrom(cache, "live");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[economicCalendar] provider ${provider.name} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (cache) {
    log("all providers failed — serving cached calendar as STALE");
    return snapshotFrom(cache, "stale");
  }
  log("all providers failed and no cache — calendar UNAVAILABLE");
  return {
    events: [],
    source: "fallback",
    providerStatus: "unavailable",
    lastSuccessfulSyncUtc: null,
    nextRefreshUtc: null,
    warning: "Economic calendar data is currently unavailable.",
  };
}

/**
 * The news-timing GUARD for a pair — the single integration point the trade-setup
 * generator calls BEFORE creating a new setup. Emits STEP-10 server diagnostics.
 */
export async function getNewsGuardForPair(
  pair: string,
  now: Date = new Date()
): Promise<{ guard: NewsGuard; snapshot: CalendarSnapshot }> {
  const snapshot = await getCalendarSnapshot(now);
  const guard = evaluateNewsGuard({
    events: snapshot.events,
    pair,
    now,
    providerStatus: snapshot.providerStatus,
  });

  // ── Diagnostics (server-side only; never sent to the browser) ──────────────
  log("news-guard evaluation", {
    pair,
    serverUtc: now.toISOString(),
    source: snapshot.source,
    providerStatus: snapshot.providerStatus,
    lastSuccessfulSyncUtc: snapshot.lastSuccessfulSyncUtc,
    setupBlocked: guard.state === "blocked",
    guardState: guard.state,
    triggerEvent: guard.event,
    triggerCurrency: guard.currency,
    minutesUntil: guard.minutesUntil,
  });
  if (DEBUG) {
    for (const e of snapshot.events) {
      // eslint-disable-next-line no-console
      console.debug("[economicCalendar] event", {
        title: e.title,
        currency: e.currency,
        impact: e.impact,
        timestampUtc: e.timestampUtc,
        minutesUntil: minutesUntil(e.timestampUtc, now),
        relevant: isRelevant(e, pair),
      });
    }
  }

  return { guard, snapshot };
}
