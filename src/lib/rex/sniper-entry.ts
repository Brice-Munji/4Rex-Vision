/**
 * Rex Sniper Entry — lower-timeframe EXECUTION-CONFIRMATION layer.
 *
 * This is an ADDITIONAL confirmation step on top of an ALREADY-GENERATED
 * directional APA setup. It never generates a new setup, never calls
 * buildTradeSetup(), and never reads/writes trade-setup.ts in any way — the
 * original entry, invalidation, targets, bias, R:R and quality score are
 * fixed inputs here, read-only, never recomputed or overridden.
 *
 * What this module does: given a SEPARATE, user-uploaded M5/M1 (or any
 * genuinely lower-timeframe) chart read, decide whether NOW is a reasonable
 * moment to act on a setup that already exists — or whether that setup has
 * since been structurally invalidated by real price action.
 *
 * Hard rules enforced here (see individual checks below for exactly where):
 *  - Pair must match the original setup's pair, exactly.
 *  - The confirmation chart's timeframe must be GENUINELY lower than the
 *    original's — never the same or a higher timeframe.
 *  - A stale original setup (older than its timeframe's expiry window) is
 *    rejected outright — never confirmed, never re-dated.
 *  - News guard is re-checked fresh (time has passed since generation). A
 *    block is a TIMING caution only — it produces WAITING, never INVALIDATED
 *    (news never structurally invalidates a setup, matching the main APA
 *    engine's own news-is-a-warning-only rule).
 *  - Current price must be reliably extracted (priceAxisLegible + parseable)
 *    — missing/unclear price always means WAITING, never a guess.
 *  - INVALIDATED is reserved strictly for a confirmed numeric breach of the
 *    original invalidationMid by the new chart's own current price — a
 *    PRICE fact, independent of any keyword/evidence signal.
 *  - CONFIRMED requires ALL of: a genuine numeric retest of the original
 *    entry zone, a direction-aligned rejection, AND a direction-aligned
 *    lower-timeframe structure shift (BOS/CHoCH) — together. No single
 *    broad keyword match, and no "3-of-N factors" bypass, is sufficient on
 *    its own (unlike the main APA engine's confluence-factor gate) — missing
 *    or empty evidence is explicitly reported, never silently waved through.
 *  - This function never mutates its `original` input and never returns a
 *    modified copy of it.
 */

import type { NewsGuard } from "@/lib/economicCalendar/blocking";
import { TIMEFRAME_RANK } from "./pair-integrity";

export type SniperEntryState = "WAITING" | "CONFIRMED" | "INVALIDATED";

/** The slice of an already-generated DirectionalSetup needed to confirm it —
 *  read-only; never mutated, never recomputed. */
export interface SniperOriginalSetup {
  /** e.g. "GBPUSD" or "GBP/USD" (either form; normalized internally). */
  pair: string;
  /** The ORIGINAL setup's own timeframe, e.g. "H1", "M15". */
  timeframe: string;
  bias: "Bullish" | "Bearish";
  /** DirectionalSetup.entryZone's own formatted string, e.g. "1.2700 – 1.2710". */
  entryZone: string;
  /** DirectionalSetup.invalidationMid — the structural invalidation point. */
  invalidationMid: number;
  /** ISO timestamp captured client-side the moment this setup was generated. */
  generatedAtIso: string;
}

/** Raw extracted data from the SEPARATE confirmation screenshot. Never run
 *  through buildTradeSetup() — only read for presence/alignment here. */
export interface SniperConfirmationInput {
  pair: string | null;
  symbol: string | null;
  /** "Unknown"/null means not legible — never treated as a match. */
  timeframe: string | null;
  currentPrice: string | null;
  /** Only when true is currentPrice treated as reliably extracted. */
  priceAxisLegible: boolean;
  trendDirection: "Uptrend" | "Downtrend" | "Sideways" | null;
  evidence: { label?: string | null; explanation?: string | null }[];
}

export type SniperEntryResult =
  | { state: "WAITING"; reason: string }
  | { state: "CONFIRMED"; reason: string; evidence: string[] }
  | { state: "INVALIDATED"; reason: string };

/**
 * How long a Sniper Entry confirmation attempt stays valid after the
 * original setup was generated, per the ORIGINAL setup's own timeframe.
 * Deliberately conservative, policy constants (not chart data) — the same
 * kind of fixed timing window the app already uses elsewhere (e.g.
 * NEWS_BLOCK_WINDOW_MIN). The M5/M15/H1 values track the existing
 * HOLDING_HORIZON_BY_TIMEFRAME guidance in trade-setup.ts (read as
 * documentation only — this file does not import from trade-setup.ts).
 */
export const SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME: Record<string, number> = {
  M1: 30,
  M5: 90,
  M15: 360, // 6h
  M30: 180, // 3h
  H1: 1440, // 24h
  H4: 2880, // 48h
  Daily: 10080, // 7d
  Weekly: 43200, // 30d
  Monthly: 129600, // 90d
};
/** Fallback when the original timeframe isn't one of the known labels above. */
const DEFAULT_EXPIRY_MINUTES = 1440;

function normalizePairKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return key.length >= 6 ? key.slice(0, 6) : null;
}

/** True when `tf` is strictly a LOWER (finer) timeframe than `than`. Mirrors
 *  pair-integrity.ts's isHigherTimeframe with the comparison inverted —
 *  reads the existing exported TIMEFRAME_RANK, never redefines it. */
export function isLowerTimeframe(tf: string | null | undefined, than: string | null | undefined): boolean {
  if (!tf || !than) return false;
  const a = TIMEFRAME_RANK.indexOf(tf);
  const b = TIMEFRAME_RANK.indexOf(than);
  return a >= 0 && b >= 0 && a < b;
}

/** True when ANY genuinely-lower timeframe exists at all for `tf` — used by
 *  the UI to decide whether to offer Sniper Entry in the first place (an
 *  M1-originated setup has no lower timeframe in this app's supported set). */
export function hasLowerTimeframeAvailable(tf: string | null | undefined): boolean {
  if (!tf) return false;
  const idx = TIMEFRAME_RANK.indexOf(tf);
  return idx > 0;
}

/**
 * Parse buildTradeSetup()'s own `zone()` output format ("1.2700 – 1.2710")
 * back into numeric bounds. Reads the already-public, stable display string
 * only — never imports from or touches trade-setup.ts.
 */
export function parseZoneBounds(zone: string | null | undefined): { low: number; high: number } | null {
  if (!zone) return null;
  const parts = zone.split("–").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { low: Math.min(parts[0], parts[1]), high: Math.max(parts[0], parts[1]) };
}

function parsePrice(v: string | null): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Evaluate whether an existing directional setup should be treated as
 * WAITING, CONFIRMED, or INVALIDATED, given a separate lower-timeframe
 * confirmation chart read. Pure and deterministic — never mutates `original`.
 */
export function evaluateSniperEntry(
  original: SniperOriginalSetup,
  confirmation: SniperConfirmationInput,
  newsGuard: NewsGuard,
  now: Date = new Date()
): SniperEntryResult {
  // 1. Pair must match the original setup, exactly.
  const originalPair = normalizePairKey(original.pair);
  const confirmationPair = normalizePairKey(confirmation.symbol ?? confirmation.pair);
  if (!originalPair || !confirmationPair || originalPair !== confirmationPair) {
    return {
      state: "WAITING",
      reason:
        "The uploaded chart's pair doesn't match this setup's pair — upload a confirmation screenshot of the SAME pair.",
    };
  }

  // 2. Confirmation timeframe must be legible and GENUINELY lower than the original.
  if (!confirmation.timeframe || confirmation.timeframe === "Unknown") {
    return {
      state: "WAITING",
      reason: "Rex couldn't read the confirmation chart's timeframe — upload a clearer M5 or M1 screenshot.",
    };
  }
  if (!isLowerTimeframe(confirmation.timeframe, original.timeframe)) {
    return {
      state: "WAITING",
      reason: `Upload a timeframe LOWER than the original ${original.timeframe} setup (e.g. M5 or M1) — Sniper Entry confirms with a finer chart, never the same or a higher one.`,
    };
  }

  // 3. Reject a stale original setup outright — never confirmed, never re-dated.
  const generatedAtMs = new Date(original.generatedAtIso).getTime();
  const ageMinutes = Number.isFinite(generatedAtMs) ? (now.getTime() - generatedAtMs) / 60000 : Infinity;
  const expiryMinutes = SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME[original.timeframe] ?? DEFAULT_EXPIRY_MINUTES;
  if (!(ageMinutes >= 0 && ageMinutes <= expiryMinutes)) {
    return {
      state: "WAITING",
      reason: "This setup has expired — generate a fresh analysis before checking Sniper Entry confirmation.",
    };
  }

  // 4. News guard re-checked fresh. A block is a TIMING caution only — it
  //    never structurally invalidates the setup (matches the main engine's
  //    "news is a risk warning, never a direction/validity change" rule).
  if (newsGuard.state === "blocked") {
    return {
      state: "WAITING",
      reason: `High-impact news is approaching${newsGuard.event ? ` (${newsGuard.event})` : ""} — Rex is pausing confirmation, not invalidating the setup.`,
    };
  }

  // 5. Current price must be reliably extracted — never guessed.
  const current = confirmation.priceAxisLegible ? parsePrice(confirmation.currentPrice) : null;
  if (current == null) {
    return {
      state: "WAITING",
      reason: "Rex couldn't reliably read the current price on the confirmation chart — upload a clearer screenshot with a visible price.",
    };
  }

  // 6. Structural invalidation breach — a PRICE fact, checked before any
  //    evidence/keyword signal (irrelevant whether rejection/structure look
  //    fine once the original thesis has already failed on price alone).
  const breached =
    original.bias === "Bullish" ? current <= original.invalidationMid : current >= original.invalidationMid;
  if (breached) {
    return {
      state: "INVALIDATED",
      reason: "Price has broken the original structural invalidation area on the confirmation chart — this setup is no longer valid.",
    };
  }

  // 7. Retest — has price actually come back into the ORIGINAL entry zone?
  //    Numeric, not keyword-based.
  const zoneBounds = parseZoneBounds(original.entryZone);
  if (!zoneBounds) {
    return { state: "WAITING", reason: "Rex couldn't verify the original entry zone for this setup." };
  }
  if (!(current >= zoneBounds.low && current <= zoneBounds.high)) {
    return {
      state: "WAITING",
      reason: "Price hasn't retested the original entry zone yet — Sniper Entry only confirms an ACTUAL retest, never a prediction.",
    };
  }

  // 8. Direction-aligned rejection — requires REAL, non-trivial evidence.
  //    An empty or low-detail read is reported as missing, never waved
  //    through on a single broad keyword.
  const meaningfulEvidence = confirmation.evidence.filter(
    (e) => (e.explanation ?? "").trim().length > 8 || (e.label ?? "").trim().length > 2
  );
  if (meaningfulEvidence.length === 0) {
    return {
      state: "WAITING",
      reason: "The confirmation chart didn't show enough visible price-action evidence to confirm — Rex never confirms from a blank or low-detail read.",
    };
  }
  const text = meaningfulEvidence
    .map((e) => `${e.label ?? ""} ${e.explanation ?? ""}`)
    .join(" ")
    .toLowerCase();
  const hasRejection = /rejection|confirmation|engulf|pin bar|wick|reject/.test(text);
  if (!hasRejection) {
    return {
      state: "WAITING",
      reason: "Price retested the entry zone, but Rex didn't see a clear rejection (wick/pin bar/engulfing) yet — waiting for that before treating this as execution-ready.",
    };
  }

  // 9. Lower-timeframe STRUCTURE SHIFT, aligned to the ORIGINAL direction —
  //    requires BOTH a direction-matching structure read AND an explicit
  //    BOS/CHoCH mention; a single word alone, or evidence describing the
  //    OPPOSITE structure, does not satisfy this.
  const trendDir = (confirmation.trendDirection ?? "").toLowerCase();
  const structureBull = /higher high|higher low|\bhh\b|\bhl\b/.test(text) || trendDir === "uptrend";
  const structureBear = /lower high|lower low|\blh\b|\bll\b/.test(text) || trendDir === "downtrend";
  const bosChoch = /break of structure|\bbos\b|change of character|\bchoch\b|reclaim|flip|broke|breakout|breakdown/.test(
    text
  );
  const structureAligned = original.bias === "Bullish" ? structureBull : structureBear;
  if (!structureAligned || !bosChoch) {
    return {
      state: "WAITING",
      reason: `Price retested with a rejection, but Rex didn't see a clear ${original.bias === "Bullish" ? "bullish" : "bearish"} lower-timeframe structure shift (CHoCH/BOS) yet — waiting for that before confirming.`,
    };
  }

  // All required, independently-checked conditions are positively met.
  return {
    state: "CONFIRMED",
    reason: `Price retested the entry zone with a ${original.bias === "Bullish" ? "bullish" : "bearish"} rejection and a confirming ${confirmation.timeframe} structure shift.`,
    evidence: meaningfulEvidence.map((e) => e.label || e.explanation || "").filter(Boolean),
  };
}
