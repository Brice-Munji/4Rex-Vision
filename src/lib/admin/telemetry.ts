import "server-only";
import { prisma } from "@/lib/prisma";
import { recomputePairSentiment } from "@/lib/market/sentiment";

/**
 * Best-effort usage telemetry: records one row per completed analysis and
 * stamps the user's presence. Purely additive — it never affects the analysis
 * result and never throws into the analysis path.
 */
export async function recordAnalysisEvent(params: {
  userId: string;
  pair?: string | null;
  timeframe?: string | null;
  confidence?: number | null;
  provider?: string | null;
  direction?: string | null;
  headline?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
  /** Diagnostic-only correlation id for this analysis request (see
   * `[rex.vision]` logs). Never used for gating/scoring. */
  requestId?: string | null;
  /** SHA-256 of the exact decoded image bytes the vision call received.
   * Diagnostic-only — lets a future incident confirm whether two analyses
   * really were the same screenshot. Never the image itself. */
  imageHash?: string | null;
}): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.analysisUsage.create({
        data: {
          userId: params.userId,
          pair: params.pair ?? null,
          timeframe: params.timeframe ?? null,
          confidence:
            typeof params.confidence === "number"
              ? Math.round(params.confidence)
              : null,
          provider: params.provider ?? null,
          direction: params.direction ?? null,
          headline: params.headline ?? null,
          summary: params.summary ?? null,
          imageUrl: params.imageUrl ?? null,
          requestId: params.requestId ?? null,
          imageHash: params.imageHash ?? null,
        },
      }),
      prisma.user.update({
        where: { id: params.userId },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    // Refresh the aggregated Rex-sentiment cache so Market Intelligence reflects
    // this new analysis. Best-effort and self-contained — never blocks/throws.
    await recomputePairSentiment();
  } catch {
    // Telemetry must never break an analysis.
  }
}
