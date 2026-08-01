/**
 * Sprint P0 — Correlation Guard.
 *
 * Pure, dependency-free helpers (only `import type`). Given the authoritative
 * uploaded pair and any correlated pairs Rex also references in market context,
 * decide whether a *positively correlated* pair carries the opposite directional
 * bias. When it does, Rex must explain the temporary divergence rather than
 * silently present contradictory signals.
 *
 * Gold (XAU/USD) is intentionally NOT forced to match the USD majors — it may
 * legitimately diverge, so it is excluded from the USD-major group.
 */

import type { MarketBias } from "./types";

/** Named correlation groups. Pairs within a group are positively correlated. */
export const CORRELATION_GROUPS: Record<string, string[]> = {
  // USD majors move together against the US dollar (all quoted as XXX/USD).
  "usd-majors": ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD"],
  // JPY crosses move together on yen strength/weakness.
  jpy: ["USDJPY", "EURJPY", "GBPJPY"],
  // Gold stands alone — it may diverge from the USD majors.
  gold: ["XAUUSD"],
};

/** Normalize any pair form ("eur/usd", "EUR USD", "EURUSD") to a bare ticker. */
export function normalizePairKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return key.length >= 6 ? key.slice(0, 6) : key || null;
}

/** True when the symbol is gold (XAU/USD). Gold is treated independently. */
export function isGold(symbol: string | null | undefined): boolean {
  const key = normalizePairKey(symbol);
  return key === "XAUUSD";
}

/** The correlation-group id a symbol belongs to, or null if unknown. */
export function correlationGroupOf(symbol: string | null | undefined): string | null {
  const key = normalizePairKey(symbol);
  if (!key) return null;
  for (const [group, members] of Object.entries(CORRELATION_GROUPS)) {
    if (members.includes(key)) return group;
  }
  return null;
}

/**
 * True when two pairs are POSITIVELY correlated: same group and neither is gold.
 * Gold is never positively correlated with the USD majors for guard purposes —
 * that is the whole point of the Gold Exception.
 */
export function arePositivelyCorrelated(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ka = normalizePairKey(a);
  const kb = normalizePairKey(b);
  if (!ka || !kb || ka === kb) return false;
  if (isGold(ka) || isGold(kb)) return false;
  const ga = correlationGroupOf(ka);
  const gb = correlationGroupOf(kb);
  return !!ga && ga === gb;
}

/** A correlated pair Rex referenced in its market-context section. */
export interface ContextPair {
  pair: string; // display or raw symbol
  bias: MarketBias;
  /** Optional short structural note, e.g. "below resistance". */
  note?: string;
}

export interface CorrelationCheckItem {
  pair: string; // normalized display pair, e.g. "GBP/USD"
  bias: MarketBias;
  note?: string;
}

export interface CorrelationCheck {
  /** The authoritative (uploaded) pair's group, if any. */
  group: string | null;
  /** Correlated context pairs that were evaluated. */
  correlated: CorrelationCheckItem[];
  /** True when a positively-correlated pair holds the opposite directional bias. */
  hasDivergence: boolean;
  /** Mandatory explanation, present only when hasDivergence is true. */
  explanation?: string;
  /** Short headline shown above the explanation. */
  title: string;
}

function opposite(a: MarketBias, b: MarketBias): boolean {
  return (
    (a === "Bullish" && b === "Bearish") || (a === "Bearish" && b === "Bullish")
  );
}

function displayPair(symbol: string): string {
  const key = normalizePairKey(symbol);
  if (!key || key.length !== 6) return symbol;
  return `${key.slice(0, 3)}/${key.slice(3, 6)}`;
}

/**
 * Detect a temporary divergence between the primary uploaded pair and any
 * positively-correlated context pairs. Returns a CorrelationCheck; when
 * `hasDivergence` is true the caller MUST surface `explanation` — contradictory
 * correlated signals are never shown without it.
 */
export function detectDivergence(
  primary: { symbol: string; bias: MarketBias; note?: string },
  context: ContextPair[]
): CorrelationCheck {
  const group = correlationGroupOf(primary.symbol);

  // Only consider positively-correlated, non-gold pairs with a directional bias.
  const correlated: CorrelationCheckItem[] = context
    .filter(
      (c) =>
        arePositivelyCorrelated(primary.symbol, c.pair) &&
        (c.bias === "Bullish" || c.bias === "Bearish")
    )
    .map((c) => ({ pair: displayPair(c.pair), bias: c.bias, note: c.note }));

  const diverging =
    primary.bias === "Bullish" || primary.bias === "Bearish"
      ? correlated.filter((c) => opposite(primary.bias, c.bias))
      : [];

  const hasDivergence = diverging.length > 0;
  const primaryDisplay = displayPair(primary.symbol);

  let explanation: string | undefined;
  if (hasDivergence) {
    const names = [primaryDisplay, ...diverging.map((d) => d.pair)];
    const lead =
      names.length === 2
        ? `${names[0]} and ${names[1]} are normally positively correlated.`
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are normally positively correlated.`;
    const lines = [
      `${primaryDisplay}: ${primary.bias.toLowerCase()} structure${primary.note ? ` ${primary.note}` : ""}`,
      ...diverging.map(
        (d) => `${d.pair}: ${d.bias.toLowerCase()} structure${d.note ? ` ${d.note}` : ""}`
      ),
    ];
    explanation =
      `${lead} Rex detected a temporary divergence:\n` +
      lines.map((l) => `- ${l}`).join("\n") +
      `\nThis may indicate pair-specific strength rather than a broad ` +
      `${group === "jpy" ? "JPY" : "USD"} move.`;
  }

  return {
    group,
    correlated,
    hasDivergence,
    explanation,
    title: "Correlation Check",
  };
}
