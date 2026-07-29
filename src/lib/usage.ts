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

type UsageUser = Pick<
  User,
  "id" | "plan" | "dailyAnalysisCount" | "analysisCountDate"
>;

/** ISO timestamp of the next UTC midnight — when the daily allowance resets. */
export function nextResetIso(from: Date = new Date()): string {
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1)
  ).toISOString();
}

export interface AnalysisGate extends UsageSummary {
  /** Whether a NEW analysis may run right now. */
  allowed: boolean;
  /** When the allowance next resets (next UTC midnight), ISO. */
  resetAt: string;
}

/**
 * Authoritative pre-flight check: may this user run a new analysis right now?
 * Performs the lazy daily reset first, so this is the single source of truth the
 * backend consults BEFORE any AI processing.
 */
export async function evaluateAnalysisGate(user: UsageUser): Promise<AnalysisGate> {
  const summary = await getUsageSummary(user);
  return {
    ...summary,
    allowed: summary.unlimited || summary.remaining > 0,
    resetAt: nextResetIso(),
  };
}

/**
 * Atomically consume one analysis credit AFTER a successful analysis. Applies
 * the daily reset guard so the first analysis of a new day starts from 0.
 * Returns the updated usage. Unlimited plans never block.
 */
export async function consumeAnalysis(userId: string): Promise<UsageSummary> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { used: 0, limit: 0, remaining: 0, unlimited: false };
  }

  const limit = PLAN_DAILY_LIMITS[user.plan];
  const unlimited = !Number.isFinite(limit);

  const sameDay = isSameUtcDay(new Date(user.analysisCountDate), new Date());
  const current = sameDay ? user.dailyAnalysisCount : 0;
  const next = current + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: { dailyAnalysisCount: next, analysisCountDate: new Date() },
  });

  if (unlimited) {
    return { used: next, limit: Infinity, remaining: Infinity, unlimited: true };
  }
  return {
    used: next,
    limit,
    remaining: Math.max(0, limit - next),
    unlimited: false,
  };
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
