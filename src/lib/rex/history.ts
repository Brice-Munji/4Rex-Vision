import "server-only";
import { prisma } from "@/lib/prisma";
import { TIMEFRAME_RANK, isHigherTimeframe } from "./pair-integrity";
import type { HigherTimeframeContext } from "./types";

export interface HistoryRecord {
  id: string;
  pair: string | null;
  timeframe: string | null;
  direction: string | null;
  confidence: number | null;
  headline: string | null;
  summary: string | null;
  imageUrl: string | null;
  createdAt: string; // ISO 8601 — exact execution time
}

/**
 * The current user's analysis history, newest first. Each row is created
 * automatically the moment an analysis completes (see recordAnalysisEvent).
 */
export async function getAnalysisHistory(
  userId: string,
  limit = 60
): Promise<HistoryRecord[]> {
  const rows = await prisma.analysisUsage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      pair: true,
      timeframe: true,
      direction: true,
      confidence: true,
      headline: true,
      summary: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    pair: r.pair,
    timeframe: r.timeframe,
    direction: r.direction,
    confidence: r.confidence,
    headline: r.headline,
    summary: r.summary,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
  }));
}

const KNOWN_BIAS = new Set(["Bullish", "Bearish", "Neutral"]);

/**
 * 1M-scalping support: the user's own most recent higher-timeframe analysis
 * of the SAME pair, used as optional CONTEXT for a lower-timeframe read —
 * without requiring a fresh higher-timeframe chart upload. Scoped to the
 * requesting user's own history only, and to a recency window so stale
 * context is never presented as current. Returns null (never throws) when
 * no such analysis exists — callers must label that as "unavailable" rather
 * than assume agreement.
 */
export async function getHigherTimeframeContext(
  userId: string,
  pair: string,
  timeframe: string,
  maxAgeMs = 24 * 60 * 60 * 1000 // 24h
): Promise<HigherTimeframeContext | null> {
  const higherTimeframes = TIMEFRAME_RANK.filter((tf) => isHigherTimeframe(tf, timeframe));
  if (higherTimeframes.length === 0) return null;

  const row = await prisma.analysisUsage.findFirst({
    where: {
      userId,
      pair,
      timeframe: { in: higherTimeframes },
      createdAt: { gte: new Date(Date.now() - maxAgeMs) },
    },
    orderBy: { createdAt: "desc" },
    select: { timeframe: true, direction: true, confidence: true, createdAt: true },
  });
  if (!row?.timeframe) return null;

  return {
    timeframe: row.timeframe as HigherTimeframeContext["timeframe"],
    bias: row.direction && KNOWN_BIAS.has(row.direction) ? (row.direction as HigherTimeframeContext["bias"]) : null,
    confidence: row.confidence,
    ageMinutes: Math.max(0, Math.round((Date.now() - row.createdAt.getTime()) / 60000)),
  };
}
