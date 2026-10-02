import "server-only";

import type { User } from "@prisma/client";
import { getUsageSummary } from "@/lib/usage";
import { getAnalysisHistory } from "@/lib/rex/history";
import { computeStats, listEntries } from "@/lib/journal/service";
import { isProActive } from "@/lib/journal/access";
import { getCalendarSnapshot } from "@/lib/economicCalendar/service";
import { minutesUntil } from "@/lib/economicCalendar/normalize";

/**
 * Secure, user-scoped context layer for Rex Coach.
 *
 * Every query here is filtered to the authenticated user's own id — the Coach
 * never sees another user's data and never gets raw DB access. We return a small,
 * summarized snapshot (recent analyses, journal stats + a few trades, usage,
 * and GLOBAL market/calendar context) rather than dumping tables, and we flag
 * empty sections so Rex can honestly say "you have no trades yet" instead of
 * inventing data.
 */

export interface CoachAnalysis {
  pair: string | null;
  timeframe: string | null;
  direction: string | null;
  confidence: number | null;
  headline: string | null;
  date: string;
}
export interface CoachTrade {
  pair: string;
  direction: string | null;
  result: string; // OPEN | WIN | LOSS | BREAKEVEN
  resultR: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  timeframe: string | null;
  createdAt: string;
}
export interface CoachMarketEvent {
  currency: string;
  title: string;
  impact: string;
  minutesUntil: number;
}
export interface CoachContext {
  user: { firstName: string | null; plan: string; subscriptionStatus: string; isPro: boolean };
  usage: { used: number; limit: number | "unlimited"; remaining: number | "unlimited" };
  analyses: { total: number; recent: CoachAnalysis[] };
  journal: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgR: number;
    bestPair: string | null;
    recentTrades: CoachTrade[];
  };
  market: { asOfUtc: string; status: string; upcoming: CoachMarketEvent[] };
}

/** Build the authenticated user's Coach context. `user` must be the caller. */
export async function buildCoachContext(user: User): Promise<CoachContext> {
  const now = new Date();

  // User-scoped queries (all filtered by user.id inside their helpers).
  const [usage, history, stats, entries] = await Promise.all([
    getUsageSummary(user),
    getAnalysisHistory(user.id, 8),
    computeStats(user.id),
    listEntries(user.id, {}),
  ]);

  // Market/calendar is GLOBAL context (not user data). Best-effort — never throws.
  let market: CoachContext["market"] = { asOfUtc: now.toISOString(), status: "unavailable", upcoming: [] };
  try {
    const snap = await getCalendarSnapshot(now);
    const upcoming = snap.events
      .map((e) => ({ currency: e.currency, title: e.title, impact: e.impact, minutesUntil: minutesUntil(e.timestampUtc, now) }))
      .filter((e) => e.minutesUntil >= 0 && (e.impact === "High" || e.impact === "Medium"))
      .sort((a, b) => a.minutesUntil - b.minutesUntil)
      .slice(0, 6);
    market = { asOfUtc: snap.lastSuccessfulSyncUtc ?? now.toISOString(), status: snap.providerStatus, upcoming };
  } catch {
    /* leave as unavailable */
  }

  return {
    user: {
      firstName: user.firstName ?? null,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      isPro: isProActive(user),
    },
    usage: {
      used: usage.used,
      limit: usage.unlimited ? "unlimited" : usage.limit,
      remaining: usage.unlimited ? "unlimited" : usage.remaining,
    },
    analyses: {
      total: history.length,
      recent: history.slice(0, 8).map((h) => ({
        pair: h.pair,
        timeframe: h.timeframe,
        direction: h.direction,
        confidence: h.confidence,
        headline: h.headline,
        date: h.createdAt,
      })),
    },
    journal: {
      totalTrades: stats.totalTrades,
      openTrades: stats.openTrades,
      closedTrades: stats.closedTrades,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      avgR: stats.avgR,
      bestPair: stats.bestPair,
      recentTrades: entries.slice(0, 8).map((e) => ({
        pair: e.pair,
        direction: e.direction,
        result: e.resultType,
        resultR: e.resultR,
        entry: e.entryPrice,
        stopLoss: e.stopLoss,
        takeProfit: e.takeProfit,
        timeframe: e.timeframe,
        createdAt: e.createdAt,
      })),
    },
    market,
  };
}
