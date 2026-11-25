/**
 * Synthetic Indices — instrument registry & identification (Sprint 1).
 *
 * Mirrors `src/lib/rex/instruments.ts` in spirit (registry + normalize +
 * unsupportedReason) but is a STRUCTURALLY SEPARATE module — see the
 * Sprint 0 architecture spec §9's isolation requirement. This file imports
 * nothing from `src/lib/rex/`, and nothing in `src/lib/rex/` should ever
 * import from here. That is deliberate: Deriv's synthetic indices are
 * algorithmically generated, trade 24/7, and have no currency exposure —
 * they must never be able to silently fall through into Forex-specific
 * logic (pip/lot sizing, currency correlation, news/economic gating), or
 * vice versa.
 *
 * ── VERIFICATION STATUS — READ BEFORE TRUSTING ANY VALUE BELOW ───────────
 *
 * Every entry in this registry ships with `verified: false`. Sprint 1's
 * plan called for confirming this registry directly against Deriv's live
 * platform/API (a WebSocket `active_symbols` call) before locking final
 * values. That check was attempted — three independent, protocol-correct
 * approaches (native WebSocket, a raw HTTP/1.1 upgrade request with a
 * browser-like Origin header, and the legacy `frontend.binaryws.com`
 * host) — and is NOT possible from this environment: general internet and
 * WebSocket egress both work (confirmed against unrelated hosts), but
 * Deriv's own trading-gateway WebSocket endpoints reject every connection
 * attempt with a Cloudflare 520, consistent with an IP-range block on this
 * environment's outbound address rather than a protocol/header mistake on
 * this end. See the Sprint 1 completion report for the full diagnostic
 * trail. Per the project's own standing instruction, this limitation is
 * reported honestly rather than papered over with a fabricated "verified"
 * status.
 *
 * Every value below is therefore sourced from Sprint 0's best-effort web
 * research only. Two separate fields carry two separate kinds of
 * confidence — read `sourcingNote` on each entry before trusting either:
 *
 *   - `symbol` — a STABLE KEY THIS REGISTRY OWNS, derived from the
 *     instrument's display name (e.g. "VOLATILITY_75"). This is NOT a
 *     claim about Deriv's own API ticker — it exists so this registry
 *     (and the DB row that mirrors it, `SyntheticInstrumentMeta`) has a
 *     primary key that never has to change even if the guess below turns
 *     out to be wrong.
 *   - `derivApiSymbolGuess` — a best-effort guess at Deriv's OWN
 *     wire-protocol ticker (e.g. "R_75"), populated only where Sprint 0's
 *     research found at least a plausible, sourced pattern; `null` where
 *     nothing was found. MUST NOT be used in a live API call until
 *     independently confirmed — nothing in Sprint 1 does this, and no
 *     downstream code should assume it's correct just because it's
 *     present.
 *
 * Scope note: only the tiers/variants with reasonable Sprint 0 sourcing
 * are registered here. Explicitly excluded, pending direct verification
 * before being added (see the Sprint 1 completion report's open
 * questions): Volatility "1s" variants (unclear exactly which tiers
 * exist), Boom/Crash 600/900/50/100/150/200, Multi-Step/Skew-Step indices,
 * and anything else outside the Product Decisions' explicit scope. Do not
 * add a new entry here on the strength of general knowledge alone —
 * follow the same sourcing-note discipline as the rest of this file, or
 * verify directly against Deriv's platform/API first.
 */

export type SyntheticCategory =
  | "VOLATILITY"
  | "BOOM_CRASH"
  | "STEP"
  | "JUMP"
  | "RANGE_BREAK";

export const SYNTHETIC_CATEGORIES: readonly SyntheticCategory[] = [
  "VOLATILITY",
  "BOOM_CRASH",
  "STEP",
  "JUMP",
  "RANGE_BREAK",
];

export interface SyntheticInstrument {
  /** Canonical registry key, owned by this module — see the module header. */
  symbol: string;
  /** Human-readable name, as it would plausibly appear on-chart. */
  displayName: string;
  /** Other text forms the same instrument might appear as in a chart
   *  screenshot or vision-model transcription (e.g. "VOL75", "V75").
   *  Matching is case/whitespace/punctuation-insensitive — see
   *  `normalizeSyntheticInstrument()`. */
  aliases: string[];
  category: SyntheticCategory;
  /** Best-effort guess at Deriv's own API ticker — see the module header.
   *  `null` where Sprint 0 found no sourced pattern at all. */
  derivApiSymbolGuess: string | null;
  /** Always `false` in this sprint's registry — live verification against
   *  Deriv's platform/API was attempted and found unavailable from this
   *  environment. See the module header and the Sprint 1 completion
   *  report. Treat this as the authoritative "can this be trusted" gate. */
  verified: boolean;
  /** Free-text sourcing/confidence note carried forward from the Sprint 0
   *  research, for anyone reviewing or re-verifying this entry. */
  sourcingNote: string;
}

const VOLATILITY_SOURCING_NOTE =
  "Tier (10/25/50/75/100) and the R_{N} ticker pattern are corroborated by 3+ independent Sprint 0 sources, " +
  "including one Deriv-API-documentation-sourced search result (Sprint 0 spec §5.1) — the strongest sourcing " +
  "tier in this registry. Not independently confirmed against a live source this sprint; see module header.";

const BOOM_CRASH_SOURCING_NOTE = (family: "Boom" | "Crash") =>
  `300/500/1000 is the one Boom/Crash tier set every Sprint 0 source agreed on (spec §5.2). The ${family}{N} ` +
  "ticker pattern (no underscore) is a trading-community convention only — explicitly NOT confirmed via an " +
  "official source. Tiers 600/900/50/100/150/200 appeared in weaker or single-source mentions and are " +
  "deliberately excluded from this registry pending direct verification — see the Sprint 1 completion report.";

const JUMP_SOURCING_NOTE =
  "Jump 10/25/50/75/100 was the cleanest, most consistent result across Sprint 0's sources — matches the " +
  "requested scope exactly (spec §5.4). The JD{N} ticker pattern is a trading-community citation only, not " +
  "officially confirmed.";

const STEP_SOURCING_NOTE =
  "The single classic Step Index is referenced consistently and unanimously across Sprint 0's sources (spec " +
  "§5.3). The stpRNG ticker is a trading-community citation only, not officially confirmed. Newer 'Multi Step' " +
  "and 'Skew Step' product lines were also surfaced but are explicitly out of scope for this registry per the " +
  "Sprint 0 recommendation — they need their own product decision, not a silent addition.";

const RANGE_BREAK_SOURCING_NOTE =
  "Unanimous, zero-conflict agreement across every Sprint 0 source that exactly these two variants exist " +
  "(spec §5.5) — the strongest EXISTENCE confidence of all five families. However, no source gave even a " +
  "community-convention ticker guess, so derivApiSymbolGuess is deliberately left null rather than invented.";

export const SYNTHETIC_INSTRUMENTS: readonly SyntheticInstrument[] = [
  // ── Volatility Indices ────────────────────────────────────────────────
  {
    symbol: "VOLATILITY_10",
    displayName: "Volatility 10 Index",
    aliases: ["Volatility 10", "VOL10", "V10"],
    category: "VOLATILITY",
    derivApiSymbolGuess: "R_10",
    verified: false,
    sourcingNote: VOLATILITY_SOURCING_NOTE,
  },
  {
    symbol: "VOLATILITY_25",
    displayName: "Volatility 25 Index",
    aliases: ["Volatility 25", "VOL25", "V25"],
    category: "VOLATILITY",
    derivApiSymbolGuess: "R_25",
    verified: false,
    sourcingNote: VOLATILITY_SOURCING_NOTE,
  },
  {
    symbol: "VOLATILITY_50",
    displayName: "Volatility 50 Index",
    aliases: ["Volatility 50", "VOL50", "V50"],
    category: "VOLATILITY",
    derivApiSymbolGuess: "R_50",
    verified: false,
    sourcingNote: VOLATILITY_SOURCING_NOTE,
  },
  {
    symbol: "VOLATILITY_75",
    displayName: "Volatility 75 Index",
    aliases: ["Volatility 75", "VOL75", "V75"],
    category: "VOLATILITY",
    derivApiSymbolGuess: "R_75",
    verified: false,
    sourcingNote: VOLATILITY_SOURCING_NOTE,
  },
  {
    symbol: "VOLATILITY_100",
    displayName: "Volatility 100 Index",
    aliases: ["Volatility 100", "VOL100", "V100"],
    category: "VOLATILITY",
    derivApiSymbolGuess: "R_100",
    verified: false,
    sourcingNote: VOLATILITY_SOURCING_NOTE,
  },

  // ── Boom & Crash ─────────────────────────────────────────────────────
  {
    symbol: "BOOM_300",
    displayName: "Boom 300 Index",
    aliases: ["Boom 300", "BOOM300"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "BOOM300",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Boom"),
  },
  {
    symbol: "BOOM_500",
    displayName: "Boom 500 Index",
    aliases: ["Boom 500", "BOOM500"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "BOOM500",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Boom"),
  },
  {
    symbol: "BOOM_1000",
    displayName: "Boom 1000 Index",
    aliases: ["Boom 1000", "BOOM1000"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "BOOM1000",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Boom"),
  },
  {
    symbol: "CRASH_300",
    displayName: "Crash 300 Index",
    aliases: ["Crash 300", "CRASH300"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "CRASH300",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Crash"),
  },
  {
    symbol: "CRASH_500",
    displayName: "Crash 500 Index",
    aliases: ["Crash 500", "CRASH500"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "CRASH500",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Crash"),
  },
  {
    symbol: "CRASH_1000",
    displayName: "Crash 1000 Index",
    aliases: ["Crash 1000", "CRASH1000"],
    category: "BOOM_CRASH",
    derivApiSymbolGuess: "CRASH1000",
    verified: false,
    sourcingNote: BOOM_CRASH_SOURCING_NOTE("Crash"),
  },

  // ── Step Index ───────────────────────────────────────────────────────
  {
    symbol: "STEP_INDEX",
    displayName: "Step Index",
    aliases: ["Step", "stpRNG"],
    category: "STEP",
    derivApiSymbolGuess: "stpRNG",
    verified: false,
    sourcingNote: STEP_SOURCING_NOTE,
  },

  // ── Jump Indices ─────────────────────────────────────────────────────
  {
    symbol: "JUMP_10",
    displayName: "Jump 10 Index",
    aliases: ["Jump 10", "JD10", "J10"],
    category: "JUMP",
    derivApiSymbolGuess: "JD10",
    verified: false,
    sourcingNote: JUMP_SOURCING_NOTE,
  },
  {
    symbol: "JUMP_25",
    displayName: "Jump 25 Index",
    aliases: ["Jump 25", "JD25", "J25"],
    category: "JUMP",
    derivApiSymbolGuess: "JD25",
    verified: false,
    sourcingNote: JUMP_SOURCING_NOTE,
  },
  {
    symbol: "JUMP_50",
    displayName: "Jump 50 Index",
    aliases: ["Jump 50", "JD50", "J50"],
    category: "JUMP",
    derivApiSymbolGuess: "JD50",
    verified: false,
    sourcingNote: JUMP_SOURCING_NOTE,
  },
  {
    symbol: "JUMP_75",
    displayName: "Jump 75 Index",
    aliases: ["Jump 75", "JD75", "J75"],
    category: "JUMP",
    derivApiSymbolGuess: "JD75",
    verified: false,
    sourcingNote: JUMP_SOURCING_NOTE,
  },
  {
    symbol: "JUMP_100",
    displayName: "Jump 100 Index",
    aliases: ["Jump 100", "JD100", "J100"],
    category: "JUMP",
    derivApiSymbolGuess: "JD100",
    verified: false,
    sourcingNote: JUMP_SOURCING_NOTE,
  },

  // ── Range Break Indices ──────────────────────────────────────────────
  {
    symbol: "RANGE_BREAK_100",
    displayName: "Range Break 100 Index",
    aliases: ["Range Break 100", "RB100"],
    category: "RANGE_BREAK",
    derivApiSymbolGuess: null,
    verified: false,
    sourcingNote: RANGE_BREAK_SOURCING_NOTE,
  },
  {
    symbol: "RANGE_BREAK_200",
    displayName: "Range Break 200 Index",
    aliases: ["Range Break 200", "RB200"],
    category: "RANGE_BREAK",
    derivApiSymbolGuess: null,
    verified: false,
    sourcingNote: RANGE_BREAK_SOURCING_NOTE,
  },
];

/** Uppercase + strip every non-alphanumeric character, so "R_75", "r-75",
 *  "R 75" and "R75" all collapse to the same comparison key. Deliberately
 *  simple/explicit rather than clever (e.g. no special-cased "Index"-suffix
 *  stripping) — matches this codebase's existing `instruments.ts` style;
 *  any alias form that needs to match is listed explicitly above instead. */
function compact(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

interface RegistryIndexEntry {
  key: string;
  instrument: SyntheticInstrument;
}

function buildIndex(): RegistryIndexEntry[] {
  const entries: RegistryIndexEntry[] = [];
  for (const instrument of SYNTHETIC_INSTRUMENTS) {
    const candidates = new Set<string>();
    candidates.add(compact(instrument.symbol));
    candidates.add(compact(instrument.displayName));
    if (instrument.derivApiSymbolGuess) candidates.add(compact(instrument.derivApiSymbolGuess));
    for (const alias of instrument.aliases) candidates.add(compact(alias));
    for (const key of candidates) {
      if (key) entries.push({ key, instrument });
    }
  }
  return entries;
}

const REGISTRY_INDEX = buildIndex();

export interface NormalizedSyntheticInstrument {
  /** The full registry entry that matched. */
  instrument: SyntheticInstrument;
  symbol: string;
  displayName: string;
  category: SyntheticCategory;
  /** Always `false` this sprint — see `SyntheticInstrument.verified`. */
  verified: boolean;
}

/**
 * Resolves a raw, free-text instrument name/symbol (as read from a chart or
 * transcribed by a vision model) against the synthetic-indices registry
 * ONLY. Returns `null` for anything unrecognized — including every Forex
 * pair, metal, or traditional equity index. This function must NEVER call
 * or fall back to `src/lib/rex/instruments.ts`'s `normalizeInstrument()`
 * (the Forex gate) — see the Sprint 0 spec §9's isolation requirement.
 */
export function normalizeSyntheticInstrument(
  raw: string | null | undefined
): NormalizedSyntheticInstrument | null {
  if (!raw) return null;
  const key = compact(raw);
  if (!key) return null;

  const match = REGISTRY_INDEX.find((entry) => entry.key === key);
  if (!match) return null;

  return {
    instrument: match.instrument,
    symbol: match.instrument.symbol,
    displayName: match.instrument.displayName,
    category: match.instrument.category,
    verified: match.instrument.verified,
  };
}

/** Looks up a registered instrument by its canonical `symbol` key. */
export function lookupSyntheticInstrumentBySymbol(symbol: string): SyntheticInstrument | null {
  return SYNTHETIC_INSTRUMENTS.find((i) => i.symbol === symbol) ?? null;
}

/** Lists every registered instrument in one category, in registry order. */
export function listSyntheticInstrumentsByCategory(
  category: SyntheticCategory
): SyntheticInstrument[] {
  return SYNTHETIC_INSTRUMENTS.filter((i) => i.category === category);
}

/** Human-readable reason a raw instrument string wasn't recognized. Mirrors
 *  `rex/instruments.ts`'s `unsupportedReason()` in spirit; the signature
 *  differs because this registry has no "recognized but unsupported" tier
 *  of its own — an instrument is either in the registry (supported) or not
 *  recognized at all (this function's only case). Deliberately does not
 *  special-case known-but-out-of-scope Deriv products (e.g. "Volatility
 *  150 Index", "Multi Step Indices") with a more specific message — doing
 *  so would mean encoding more unverified Sprint 0 guesses into permanent
 *  code than this sprint's scope calls for; see the module header. */
export function unsupportedReason(raw: string): string {
  const supportedList = SYNTHETIC_INSTRUMENTS.map((i) => i.displayName).join(", ");
  return `"${raw}" was not recognized as a supported synthetic index. 4RexVision currently supports: ${supportedList}. If this is a different or newer Deriv synthetic index, it may not be supported yet.`;
}
