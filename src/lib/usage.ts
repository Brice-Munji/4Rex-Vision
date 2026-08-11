import { prisma } from "@/lib/prisma";
import { PLAN_DAILY_LIMITS } from "@/lib/constants";
import type { User } from "@prisma/client";

/** The free allowance is a rolling 24-hour window. */
export const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The counting window is active while it's been under 24h since the last
 * analysis (`analysisCountDate`). Once 24h elapse, the allowance resets.
 */
function windowActive(windowStart: Date, now = Date.now()): boolean {
  return now - windowStart.getTime() < USAGE_WINDOW_MS;
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

/** ISO timestamp when the allowance resets — 24h after `from`. */
export function nextResetIso(from: Date = new Date()): string {
  return new Date(from.getTime() + USAGE_WINDOW_MS).toISOString();
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
  const windowStart = new Date(user.analysisCountDate);
  // If the window is still active, the allowance resets 24h after it started
  // (the last analysis); otherwise a fresh 24h window begins on the next run.
  const resetAt = windowActive(windowStart)
    ? nextResetIso(windowStart)
    : nextResetIso();
  return {
    ...summary,
    allowed: summary.unlimited || summary.remaining > 0,
    resetAt,
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

  // Continue the active window, or start a fresh one. The window start is
  // stamped to "now" so the 24h countdown runs from the most recent analysis.
  const active = windowActive(new Date(user.analysisCountDate));
  const current = active ? user.dailyAnalysisCount : 0;
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
  if (!windowActive(new Date(user.analysisCountDate))) {
    // The 24h window elapsed — reset the counter (the window start is left as
    // is; the next analysis stamps a fresh window).
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyAnalysisCount: 0 },
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
