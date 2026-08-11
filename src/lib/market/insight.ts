/**
 * Rex Insight of the Day — generated from the current correlation and sentiment
 * data. Pure and deterministic (no randomness, safe for SSR); the strongest
 * relationship drives the headline.
 */

import type {
  CalendarEvent,
  CorrelationView,
  PairSentimentView,
  RexInsight,
  SentimentLabel,
  SessionsPayload,
} from "./types";

function pretty(symbol: string): string {
  return symbol.length === 6 ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol;
}

/** Pairs most exposed to a move in a given currency (display form). */
export function affectedPairsFor(ccy: string): string[] {
  switch (ccy) {
    case "USD": return ["EURUSD", "GBPUSD", "Gold"];
    case "EUR": return ["EURUSD", "EURGBP", "EURJPY"];
    case "GBP": return ["GBPUSD", "EURGBP", "GBPJPY"];
    case "JPY": return ["USDJPY", "EURJPY", "GBPJPY"];
    case "CHF": return ["USDCHF", "EURCHF"];
    case "AUD": return ["AUDUSD", "AUDJPY"];
    case "CAD": return ["USDCAD", "CADJPY"];
    case "NZD": return ["NZDUSD", "NZDJPY"];
    default: return ["EURUSD", "GBPUSD"];
  }
}

/** "EURUSD, GBPUSD, and Gold" */
function humanList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** "within 24 minutes" / "within 1h 30m" */
function humanCountdown(mins: number): string {
  if (mins <= 0) return "now";
  if (mins < 120) return `within ${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `within ${h}h ${m}m` : `within ${h} hours`;
}

/**
 * Rex Insight of the Day — built from the LIVE calendar, the current session and
 * recent Rex sentiment. Deterministic (SSR-safe). Mirrors the product spec:
 * "London is currently the dominant session and a high-impact USD event is
 * scheduled within 90 minutes. Expect elevated volatility on EURUSD, GBPUSD, and
 * Gold."
 */
export function generateLiveInsight(
  events: CalendarEvent[],
  sessions: SessionsPayload | null,
  sentiment: PairSentimentView[]
): RexInsight {
  const dominant = sessions?.mostActive ?? null;
  const peak = sessions?.sessions.find((s) => s.active)?.status === "Peak Volatility";
  const nextHigh = events.find((e) => e.impact === "High" && e.minutesUntil >= 0);

  const parts: string[] = [];

  if (dominant) {
    parts.push(
      `${dominant} is currently the dominant session${peak ? " (peak-volatility overlap)" : ""}`
    );
  } else {
    parts.push("Markets are between major sessions");
  }

  if (nextHigh) {
    const pairs = affectedPairsFor(nextHigh.currency);
    const lead = dominant ? " and a" : ". A";
    parts.push(
      `${lead} high-impact ${nextHigh.currency} event (${nextHigh.event}) is scheduled ${humanCountdown(nextHigh.minutesUntil)}. Expect elevated volatility on ${humanList(pairs)}.`
    );
    return { text: capitalize(parts.join("")), basis: "live" };
  }

  // No imminent high-impact event — lean on the most decisive sentiment read.
  const decisive = [...sentiment]
    .filter((s) => s.label !== "Neutral")
    .sort((a, b) => b.strength - a.strength)[0];
  if (decisive) {
    parts.push(
      ` with no high-impact releases imminent. Rex is leaning ${decisive.label.toLowerCase()} on ${pretty(decisive.pair)} (${decisive.strength}%) — favour setups that align with the prevailing bias.`
    );
    return { text: capitalize(parts.join("")), basis: "live" };
  }

  parts.push(
    " with no high-impact releases imminent. Conditions are balanced — wait for a clear catalyst before committing risk."
  );
  return { text: capitalize(parts.join("")), basis: "live" };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
