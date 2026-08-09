/**
 * Rex Insight of the Day — generated from the current correlation and sentiment
 * data. Pure and deterministic (no randomness, safe for SSR); the strongest
 * relationship drives the headline.
 */

import type {
  CorrelationView,
  PairSentimentView,
  RexInsight,
  SentimentLabel,
} from "./types";

function pretty(symbol: string): string {
  return symbol.length === 6 ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol;
}

function signed(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

/**
 * Craft the insight. Picks the strongest |correlation|:
 *  - strong positive → warn against opposite directional trades on the pair
 *  - strong negative → note the natural hedge / confirmation angle
 * Falls back to the most one-sided sentiment when no correlation is notable.
 */
export function generateInsight(
  correlations: CorrelationView[],
  sentiment: PairSentimentView[]
): RexInsight {
  const strongest = [...correlations].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value)
  )[0];

  const labelOf = (sym: string): SentimentLabel | null =>
    sentiment.find((s) => s.pair === sym)?.label ?? null;

  if (strongest && Math.abs(strongest.value) >= 0.7) {
    const a = pretty(strongest.a);
    const b = pretty(strongest.b);
    if (strongest.value > 0) {
      const la = labelOf(strongest.a);
      const lb = labelOf(strongest.b);
      const aligned = la && lb && la === lb ? ` Rex currently reads both as ${la.toLowerCase()}.` : "";
      return {
        basis: "correlation",
        text:
          `${a} and ${b} remain strongly positively correlated (${signed(strongest.value)}). ` +
          `Avoid taking opposite directional trades on both pairs unless driven by pair-specific news.${aligned}`,
      };
    }
    return {
      basis: "correlation",
      text:
        `${a} and ${b} are strongly negatively correlated (${signed(strongest.value)}). ` +
        `Positions in the same direction on both effectively double the same risk — size accordingly or use one to confirm the other.`,
    };
  }

  // No standout correlation — lead with the most decisive sentiment read.
  const decisive = [...sentiment]
    .filter((s) => s.label !== "Neutral")
    .sort((a, b) => b.strength - a.strength)[0];

  if (decisive) {
    return {
      basis: "sentiment",
      text:
        `Rex is leaning ${decisive.label.toLowerCase()} on ${pretty(decisive.pair)} ` +
        `(${decisive.strength}%). Look for setups that align with the prevailing bias and wait for confirmation near key levels.`,
    };
  }

  return {
    basis: "neutral",
    text:
      "Markets are balanced across the majors right now. Favour patience — let a clear session or a news catalyst set the tone before committing risk.",
  };
}
