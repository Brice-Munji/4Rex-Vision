import type { NormalizedEvent, ProviderStatus } from "./types";
import { isRelevant } from "./relevance";
import { minutesUntil } from "./normalize";

/** Configuration for the news-timing guard (all overridable, all documented). */
export interface NewsGuardConfig {
  /** Block new setups when a relevant HIGH event is within this many minutes. */
  windowMin: number;
  /** Hard-block on MEDIUM impact too (default false — MEDIUM is warning only). */
  blockMediumImpact: boolean;
  /**
   * Safe behavior when calendar data is UNAVAILABLE. Default false: do NOT block
   * (allow setups) but clearly report "news data unavailable" so the trader
   * verifies manually — blocking everything on a feed outage would make the tool
   * unusable. Set true for a conservative "block on uncertainty" policy.
   */
  blockWhenUnavailable: boolean;
}

export const DEFAULT_NEWS_GUARD_CONFIG: NewsGuardConfig = {
  windowMin: 20,
  blockMediumImpact: false,
  blockWhenUnavailable: false,
};

export type NewsGuardState = "clear" | "blocked" | "unavailable";
export type NewsRisk = "Low" | "Medium" | "High";

/** The decision the trade-setup engine consumes as a pre-setup GUARD. */
export interface NewsGuard {
  state: NewsGuardState;
  risk: NewsRisk;
  status: string; // human-readable status line
  event: string | null;
  currency: string | null;
  minutesUntil: number | null;
}

export interface EvaluateNewsGuardInput {
  events: NormalizedEvent[];
  pair: string;
  now: Date; // server UTC time — NEVER browser/local time
  providerStatus: ProviderStatus;
  config?: Partial<NewsGuardConfig>;
}

/**
 * The single, deterministic 20-minute high-impact rule (STEP 6).
 *
 *   HIGH impact + relevant currency + 0..window minutes away  → BLOCK new setup
 *   HIGH impact more than `window` minutes away                → allow
 *   event already passed (minutesUntil < 0)                    → allow
 *   MEDIUM impact                                             → warning only
 *   calendar unavailable                                     → "unavailable" (see config)
 *
 * All timing uses the supplied server-UTC `now`. News NEVER changes bias, entry,
 * SL or TP — this only gates WHEN a new setup may be generated.
 */
export function evaluateNewsGuard(input: EvaluateNewsGuardInput): NewsGuard {
  const cfg = { ...DEFAULT_NEWS_GUARD_CONFIG, ...(input.config ?? {}) };

  if (input.providerStatus === "unavailable") {
    if (cfg.blockWhenUnavailable) {
      return {
        state: "blocked",
        risk: "High",
        status:
          "News data unavailable — blocking new setups (conservative policy). Verify an economic calendar before trading.",
        event: null,
        currency: null,
        minutesUntil: null,
      };
    }
    return {
      state: "unavailable",
      risk: "Medium",
      status:
        "News data unavailable — Rex can't verify high-impact event timing for this pair. Check an economic calendar before trading.",
      event: null,
      currency: null,
      minutesUntil: null,
    };
  }

  const relevant = input.events
    .filter((e) => isRelevant(e, input.pair))
    .map((e) => ({ e, m: minutesUntil(e.timestampUtc, input.now) }))
    .filter(({ m }) => Number.isFinite(m));

  const isBlocking = (impact: NormalizedEvent["impact"]) =>
    impact === "High" || (cfg.blockMediumImpact && impact === "Medium");

  // Upcoming within [0, window] and NOT already passed.
  const blockers = relevant
    .filter(({ e, m }) => isBlocking(e.impact) && m >= 0 && m <= cfg.windowMin)
    .sort((a, b) => a.m - b.m);

  const stalePrefix = input.providerStatus === "stale" ? "(cached) " : "";

  if (blockers.length) {
    const { e, m } = blockers[0];
    const when = m <= 0 ? "imminent" : `in ~${m} min`;
    return {
      state: "blocked",
      risk: "High",
      status: `${stalePrefix}News approaching — new trade setups paused. High-impact ${e.currency} ${e.title} event ${when}.`,
      event: e.title,
      currency: e.currency,
      minutesUntil: m,
    };
  }

  // Nearest relevant upcoming (any impact) for the warning line.
  const upcoming = relevant.filter(({ m }) => m >= 0).sort((a, b) => a.m - b.m)[0];
  const nearHigh = relevant
    .filter(({ e, m }) => e.impact === "High" && m >= 0)
    .sort((a, b) => a.m - b.m)[0];

  const risk: NewsRisk = nearHigh && nearHigh.m <= 60 ? "Medium" : "Low";
  const status = upcoming
    ? `${stalePrefix}Clear for now — next ${upcoming.e.impact} ${upcoming.e.currency} ${upcoming.e.title} in ~${upcoming.m} min (outside the ${cfg.windowMin}-min block window).`
    : `${stalePrefix}Clear — no relevant high-impact news within ${cfg.windowMin} minutes for ${input.pair}.`;

  return {
    state: "clear",
    risk,
    status,
    event: upcoming?.e.title ?? null,
    currency: upcoming?.e.currency ?? null,
    minutesUntil: upcoming?.m ?? null,
  };
}
