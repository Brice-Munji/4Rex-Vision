import "server-only";

/**
 * Rex Sentiment by Pair — derived from recent Rex analyses, NOT external APIs.
 *
 * Aggregated counts live in the `PairSentiment` cache table. `recomputePairSentiment`
 * is invoked whenever an analysis completes (see recordAnalysisEvent) and rolls
 * up the last N days of `AnalysisUsage` directions per tracked pair. Reads fall
 * back to a seeded baseline until enough real analyses exist.
 */

import { prisma } from "@/lib/prisma";
import { normalizePairKey } from "@/lib/rex/correlation";
import type {
  PairSentimentView,
  SentimentLabel,
  SentimentPayload,
} from "./types";

/** Pairs surfaced on the card, in display order. */
export const TRACKED_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"] as const;

/** Rolling window of analyses that feed the aggregate. */
const WINDOW_DAYS = 14;
/** Below this, we blend toward the baseline so a single analysis can't swing 0→100. */
const MIN_CONFIDENT_SAMPLES = 5;

// Seeded baseline (bullish share, 0–100) — used until real analyses accumulate.
const BASELINE_BULLISH_PCT: Record<string, number> = {
  EURUSD: 64,
  GBPUSD: 61,
  USDJPY: 43, // → Bearish 57%
  XAUUSD: 29, // → Bearish 71%
};

function labelFor(bullishPct: number): { label: SentimentLabel; strength: number } {
  if (bullishPct >= 55) return { label: "Bullish", strength: Math.round(bullishPct) };
  if (bullishPct <= 45) return { label: "Bearish", strength: Math.round(100 - bullishPct) };
  return { label: "Neutral", strength: Math.round(bullishPct) };
}

/**
 * Roll recent analyses up into the PairSentiment cache. Best-effort: never throws
 * into the analysis path. Call after an analysis is recorded.
 */
export async function recomputePairSentiment(): Promise<void> {
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.analysisUsage.findMany({
      where: { createdAt: { gte: since }, direction: { not: null } },
      select: { pair: true, direction: true },
    });

    // Tally per normalized, tracked pair.
    const tally: Record<string, { bullish: number; bearish: number; neutral: number }> = {};
    for (const p of TRACKED_PAIRS) tally[p] = { bullish: 0, bearish: 0, neutral: 0 };

    for (const r of rows) {
      const key = normalizePairKey(r.pair);
      if (!key || !(key in tally)) continue;
      const d = (r.direction ?? "").toLowerCase();
      if (d === "bullish") tally[key].bullish += 1;
      else if (d === "bearish") tally[key].bearish += 1;
      else if (d === "neutral") tally[key].neutral += 1;
    }

    await prisma.$transaction(
      TRACKED_PAIRS.map((pair) => {
        const t = tally[pair];
        const samples = t.bullish + t.bearish + t.neutral;
        return prisma.pairSentiment.upsert({
          where: { pair },
          create: { pair, ...t, samples },
          update: { ...t, samples },
        });
      })
    );
  } catch {
    // Sentiment aggregation must never break an analysis.
  }
}

/** Read the current sentiment views (cache first, baseline fallback). */
export async function getPairSentiment(
  now: Date = new Date()
): Promise<SentimentPayload> {
  let cached: Record<string, { bullish: number; bearish: number; neutral: number; samples: number }> = {};
  try {
    const rows = await prisma.pairSentiment.findMany({
      where: { pair: { in: [...TRACKED_PAIRS] } },
    });
    cached = Object.fromEntries(
      rows.map((r) => [r.pair, { bullish: r.bullish, bearish: r.bearish, neutral: r.neutral, samples: r.samples }])
    );
  } catch {
    cached = {};
  }

  const pairs: PairSentimentView[] = TRACKED_PAIRS.map((pair) => {
    const c = cached[pair];
    const baseline = BASELINE_BULLISH_PCT[pair] ?? 50;
    const directional = c ? c.bullish + c.bearish : 0;

    let bullishPct: number;
    let source: "rex" | "baseline";
    let samples: number;

    if (c && directional > 0) {
      const raw = (c.bullish / directional) * 100;
      // Blend toward the baseline until we have a confident number of samples.
      if (c.samples < MIN_CONFIDENT_SAMPLES) {
        const w = c.samples / MIN_CONFIDENT_SAMPLES;
        bullishPct = raw * w + baseline * (1 - w);
      } else {
        bullishPct = raw;
      }
      source = "rex";
      samples = c.samples;
    } else {
      bullishPct = baseline;
      source = "baseline";
      samples = c?.samples ?? 0;
    }

    const { label, strength } = labelFor(bullishPct);
    return {
      pair,
      label,
      strength,
      bullishPct: Math.round(bullishPct),
      samples,
      source,
    };
  });

  return { pairs, updatedAt: now.toISOString() };
}
