/**
 * Sprint P0 — Pair Integrity.
 *
 * Pure, dependency-free helpers (only `import type`). These enforce that the
 * uploaded chart's pair is the *only* pair Rex delivers a verdict for:
 *
 *  - STRICT VALIDATION: decide whether the pair was confidently extracted.
 *  - RESPONSE GUARD: detect when the generated verdict drifted to a foreign pair.
 *  - CONFIDENCE RULE: never present 85%+ confidence on weak/conflicting setups.
 *  - TIMEFRAME DISPLAY: render "H1" as "1H" etc. for the validation banner.
 */

import type { ReadTimeframe, Timeframe } from "./types";

/** Minimum instrument-detection confidence to trust an extracted pair. */
export const PAIR_MIN_CONFIDENCE = 55;

/** Confidence is capped BELOW this whenever a weakening condition is present. */
export const CONFIDENCE_CAP = 84;

/** Exact copy for the strict-validation stop (spec: "Pair not detected"). */
export const PAIR_NOT_DETECTED_TITLE = "Pair not detected";
export const PAIR_NOT_DETECTED_MESSAGE =
  "Rex could not confidently identify the currency pair from the uploaded chart. Please upload a clearer screenshot showing the TradingView symbol area.";

/* ----------------------------- Currency codes ---------------------------- */

const FX = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD",
  "SGD", "HKD", "SEK", "NOK", "MXN", "ZAR", "TRY", "PLN", "DKK", "CNH",
];
const METALS = ["XAU", "XAG", "XPT", "XPD"];
const BASES = new Set([...FX, ...METALS]);
const QUOTES = new Set(FX);

/* ------------------------------ Timeframe UI ----------------------------- */

const TF_DISPLAY: Record<string, string> = {
  M1: "1M", M5: "5M", M15: "15M", M30: "30M",
  H1: "1H", H4: "4H",
  Daily: "D1", Weekly: "W1", Monthly: "MN",
};

/** Human/banner form of a timeframe: "H1" → "1H", "Daily" → "D1". */
export function displayTimeframe(
  tf: ReadTimeframe | Timeframe | "Unknown" | null | undefined
): string {
  if (!tf || tf === "Unknown") return "—";
  return TF_DISPLAY[tf] ?? tf;
}

/* --------------------------- Strict validation --------------------------- */

export interface PairExtractionInput {
  instrument: string | null;
  symbol: string | null;
  supported: boolean;
  instrumentConfidence: number; // 0-100
}

export interface PairExtractionResult {
  confident: boolean;
  /** Reason the extraction failed, for logging (never shown as a guess). */
  reason?: "no-instrument" | "unsupported" | "low-confidence";
}

/**
 * STRICT VALIDATION — decide whether the pair was extracted confidently.
 * Never guess, never substitute, never default: if this returns
 * `confident: false` the caller must STOP and show the pair-not-detected copy.
 */
export function assessPairExtraction(
  input: PairExtractionInput
): PairExtractionResult {
  if (!input.instrument || !input.symbol) return { confident: false, reason: "no-instrument" };
  if (!input.supported) return { confident: false, reason: "unsupported" };
  if (input.instrumentConfidence < PAIR_MIN_CONFIDENCE)
    return { confident: false, reason: "low-confidence" };
  return { confident: true };
}

/* ------------------------------ Pair scanning ---------------------------- */

/** Normalize a raw pair token to a bare 6-letter ticker, or null. */
export function normalizePairKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return key.length >= 6 ? key.slice(0, 6) : null;
}

/**
 * Find every valid FX/metal pair mentioned in free text. Handles "EUR/USD",
 * "EURUSD", "eur-usd". Returns de-duplicated bare tickers (e.g. "EURUSD").
 */
const PAIR_RE = new RegExp(
  `\\b(${[...BASES].join("|")})[\\/\\s._-]?(${[...QUOTES].join("|")})\\b`,
  "gi"
);

export function findPairsInText(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  // Reset the shared regex's lastIndex before each scan (it is global/stateful).
  PAIR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAIR_RE.exec(text)) !== null) {
    const base = m[1].toUpperCase();
    const quote = m[2].toUpperCase();
    if (base !== quote) found.add(`${base}${quote}`);
  }
  return [...found];
}

export interface ResponseGuardResult {
  /** The verdict drifted: a foreign pair is delivered and the uploaded one isn't. */
  violated: boolean;
  /** Foreign pairs found in the primary verdict text. */
  foreignPairs: string[];
  /** Whether the authoritative pair appears in the primary verdict text. */
  mentionsAuthoritative: boolean;
}

/**
 * RESPONSE GUARD — validate that the generated verdict is for the uploaded pair.
 * `violated` is true when the primary verdict text names a different pair but
 * never the authoritative one (e.g. "GBPUSD bullish, EURUSD bearish" with no
 * AUDUSD verdict). Callers should reject-and-regenerate, then hard-correct.
 */
export function guardPrimaryPair(
  verdictText: string,
  authoritativeSymbol: string
): ResponseGuardResult {
  const auth = normalizePairKey(authoritativeSymbol);
  const found = findPairsInText(verdictText);
  const foreign = auth ? found.filter((p) => p !== auth) : found;
  const mentionsAuthoritative = auth ? found.includes(auth) : false;
  return {
    violated: foreign.length > 0 && !mentionsAuthoritative,
    foreignPairs: foreign,
    mentionsAuthoritative,
  };
}

/* ----------------------------- Confidence rule --------------------------- */

export interface ConfidenceFlags {
  /** Pair extraction confidence is low. */
  lowExtraction: boolean;
  /** Structure is mixed / directionless. */
  mixedStructure: boolean;
  /** A positively-correlated pair diverges. */
  conflictingCorrelation: boolean;
  /** High-impact news risk is near. */
  highNews: boolean;
}

/** True when any weakening condition applies. */
export function shouldReduceConfidence(flags: ConfidenceFlags): boolean {
  return (
    flags.lowExtraction ||
    flags.mixedStructure ||
    flags.conflictingCorrelation ||
    flags.highNews
  );
}

/**
 * CONFIDENCE RULE — cap confidence below 85% on weak or conflicting setups.
 * Returns the (possibly reduced) confidence in 0-100.
 */
export function applyConfidencePolicy(
  raw: number,
  flags: ConfidenceFlags,
  cap = CONFIDENCE_CAP
): number {
  const value = Math.max(0, Math.min(100, Math.round(raw)));
  return shouldReduceConfidence(flags) ? Math.min(value, cap) : value;
}

/** Human-readable reasons confidence was reduced (for the report note). */
export function confidenceReasons(flags: ConfidenceFlags): string[] {
  const out: string[] = [];
  if (flags.lowExtraction) out.push("pair detection was not fully confident");
  if (flags.mixedStructure) out.push("market structure is mixed");
  if (flags.conflictingCorrelation) out.push("a correlated pair is diverging");
  if (flags.highNews) out.push("high-impact news risk is nearby");
  return out;
}
