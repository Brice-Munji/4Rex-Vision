import "server-only";

/**
 * Market context bundle for FUTURE Smart Journal integration.
 *
 * This only *structures and exposes* the data — it does not build the journal
 * integration itself. The Smart Journal will later read this to stamp trades
 * with the market conditions at entry time.
 *
 * Exposes: next_high_impact, current_session, affected_pairs, news_risk_level
 * (plus pair_sentiment & correlation_flags for continuity).
 */

import { computeSessions } from "./sessions";
import { getEconomicCalendar } from "./calendar";
import { getCorrelations } from "./correlations";
import { getPairSentiment } from "./sentiment";
import { affectedPairsFor } from "./insight";
import type { MarketContext } from "./types";

function relationNote(value: number): string {
  if (value >= 0.7) return "Strong positive — avoid opposite directional trades.";
  if (value <= -0.7) return "Strong negative — same-direction trades double the risk.";
  if (value >= 0.4) return "Moderate positive correlation.";
  if (value <= -0.4) return "Moderate negative correlation.";
  return "Weak correlation.";
}

/** Assemble the full market-context snapshot for the current moment. */
export async function getMarketContext(now: Date = new Date()): Promise<MarketContext> {
  const [sentiment, correlations, calendar] = await Promise.all([
    getPairSentiment(now),
    getCorrelations(now),
    getEconomicCalendar(now),
  ]);
  const sessions = computeSessions(now);

  const pair_sentiment = Object.fromEntries(
    sentiment.pairs.map((p) => [p.pair, { label: p.label, strength: p.strength }])
  );

  const correlation_flags = correlations.pairs
    .filter((c) => Math.abs(c.value) >= 0.4)
    .map((c) => ({
      pair: `${c.a} ↔ ${c.b}`,
      value: c.value,
      note: relationNote(c.value),
    }));

  const nextHigh =
    calendar.events.find((e) => e.impact === "High" && e.minutesUntil >= 0) ?? null;
  const activeSession = sessions.sessions.find((s) => s.active);

  return {
    next_high_impact: nextHigh
      ? {
          currency: nextHigh.currency,
          event: nextHigh.event,
          impact: nextHigh.impact,
          time_utc: nextHigh.time_utc,
          minutesUntil: nextHigh.minutesUntil,
        }
      : null,
    current_session: {
      name: sessions.mostActive,
      status: activeSession?.status ?? "Closed",
      activity: activeSession?.activity ?? "Low",
      overlap: sessions.overlap,
    },
    affected_pairs: nextHigh ? affectedPairsFor(nextHigh.currency) : [],
    news_risk_level: calendar.riskLevel,
    pair_sentiment,
    correlation_flags,
    generatedAt: now.toISOString(),
  };
}
