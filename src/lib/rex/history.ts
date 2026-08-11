import "server-only";
import { prisma } from "@/lib/prisma";

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
