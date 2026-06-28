import { prisma } from "@/lib/prisma";
import { PLAN_DAILY_LIMITS } from "@/lib/constants";
import type { User } from "@prisma/client";

function isSameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export interface UsageSummary {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

/**
 * Returns today's analysis usage for a user, resetting the counter lazily when
 * a new UTC day has begun. Prepares the Free-plan 3/day logic — AI is not wired
 * up yet, this only manages the allowance bookkeeping.
 */
export async function getUsageSummary(user: Pick<User, "id" | "plan" | "dailyAnalysisCount" | "analysisCountDate">): Promise<UsageSummary> {
  const limit = PLAN_DAILY_LIMITS[user.plan];
  const unlimited = !Number.isFinite(limit);

  let used = user.dailyAnalysisCount;
  if (!isSameUtcDay(new Date(user.analysisCountDate), new Date())) {
    // New day — reset the stored counter.
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyAnalysisCount: 0, analysisCountDate: new Date() },
    });
    used = 0;
  }

  return {
    used,
    limit: unlimited ? Infinity : limit,
    remaining: unlimited ? Infinity : Math.max(0, limit - used),
    unlimited,
  };
}
