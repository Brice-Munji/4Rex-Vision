/**
 * Position sizing — Account Risk (Rex Scalping Sprint).
 *
 * Pure, dependency-free, deterministic. Computes lot size from REAL inputs
 * only — account balance and risk % (user-supplied), plus the ALREADY
 * VALIDATED setup's own entry/invalidation prices (never re-derived, never
 * invented) — against a documented, fixed contract specification.
 *
 * Never fabricates pip value, spread/commission, or broker minimum-volume
 * data. When the pair's pip value isn't reliably known without a live
 * non-USD conversion rate (which Rex doesn't fetch), sizing is explicitly
 * rejected with a clear reason rather than guessed (Rule: never invent
 * chart prices, indicators, or trade levels).
 */

/** Default planned risk per trade — user-configurable, this is only the default. */
export const DEFAULT_RISK_PERCENT = 0.5;
/** Common retail-broker minimum lot size ("micro lot"). A broker may set a
 *  higher floor; this is the typical minimum, documented not invented. */
export const DEFAULT_MIN_VOLUME_LOTS = 0.01;

const STANDARD_LOT_UNITS = 100_000; // 1 standard forex lot
const XAU_LOT_OUNCES = 100; // 1 standard XAU/USD lot (common retail convention)

export interface PositionSizeInput {
  /** e.g. "EURUSD", "XAUUSD" (separators are stripped). */
  pair: string;
  /** Account currency balance — assumed USD. */
  accountBalance: number;
  /** Planned risk for this trade, as a percent of balance. */
  riskPercent?: number;
  /** The validated setup's own entry price (e.g. DirectionalSetup.entryMid). */
  entryPrice: number;
  /** The validated setup's own invalidation price (e.g. invalidationMid). */
  invalidationPrice: number;
  /** Broker's minimum tradeable volume, in lots. */
  minVolumeLots?: number;
}

export type PositionSizeResult =
  | {
      ok: true;
      riskAmount: number;
      stopDistance: number;
      pipSize: number;
      stopPips: number;
      pipValuePerLot: number;
      lots: number;
      /** Always shown alongside the result — a known, honest limitation. */
      note: string;
    }
  | { ok: false; reason: string };

/**
 * Pip size + pip value per standard lot, in USD, for a supported pair.
 * Returns null when the quote currency isn't USD — that pip value would
 * require a live conversion rate this app doesn't fetch, so it's rejected
 * rather than guessed.
 */
function usdPipSpec(pair: string): { pipSize: number; pipValuePerLot: number } | null {
  const clean = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (clean.length !== 6) return null;
  const base = clean.slice(0, 3);
  const quote = clean.slice(3, 6);
  if (quote !== "USD") return null;

  if (base === "XAU") {
    const pipSize = 0.01;
    return { pipSize, pipValuePerLot: XAU_LOT_OUNCES * pipSize };
  }
  const pipSize = 0.0001;
  return { pipSize, pipValuePerLot: STANDARD_LOT_UNITS * pipSize };
}

/**
 * Compute a planned-risk position size. Only succeeds when the account
 * inputs, stop distance, and the pair's pip value are all known — never
 * forces a result, and rejects (with a clear reason) when the calculated
 * size falls below the broker's minimum tradeable volume.
 */
export function computePositionSize(input: PositionSizeInput): PositionSizeResult {
  const riskPercent = input.riskPercent ?? DEFAULT_RISK_PERCENT;
  const minVolumeLots = input.minVolumeLots ?? DEFAULT_MIN_VOLUME_LOTS;

  if (!Number.isFinite(input.accountBalance) || input.accountBalance <= 0) {
    return { ok: false, reason: "Enter a valid account balance to calculate position size." };
  }
  if (!Number.isFinite(riskPercent) || riskPercent <= 0) {
    return { ok: false, reason: "Risk % must be greater than 0." };
  }

  const stopDistance = Math.abs(input.entryPrice - input.invalidationPrice);
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) {
    return { ok: false, reason: "Stop distance is zero or unknown — can't size a position." };
  }

  const spec = usdPipSpec(input.pair);
  if (!spec) {
    return {
      ok: false,
      reason: `Pip value for ${input.pair} isn't reliably known without a live non-USD conversion rate — Rex doesn't fetch FX rates, so position size can't be calculated for this pair yet.`,
    };
  }

  const riskAmount = input.accountBalance * (riskPercent / 100);
  const stopPips = stopDistance / spec.pipSize;
  const lotsRaw = riskAmount / (stopPips * spec.pipValuePerLot);
  const lots = Math.round(lotsRaw * 100) / 100; // broker 0.01-lot granularity

  if (lots < minVolumeLots) {
    return {
      ok: false,
      reason: `Calculated position size (${lotsRaw.toFixed(3)} lots) is below the broker's ${minVolumeLots}-lot minimum for a ${riskPercent}% risk budget on this stop distance — increase account balance/risk % or accept more risk than planned.`,
    };
  }

  return {
    ok: true,
    riskAmount,
    stopDistance,
    pipSize: spec.pipSize,
    stopPips,
    pipValuePerLot: spec.pipValuePerLot,
    lots,
    note: "Excludes spread/commission — actual risk may be slightly higher. Verify against your broker's exact contract specification before sizing a live trade.",
  };
}
