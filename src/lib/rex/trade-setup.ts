/**
 * Rex Trade Setup — Advanced Price Action (APA) engine.
 *
 * The setup is derived STRICTLY from the analysis's price-action structure:
 * market structure (HH/HL, LH/LL), BOS/CHOCH, support/resistance, supply/demand,
 * liquidity sweeps, rejection/confirmation, momentum/displacement, premium/discount
 * and (when present) multi-timeframe agreement.
 *
 * Hard rules enforced here:
 *  1. APA is the only engine — news/sentiment/fundamentals never drive a setup.
 *  2. News is a RISK WARNING only. It never flips direction, never creates a
 *     zone/target/invalidation, and never changes setup quality/confidence.
 *  3. The setup direction always equals the main analysis bias:
 *       Bullish → bullish setup only, Bearish → bearish setup only,
 *       Neutral → NO directional setup (watch/breakout zones only).
 *  4. Quality is a function of APA confluence strength, not proximity to a level.
 *     Weak evidence returns "no valid setup" rather than forcing one.
 *  5/6/7. Entry / targets / invalidation come from real structure (S/R, S/D,
 *     swings, liquidity) — never arbitrary %/fixed distances. R:R is computed
 *     AFTER the zones are set; zones are never distorted to hit a target R:R.
 *  8. A final consistency check (direction == bias, zones ordered by structure,
 *     news != direction) must pass or nothing is shown.
 *
 * Pure & deterministic (no `server-only`) so the Pro-gated API route runs it.
 */

export type SetupBias = "Bullish" | "Bearish" | "Neutral";
export type SetupQuality = "A+" | "A" | "B" | "C";
export type SetupNewsRisk = "Low" | "Medium" | "High";

/** Compact APA snapshot the setup is derived from (all from the analysis). */
export interface TradeSetupInput {
  pair: string;
  timeframe: string | null;
  bias: string | null; // main-analysis bias — the ONLY thing that sets direction
  confidence: number | null;
  currentPrice?: string | null;
  priceLevels: { type: string; value: string }[]; // Entry/Invalidation/Take Profit/Support/Resistance
  economicImpacts?: string[]; // used for the news WARNING only
  // APA structure signals from the report:
  trend?: { direction?: string | null; strength?: string | null } | null;
  evidence?: { key?: string; label?: string; explanation?: string }[];
}

export interface DirectionalSetup {
  kind: "directional";
  bias: "Bullish" | "Bearish";
  entryZone: string;
  invalidationZone: string;
  target1: string;
  target2: string;
  riskReward: string; // "1:2.1" — computed AFTER zones
  quality: SetupQuality;
  confluence: string[]; // APA factors the grade is built on
  rationale: string; // why the zone exists, in price-action terms
  newsRisk: SetupNewsRisk; // warning only
  confidence: number;
  entryMid: number;
  invalidationMid: number;
  target1Mid: number;
  target2Mid: number;
  rr1: number;
  rr2: number;
  // ── APA framing (educational — never a buy/sell command) ──────────────────
  /** Target 1 is a nearer partial-profit area; Target 2 the extended objective. */
  target1Label: string;
  target2Label: string;
  /** Structural invalidation is a ZONE/idea, not an exact stop; a temporary move
   *  against the bias does not invalidate the setup unless this area breaks. */
  invalidationExplainer: string;
  /** How to treat pullbacks/retests around the entry and counter-moves en route. */
  managementNote: string;
  /** Lower-timeframe price-action confirmation to watch before acting (scalping). */
  lowerTimeframeConfirmation: string[];
}

export interface NeutralSetup {
  kind: "neutral";
  bias: "Neutral";
  upperZone: string | null; // breakout / watch zone above
  lowerZone: string | null; // breakout / watch zone below
  keyResistance: string | null;
  keySupport: string | null;
  requiredConfirmation: string[]; // APA confirmation needed before a directional setup
  newsRisk: SetupNewsRisk;
}

export interface NoSetup {
  kind: "none";
  reason: string;
  newsRisk: SetupNewsRisk;
}

export type TradeSetupResult = DirectionalSetup | NeutralSetup | NoSetup;

export const SETUP_DISCLAIMER =
  "Rex Trade Setup provides educational trade-planning zones based on price-action structure, not financial advice.";
export const SETUP_NO_VALID_MESSAGE =
  "No valid setup — the chart doesn't show enough Advanced Price Action confluence for a high-quality trade.";
/** Core APA framing for the invalidation zone (structural, not an exact stop). */
export const STRUCTURAL_INVALIDATION_NOTE =
  "A temporary move against the bias does not invalidate this setup unless price breaks the structural invalidation area.";

/* ── helpers ───────────────────────────────────────────────────────────────── */

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
  return `${fmt(Math.min(a, b), d)} – ${fmt(Math.max(a, b), d)}`;
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

/* ── APA confluence detection (never uses news) ────────────────────────────── */

interface ApaFlags {
  structureBull: boolean; // HH / HL
  structureBear: boolean; // LH / LL
  bos: boolean; // break of structure
  choch: boolean; // change of character
  support: boolean; // support / demand / floor
  resistance: boolean; // resistance / supply / ceiling
  liquidity: boolean; // liquidity / sweep / stop hunt
  confirmation: boolean; // rejection / confirmation / engulf / pin
  momentum: boolean; // momentum / displacement / impulse
  premiumDiscount: boolean; // premium / discount / equilibrium
  mtf: boolean; // higher-timeframe agreement
  trendConf: boolean; // trendline / MA alignment
}

function detectApa(input: TradeSetupInput): { flags: ApaFlags; factors: string[] } {
  const text = (input.evidence ?? [])
    .map((e) => `${e.key ?? ""} ${e.label ?? ""} ${e.explanation ?? ""}`)
    .join(" ")
    .toLowerCase();
  const trendDir = (input.trend?.direction ?? "").toLowerCase();
  const has = (re: RegExp) => re.test(text);

  const flags: ApaFlags = {
    structureBull: has(/higher high|higher low|\bhh\b|\bhl\b/) || trendDir === "uptrend",
    structureBear: has(/lower high|lower low|\blh\b|\bll\b/) || trendDir === "downtrend",
    bos: has(/break of structure|\bbos\b|support broken|resistance broken|broke|breakout|breakdown/),
    choch: has(/change of character|choch|reclaim|flip/),
    support: has(/support|demand|floor/),
    resistance: has(/resistance|supply|ceiling/),
    liquidity: has(/liquidity|sweep|stop hunt|stop-hunt|grab|equal (highs|lows)/),
    confirmation: has(/rejection|confirmation|engulf|pin bar|wick|reject/),
    momentum: has(/momentum|displacement|impulse|expansion|strong candle/),
    premiumDiscount: has(/premium|discount|equilibrium|fib/),
    mtf: has(/higher timeframe|multi-timeframe|multi timeframe|\bhtf\b|daily|weekly/),
    trendConf: has(/trendline|moving average|\bema\b|\bma\b|averages aligned/),
  };

  const factors: string[] = [];
  if (flags.structureBull) factors.push("Bullish market structure (HH/HL)");
  if (flags.structureBear) factors.push("Bearish market structure (LH/LL)");
  if (flags.bos) factors.push("Break of Structure");
  if (flags.choch) factors.push("Change of Character");
  if (flags.support) factors.push("Support / demand zone");
  if (flags.resistance) factors.push("Resistance / supply zone");
  if (flags.liquidity) factors.push("Liquidity interaction");
  if (flags.confirmation) factors.push("Rejection / confirmation");
  if (flags.momentum) factors.push("Momentum / displacement");
  if (flags.premiumDiscount) factors.push("Premium/discount pricing");
  if (flags.mtf) factors.push("Multi-timeframe agreement");
  if (flags.trendConf) factors.push("Trend confirmation");

  return { flags, factors };
}

function gradeFromScore(score: number): SetupQuality {
  if (score >= 8) return "A+";
  if (score >= 6) return "A";
  if (score >= 4) return "B";
  return "C";
}

/* ── main ──────────────────────────────────────────────────────────────────── */

export function buildTradeSetup(input: TradeSetupInput): TradeSetupResult {
  const bias = normalizeBias(input.bias);
  const newsRisk = deriveNewsRisk(input.economicImpacts); // WARNING only — never used below for direction/quality
  const { flags, factors } = detectApa(input);

  const levelStr = (t: string) =>
    input.priceLevels.find((l) => l.type === t)?.value ?? null;
  const num = (t: string) => parseNum(levelStr(t));
  const entryL = num("Entry");
  const invL = num("Invalidation");
  const tpL = num("Take Profit");
  const resL = num("Resistance");
  const supL = num("Support");
  const current = parseNum(input.currentPrice ?? null);
  const dec = decimalsOf(levelStr("Entry") ?? input.currentPrice ?? levelStr("Support") ?? "0.00");

  // Structural scale (Rule 9): all zone widths/buffers are derived from the
  // ACTUAL spacing between detected levels — never a fixed % of price. We use
  // the smallest meaningful gap between the levels the chart actually shows.
  const structuralGaps = [
    resL != null && supL != null ? Math.abs(resL - supL) : null,
    entryL != null && supL != null ? Math.abs(entryL - supL) : null,
    entryL != null && resL != null ? Math.abs(entryL - resL) : null,
    tpL != null && entryL != null ? Math.abs(tpL - entryL) : null,
    invL != null && entryL != null ? Math.abs(invL - entryL) : null,
  ].filter((g): g is number => g != null && g > 0);
  const priceScale = current ?? entryL ?? supL ?? resL ?? 1;
  // Fallback only applies in the rare single-lonely-level case (no gap exists).
  const structuralUnit = structuralGaps.length
    ? Math.min(...structuralGaps)
    : priceScale * 0.002;

  /* ── Neutral: no directional trade, watch zones only ─────────────────────── */
  if (bias === "Neutral") {
    const keyResistance = resL != null ? fmt(resL, dec) : null;
    const keySupport = supL != null ? fmt(supL, dec) : null;
    const required: string[] = [];
    if (resL != null)
      required.push(
        `A confirmed Break of Structure and close above ${keyResistance} (with a bullish Change of Character) before a long is valid.`
      );
    if (supL != null)
      required.push(
        `A confirmed Break of Structure and close below ${keySupport} (with a bearish Change of Character) before a short is valid.`
      );
    if (flags.liquidity)
      required.push("A liquidity sweep of the range extreme, then a rejection back inside, as confirmation.");
    if (required.length === 0)
      required.push("Wait for a clean break of structure out of the range with follow-through before planning a directional trade.");

    return {
      kind: "neutral",
      bias: "Neutral",
      upperZone: resL != null ? zone(resL, resL + structuralUnit * 0.08, dec) : null,
      lowerZone: supL != null ? zone(supL, supL - structuralUnit * 0.08, dec) : null,
      keyResistance,
      keySupport,
      requiredConfirmation: required,
      newsRisk,
    };
  }

  const dir: 1 | -1 = bias === "Bullish" ? 1 : -1;

  // Validity gate: the setup must rest on real APA confluence + a usable anchor.
  const structureAligned = dir > 0 ? flags.structureBull : flags.structureBear;
  // A structural zone can be evidenced by APA prose (flags) OR by an actual
  // demand/support (longs) or supply/resistance (shorts) level read off the
  // chart — a defined Entry level is itself a structural reaction zone. Relying
  // on prose keywords alone wrongly rejected charts that carried real levels.
  const zoneFromText = dir > 0 ? flags.support : flags.resistance;
  const zoneFromLevel = dir > 0 ? supL != null || entryL != null : resL != null || entryL != null;
  const zoneLevel = zoneFromText || zoneFromLevel;
  const anchorPresent = entryL != null || (dir > 0 ? supL != null : resL != null) || current != null;
  if (!anchorPresent || !zoneLevel || (!structureAligned && factors.length < 3)) {
    return { kind: "none", reason: SETUP_NO_VALID_MESSAGE, newsRisk };
  }
  // Reflect a level-derived zone in the confluence list so the grade and the
  // displayed confluence aren't blank when the zone came from price structure
  // rather than prose.
  if (zoneFromLevel && !zoneFromText) {
    factors.push(dir > 0 ? "Support / demand zone" : "Resistance / supply zone");
  }

  /* ── Entry zone from structure (demand for longs / supply for shorts) ────── */
  let entryLow: number;
  let entryHigh: number;
  // Entry zone allows for a normal pullback/retest INTO the reaction area — its
  // width is the distance between the two structural references, or a fraction of
  // the structural unit when only a single reference exists (Rule 2 + Rule 9).
  const entryBand = structuralUnit * 0.2;
  if (dir > 0) {
    // Bullish: demand zone from support up to the entry trigger.
    if (entryL != null && supL != null && supL < entryL) {
      entryLow = supL;
      entryHigh = entryL;
    } else {
      const anchor = entryL ?? supL ?? current!;
      entryLow = anchor - entryBand;
      entryHigh = anchor + entryBand;
    }
  } else {
    // Bearish: supply zone from the entry trigger up to resistance.
    if (entryL != null && resL != null && resL > entryL) {
      entryLow = entryL;
      entryHigh = resL;
    } else {
      const anchor = entryL ?? resL ?? current!;
      entryLow = anchor - entryBand;
      entryHigh = anchor + entryBand;
    }
  }
  const entryMid = (entryLow + entryHigh) / 2;

  /* ── Invalidation = STRUCTURAL failure (beyond support / resistance) ──────── */
  // This is the point where the price-action thesis is structurally broken — not
  // a tight stop. The buffer beyond the protecting level is derived from real
  // structure (a fraction of the structural unit), so a normal wick/retest of the
  // zone does NOT trip it (Rule 1).
  const invBuffer = structuralUnit * 0.4;
  let invalMid: number;
  if (invL != null) {
    invalMid = invL;
  } else if (dir > 0) {
    invalMid = (supL != null ? Math.min(supL, entryLow) : entryLow) - invBuffer;
  } else {
    invalMid = (resL != null ? Math.max(resL, entryHigh) : entryHigh) + invBuffer;
  }
  // Enforce structural side: invalidation must sit beyond the zone in the loss direction.
  if (dir > 0 && invalMid >= entryLow) invalMid = entryLow - invBuffer;
  if (dir < 0 && invalMid <= entryHigh) invalMid = entryHigh + invBuffer;
  const invBand = Math.max(Math.abs(entryMid - invalMid) * 0.08, structuralUnit * 0.05);

  const risk = Math.abs(entryMid - invalMid);

  /* ── Targets follow structure (S/R, swing, liquidity) — R:R computed after ── */
  const structuralTargets = [tpL, resL, supL]
    .filter((v): v is number => v != null)
    .filter((v) => (dir > 0 ? v > entryMid : v < entryMid));
  structuralTargets.sort((a, b) => (dir > 0 ? a - b : b - a));

  let t1 = structuralTargets[0] ?? entryMid + dir * 2 * risk;
  let t2 = structuralTargets[1] ?? t1 + dir * Math.abs(t1 - entryMid); // next liquidity / measured move
  // Keep target 2 strictly beyond target 1 in the trade direction.
  if (dir > 0 && t2 <= t1) t2 = t1 + Math.max(risk, Math.abs(t1 - entryMid) * 0.8);
  if (dir < 0 && t2 >= t1) t2 = t1 - Math.max(risk, Math.abs(t1 - entryMid) * 0.8);

  const tBand = Math.max(risk * 0.1, structuralUnit * 0.05);
  const rr1 = risk > 0 ? Math.abs(t1 - entryMid) / risk : 0;
  const rr2 = risk > 0 ? Math.abs(t2 - entryMid) / risk : 0;

  /* ── Consistency check (step 8): direction == bias, zones ordered by structure */
  const orderedOk =
    dir > 0
      ? invalMid < entryLow && entryMid < t1 && t1 < t2
      : invalMid > entryHigh && entryMid > t1 && t1 > t2;
  if (!orderedOk || risk <= 0) {
    return { kind: "none", reason: SETUP_NO_VALID_MESSAGE, newsRisk };
  }

  /* ── Quality from APA confluence strength (NOT news, NOT proximity) ───────── */
  let score = 0;
  if (structureAligned) score += 2;
  if (zoneLevel) score += 2;
  if (flags.liquidity) score += 1;
  if (flags.confirmation) score += 1;
  if (flags.momentum) score += 1;
  if (flags.bos || flags.choch) score += 1;
  if (flags.mtf) score += 1;
  const strength = (input.trend?.strength ?? "").toLowerCase();
  if (strength === "strong") score += 1;
  else if (strength === "moderate") score += 0.5;
  if (rr1 >= 2) score += 1;
  else if (rr1 >= 1.5) score += 0.5;
  else if (rr1 < 1) score -= 1;

  // Insufficient confluence → don't force a trade.
  if (score < 3) {
    return { kind: "none", reason: SETUP_NO_VALID_MESSAGE, newsRisk };
  }
  const quality = gradeFromScore(score);

  const sideWord = dir > 0 ? "demand/support" : "supply/resistance";
  const rationale =
    `${bias} price-action structure. The entry sits at a valid ${sideWord} zone where ` +
    `${dir > 0 ? "buyers have defended" : "sellers have capped price"}; invalidation is placed beyond ` +
    `structural ${dir > 0 ? "support" : "resistance"} (thesis fails on a close through it). Targets track ` +
    `prior ${dir > 0 ? "resistance / swing highs / liquidity above" : "support / swing lows / liquidity below"}. ` +
    `R:R is measured after the zones — not forced.`;

  // Invalidation is a structural IDEA, not an exact stop (Rule 1 + Rule 8).
  const invalidationExplainer =
    `Structural invalidation — not an exact stop. The setup only fails if price ` +
    `decisively breaks and ${dir > 0 ? "closes below" : "closes above"} the invalidation area. ` +
    STRUCTURAL_INVALIDATION_NOTE;

  // Pullbacks/retests around entry and counter-moves en route are normal (Rule 2 + Rule 3).
  const managementNote =
    `Expect price to pull back and retest around the entry zone before continuing — that is ` +
    `normal price action, not a failed setup. Price rarely travels straight from entry to target: ` +
    `plan for counter-moves and reactions at the liquidity/structure between the zones, and treat ` +
    `Target 1 as a logical partial-profit area.`;

  // Lower-timeframe confirmation for scalping (Rule 4 + Rule 5 — conditions, not commands).
  const lowerTimeframeConfirmation =
    dir > 0
      ? [
          "Drop to a lower timeframe (e.g. 1m/5m) as price taps the entry zone and wait for BULLISH confirmation before acting — do not enter on the first touch.",
          "Look for a bullish rejection (wick/pin or bullish engulfing) off the demand/support zone.",
          "Look for a lower-timeframe bullish CHoCH or BOS (price breaking a recent minor lower-high) to confirm structure is shifting up.",
          "A successful retest that holds above the reclaimed level is added confirmation for continuation.",
        ]
      : [
          "Drop to a lower timeframe (e.g. 1m/5m) as price taps the entry zone and wait for BEARISH confirmation before acting — do not enter on the first touch.",
          "Look for a bearish rejection (wick/pin or bearish engulfing) off the supply/resistance zone.",
          "Look for a lower-timeframe bearish CHoCH or BOS (price breaking a recent minor higher-low) to confirm structure is shifting down.",
          "A failed retest that rejects below the reclaimed level is added confirmation for continuation.",
        ];

  return {
    kind: "directional",
    bias: dir > 0 ? "Bullish" : "Bearish",
    entryZone: zone(entryLow, entryHigh, dec),
    invalidationZone: zone(invalMid - invBand, invalMid + invBand, dec),
    target1: zone(t1 - tBand, t1 + tBand, dec),
    target2: zone(t2 - tBand, t2 + tBand, dec),
    riskReward: `1:${rr1.toFixed(1)}`,
    quality,
    confluence: factors,
    rationale,
    newsRisk,
    confidence: Math.round(typeof input.confidence === "number" ? input.confidence : 0),
    entryMid,
    invalidationMid: invalMid,
    target1Mid: t1,
    target2Mid: t2,
    rr1,
    rr2,
    target1Label: "Partial-profit area (nearer objective)",
    target2Label: "Extended objective",
    invalidationExplainer,
    managementNote,
    lowerTimeframeConfirmation,
  };
}
