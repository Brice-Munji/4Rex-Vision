import type { NormalizedEvent } from "./types";

/**
 * Deterministic pair → currency relevance. Independently testable and free of
 * any provider or network concern.
 */

export interface PairRelevance {
  /** Currencies whose events DIRECTLY affect (and can block) this pair. */
  currencies: string[];
  /** True for metals like XAU/XAG (quoted in USD). */
  isMetal: boolean;
  /** The metal code when isMetal (e.g. "XAU"), else null. */
  metal: string | null;
}

const METALS = new Set(["XAU", "XAG", "XPT", "XPD"]);

/** Split a pair like "GBP/USD", "GBPUSD" or "XAUUSD" into its currencies. */
export function currenciesForPair(pair: string | null | undefined): PairRelevance {
  const empty: PairRelevance = { currencies: [], isMetal: false, metal: null };
  if (!pair) return empty;

  const clean = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
  let base: string | null = null;
  let quote: string | null = null;

  if (clean.length >= 6) {
    base = clean.slice(0, 3);
    quote = clean.slice(3, 6);
  } else if (pair.includes("/")) {
    const [b, q] = pair.split("/").map((s) => s.trim().toUpperCase());
    base = b ?? null;
    quote = q ?? null;
  } else {
    return empty;
  }

  if (base && METALS.has(base)) {
    // Metals (e.g. XAU/USD): only the QUOTE currency's events are DIRECT blockers.
    // Gold/macro events may be surfaced separately (see isInformationalForPair),
    // but unrelated-currency events are never direct blockers.
    return { currencies: quote ? [quote] : [], isMetal: true, metal: base };
  }

  const currencies = [base, quote].filter((c): c is string => !!c && /^[A-Z]{3}$/.test(c));
  return { currencies, isMetal: false, metal: null };
}

/** True when the event's currency directly affects the pair (can block a setup). */
export function isRelevant(event: Pick<NormalizedEvent, "currency">, pair: string): boolean {
  const { currencies } = currenciesForPair(pair);
  const cur = (event.currency ?? "").toUpperCase();
  return !!cur && currencies.includes(cur);
}

const GOLD_MACRO = /\b(gold|xau|bullion|precious metal)\b/i;

/**
 * Informational-only relevance (never a blocker): for metals, surface events
 * whose title references gold/precious metals in addition to the quote currency.
 */
export function isInformationalForPair(
  event: Pick<NormalizedEvent, "currency" | "title">,
  pair: string
): boolean {
  const rel = currenciesForPair(pair);
  if (isRelevant(event, pair)) return true;
  if (rel.isMetal && GOLD_MACRO.test(event.title ?? "")) return true;
  return false;
}
