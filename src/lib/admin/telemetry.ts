import "server-only";
import { prisma } from "@/lib/prisma";

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
        },
      }),
      prisma.user.update({
        where: { id: params.userId },
        data: { lastActiveAt: new Date() },
      }),
    ]);
  } catch {
    // Telemetry must never break an analysis.
  }
}
