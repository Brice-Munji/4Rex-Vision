/**
 * Rex Trade Setup — derives educational trade-planning ZONES from a completed
 * analysis. Pure and deterministic (no AI call, no randomness): given the
 * report's price levels, bias, confidence and economic context it produces
 * entry/invalidation/target zones, an R:R estimate, a quality grade and a
 * news-risk read.
 *
 * This never emits "BUY NOW" / "SELL NOW" / guaranteed signals — only zones and
 * a directional bias. Below the confidence floor it returns `available: false`
 * with the required message.
 *
 * Kept free of `server-only` so the Pro-gated API route can run it; the UI
 * never calls it directly (generation is gated server-side).
 */

export type SetupBias = "Bullish" | "Bearish" | "Neutral";
export type SetupQuality = "A+" | "A" | "B" | "C";
export type SetupNewsRisk = "Low" | "Medium" | "High";

/** Compact analysis snapshot the setup is derived from. */
export interface TradeSetupInput {
  pair: string;
  timeframe: string | null;
  bias: string | null;
  confidence: number | null;
  currentPrice?: string | null;
  priceLevels: { type: string; value: string }[];
  economicImpacts?: string[]; // ["High","Medium","Low",...]
}

export interface TradeSetup {
  available: true;
  bias: SetupBias;
  entryZone: string; // "1.0870 – 1.0900"
  invalidationZone: string;
  target1: string;
  target2: string;
  riskReward: string; // "1:2.1"
  quality: SetupQuality;
  newsRisk: SetupNewsRisk;
  confidence: number;
  // Numeric mid-points (for saving into the Smart Journal).
  entryMid: number;
  invalidationMid: number;
  target1Mid: number;
  target2Mid: number;
  rr1: number;
  rr2: number;
}

export interface TradeSetupUnavailable {
  available: false;
  reason: string;
}

export type TradeSetupResult = TradeSetup | TradeSetupUnavailable;

export const SETUP_CONFIDENCE_FLOOR = 65;
export const SETUP_UNCLEAR_MESSAGE =
  "Rex cannot generate a high-quality trade setup because the chart structure is unclear.";
export const SETUP_DISCLAIMER =
  "Rex Trade Setup provides educational trade-planning zones, not financial advice.";

function parseNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : null;
}

function decimalsOf(s: string | null | undefined): number {
  const m = String(s ?? "").match(/\.(\d+)/);
  return m ? Math.min(m[1].length, 6) : 2;
}

function fmt(n: number, d: number): string {
  return n.toFixed(d);
}

function zone(a: number, b: number, d: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${fmt(lo, d)} – ${fmt(hi, d)}`;
}

function normalizeBias(b: string | null): SetupBias {
  return b === "Bullish" || b === "Bearish" || b === "Neutral" ? b : "Neutral";
}

function deriveNewsRisk(impacts?: string[]): SetupNewsRisk {
  const set = (impacts ?? []).map((i) => i.toLowerCase());
  if (set.includes("high")) return "High";
  if (set.includes("medium")) return "Medium";
  return "Low";
}

function deriveQuality(
  confidence: number,
  rr1: number,
  news: SetupNewsRisk
): SetupQuality {
  let score = confidence;
  if (rr1 >= 2) score += 6;
  else if (rr1 >= 1.5) score += 3;
  else if (rr1 < 1) score -= 6;
  if (news === "High") score -= 8;
  else if (news === "Medium") score -= 3;

  if (score >= 88) return "A+";
  if (score >= 80) return "A";
  if (score >= 72) return "B";
  return "C";
}

/**
 * Build the trade setup from a completed analysis. Returns an "unavailable"
 * result (with the mandated message) when confidence is below the floor or the
 * chart lacks any anchorable structure.
 */
export function buildTradeSetup(input: TradeSetupInput): TradeSetupResult {
  const confidence = typeof input.confidence === "number" ? input.confidence : 0;
  if (confidence < SETUP_CONFIDENCE_FLOOR) {
    return { available: false, reason: SETUP_UNCLEAR_MESSAGE };
  }

  const levelStr = (t: string) =>
    input.priceLevels.find((l) => l.type === t)?.value ?? null;
  const find = (t: string) => parseNum(levelStr(t));

  let entry = find("Entry");
  let inval = find("Invalidation");
  let t1 = find("Take Profit");
  const resistance = find("Resistance");
  const support = find("Support");
  const current = parseNum(input.currentPrice ?? null);
  const bias = normalizeBias(input.bias);

  // Anchor the entry: prefer an explicit Entry level, then current price, then
  // the midpoint of support/resistance. No anchor → treat as unclear.
  if (entry == null) {
    entry = current ?? (resistance != null && support != null ? (resistance + support) / 2 : null);
  }
  if (entry == null) {
    return { available: false, reason: SETUP_UNCLEAR_MESSAGE };
  }
  const E = entry;
  const dec = decimalsOf(levelStr("Entry") ?? input.currentPrice ?? String(E));

  // Trade direction: bias first, else infer from the levels.
  let sign = bias === "Bearish" ? -1 : bias === "Bullish" ? 1 : 0;
  if (sign === 0) {
    if (t1 != null && t1 !== E) sign = Math.sign(t1 - E);
    else if (resistance != null && support != null)
      sign = Math.abs(resistance - E) <= Math.abs(E - support) ? 1 : -1;
    else sign = 1;
  }

  // Invalidation: explicit level, else opposite-side structure, else a small %.
  if (inval == null) {
    inval =
      sign > 0
        ? support != null && support < E
          ? support
          : E * (1 - 0.006)
        : resistance != null && resistance > E
          ? resistance
          : E * (1 + 0.006);
  }
  let risk = Math.abs(E - inval);
  if (risk <= 0) risk = E * 0.005;

  // Target 1: explicit take-profit, else a 2R projection.
  if (t1 == null) t1 = E + sign * 2 * risk;
  const reward1 = Math.abs(t1 - E);

  // Target 2: a measured extension beyond target 1.
  let t2 = E + sign * Math.max(reward1 * 1.6, risk * 3);
  if (sign > 0 && t2 <= t1) t2 = t1 + reward1 * 0.6;
  if (sign < 0 && t2 >= t1) t2 = t1 - reward1 * 0.6;
  const reward2 = Math.abs(t2 - E);

  const rr1 = reward1 / risk;
  const rr2 = reward2 / risk;

  const entryBand = Math.max(risk * 0.12, E * 0.0004);
  const invBand = Math.max(risk * 0.08, E * 0.0003);
  const tBand = Math.max(risk * 0.1, E * 0.0004);

  const newsRisk = deriveNewsRisk(input.economicImpacts);
  const quality = deriveQuality(confidence, rr1, newsRisk);

  return {
    available: true,
    bias,
    entryZone: zone(E - entryBand, E + entryBand, dec),
    invalidationZone: zone(inval - invBand, inval + invBand, dec),
    target1: zone(t1 - tBand, t1 + tBand, dec),
    target2: zone(t2 - tBand, t2 + tBand, dec),
    riskReward: `1:${rr1.toFixed(1)}`,
    quality,
    newsRisk,
    confidence: Math.round(confidence),
    entryMid: E,
    invalidationMid: inval,
    target1Mid: t1,
    target2Mid: t2,
    rr1,
    rr2,
  };
}
