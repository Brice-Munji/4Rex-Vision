import "server-only";

/**
 * Market context bundle for FUTURE Smart Journal integration.
 *
 * This only *structures and exposes* the data — it does not build the journal
 * integration itself. The Smart Journal will later read this to stamp trades
 * with the market conditions at entry time.
 *
 * Exposes: current_session, news_risk_level, pair_sentiment, correlation_flags.
 */

import { computeSessions } from "./sessions";
import { getUpcomingNews } from "./news";
import { getCorrelations } from "./correlations";
import { getPairSentiment } from "./sentiment";
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
  const [sentiment, correlations] = await Promise.all([
    getPairSentiment(now),
    getCorrelations(now),
  ]);
  const sessions = computeSessions(now);
  const news = getUpcomingNews(now);

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

  return {
    current_session: {
      name: sessions.mostActive,
      activity:
        sessions.sessions.find((s) => s.active)?.activity ?? "Low",
      overlap: sessions.overlap,
    },
    news_risk_level: news.riskLevel,
    pair_sentiment,
    correlation_flags,
    generatedAt: now.toISOString(),
  };
}
