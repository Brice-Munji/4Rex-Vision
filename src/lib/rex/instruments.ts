/**
 * Instrument normalization & validation (Chart Reader — Step 3).
 *
 * Pure, dependency-free helpers. Turns a raw detected symbol (e.g. "EURUSD",
 * "EUR/USD", "XAUUSD") into a normalized instrument and decides whether it is a
 * supported market for analysis (Forex pairs and Gold are supported).
 */

const FX_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD",
  "SGD", "HKD", "SEK", "NOK", "MXN", "ZAR", "TRY", "PLN", "DKK", "CNH",
];

const METALS: Record<string, string> = {
  XAU: "Gold",
  XAG: "Silver",
  XPT: "Platinum",
  XPD: "Palladium",
};

export interface NormalizedInstrument {
  /** Display form, e.g. "EUR/USD", "XAU/USD", "NAS100". */
  instrument: string;
  /** Raw ticker without separators, e.g. "EURUSD". */
  symbol: string;
  isForex: boolean;
  isGold: boolean;
  isMetal: boolean;
  /** Analysis is supported (Forex pairs and Gold). */
  supported: boolean;
  kind: "forex" | "metal" | "index" | "unknown";
}

/** Attempt to normalize a raw symbol string. Returns null if unrecognizable. */
export function normalizeInstrument(
  raw: string | null | undefined
): NormalizedInstrument | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/\s+/g, "");
  const compact = cleaned.replace(/[^A-Z0-9]/g, "");
  if (compact.length < 3) return null;

  // Six-letter FX / metal pairs (with or without a separator).
  const six = compact.slice(0, 6);
  if (six.length === 6) {
    const base = six.slice(0, 3);
    const quote = six.slice(3, 6);
    const baseFx = FX_CURRENCIES.includes(base);
    const quoteFx = FX_CURRENCIES.includes(quote);
    const baseMetal = base in METALS;

    if (baseFx && quoteFx) {
      return {
        instrument: `${base}/${quote}`,
        symbol: `${base}${quote}`,
        isForex: true,
        isGold: false,
        isMetal: false,
        supported: true,
        kind: "forex",
      };
    }
    if (baseMetal && quoteFx) {
      const isGold = base === "XAU";
      return {
        instrument: `${base}/${quote}`,
        symbol: `${base}${quote}`,
        isForex: false,
        isGold,
        isMetal: true,
        supported: isGold, // only Gold is supported for now
        kind: "metal",
      };
    }
  }

  // Common index tickers (detected but not yet supported for analysis).
  const INDEX = ["NAS100", "US30", "US500", "SPX500", "GER40", "UK100", "JP225", "US100"];
  if (INDEX.includes(compact)) {
    return {
      instrument: compact,
      symbol: compact,
      isForex: false,
      isGold: false,
      isMetal: false,
      supported: false,
      kind: "index",
    };
  }

  return null;
}

/** Human-readable reason an instrument is not supported. */
export function unsupportedReason(n: NormalizedInstrument): string {
  if (n.kind === "metal" && !n.isGold)
    return `${n.instrument} (${METALS[n.symbol.slice(0, 3)] ?? "metal"}) is recognized, but analysis currently supports Forex pairs and Gold only.`;
  if (n.kind === "index")
    return `${n.instrument} is an index — recognized, but analysis currently supports Forex pairs and Gold only.`;
  return `${n.instrument} isn't a supported market yet. Analysis currently supports Forex pairs and Gold.`;
}
