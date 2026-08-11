import "server-only";
import { prisma } from "@/lib/prisma";
import { isVisionConfigured, configuredProviders } from "@/lib/rex/vision-providers";
import type { Prisma } from "@prisma/client";

/* -------------------------------------------------------------------------- */
/*  Date helpers (UTC)                                                         */
/* -------------------------------------------------------------------------- */

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Percentage change of `curr` vs `prev`, rounded. */
export function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/* -------------------------------------------------------------------------- */
/*  Overview                                                                   */
/* -------------------------------------------------------------------------- */

export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** formatting hint for the client */
  format: "number" | "currency";
  currency?: string;
  deltas: { label: string; pct: number }[];
}

export async function getOverview(): Promise<{ kpis: Kpi[]; generatedAt: string }> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -7);
  const prevWeekStart = addDays(todayStart, -14);
  const monthStart = startOfUtcMonth(now);
  const prevMonthStart = startOfUtcMonth(addDays(monthStart, -1));

  const [
    totalUsers,
    usersWeekAgo,
    activeToday,
    activeYesterday,
    proUsers,
    proUsersWeekAgo,
    analysesToday,
    analysesYesterday,
    analysesMonth,
    analysesPrevMonth,
    geminiToday,
    geminiYesterday,
    revenueMonthAgg,
    revenuePrevMonthAgg,
    revenueLifetimeAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { lt: weekStart } } }),
    activeUserCount(todayStart),
    activeUserCount(yesterdayStart, todayStart),
    prisma.user.count({ where: { plan: "PROFESSIONAL" } }),
    prisma.user.count({
      where: { plan: "PROFESSIONAL", subscriptionStart: { lt: weekStart } },
    }),
    prisma.analysisUsage.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.analysisUsage.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.analysisUsage.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.analysisUsage.count({
      where: { createdAt: { gte: prevMonthStart, lt: monthStart } },
    }),
    prisma.analysisUsage.count({
      where: { provider: "gemini", createdAt: { gte: todayStart } },
    }),
    prisma.analysisUsage.count({
      where: {
        provider: "gemini",
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS", createdAt: { gte: monthStart } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        status: "SUCCESS",
        createdAt: { gte: prevMonthStart, lt: monthStart },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS" },
    }),
  ]);

  const newThisWeek = totalUsers - usersWeekAgo;
  const revMonth = (revenueMonthAgg._sum.amount ?? 0) / 100;
  const revPrevMonth = (revenuePrevMonthAgg._sum.amount ?? 0) / 100;
  const revLifetime = (revenueLifetimeAgg._sum.amount ?? 0) / 100;

  const kpis: Kpi[] = [
    {
      key: "total_users",
      label: "Total Users",
      value: totalUsers,
      format: "number",
      deltas: [
        { label: "vs last week", pct: pct(totalUsers, usersWeekAgo) },
        { label: "new this week", pct: pct(newThisWeek, usersWeekAgo) },
      ],
    },
    {
      key: "active_today",
      label: "Active Users Today",
      value: activeToday,
      format: "number",
      deltas: [{ label: "vs yesterday", pct: pct(activeToday, activeYesterday) }],
    },
    {
      key: "pro_users",
      label: "Rex Pro Users",
      value: proUsers,
      format: "number",
      deltas: [{ label: "vs last week", pct: pct(proUsers, proUsersWeekAgo) }],
    },
    {
      key: "analyses_today",
      label: "Analyses Today",
      value: analysesToday,
      format: "number",
      deltas: [{ label: "vs yesterday", pct: pct(analysesToday, analysesYesterday) }],
    },
    {
      key: "analyses_month",
      label: "Analyses This Month",
      value: analysesMonth,
      format: "number",
      deltas: [{ label: "vs last month", pct: pct(analysesMonth, analysesPrevMonth) }],
    },
    {
      key: "revenue_month",
      label: "Monthly Revenue",
      value: revMonth,
      format: "currency",
      currency: "USD",
      deltas: [{ label: "vs last month", pct: pct(revMonth, revPrevMonth) }],
    },
    {
      key: "revenue_lifetime",
      label: "Lifetime Revenue",
      value: revLifetime,
      format: "currency",
      currency: "USD",
      deltas: [{ label: "this month", pct: pct(revMonth, revPrevMonth) }],
    },
    {
      key: "gemini_today",
      label: "Gemini API Requests Today",
      value: geminiToday,
      format: "number",
      deltas: [{ label: "vs yesterday", pct: pct(geminiToday, geminiYesterday) }],
    },
  ];

  return { kpis, generatedAt: now.toISOString() };
}

/** Distinct users active in a window: presence stamp OR an analysis event. */
async function activeUserCount(from: Date, to?: Date): Promise<number> {
  const range = to ? { gte: from, lt: to } : { gte: from };
  const [byPresence, byAnalysis] = await Promise.all([
    prisma.user.findMany({
      where: { lastActiveAt: range },
      select: { id: true },
    }),
    prisma.analysisUsage.findMany({
      where: { createdAt: range },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  const ids = new Set<string>();
  byPresence.forEach((u) => ids.add(u.id));
  byAnalysis.forEach((a) => ids.add(a.userId));
  return ids.size;
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export type UserFilter =
  | "all"
  | "explorer"
  | "pro"
  | "active"
  | "expired"
  | "high_usage"
  | "new_users";

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  subscriptionStatus: string;
  subscriptionSource: string | null;
  suspended: boolean;
  analysesToday: number;
  lastActive: string | null;
  createdAt: string;
  subscriptionEnd: string | null;
}

export async function getUsers(opts: {
  search?: string;
  filter?: UserFilter;
  limit?: number;
}): Promise<AdminUserRow[]> {
  const { search, filter = "all", limit = 200 } = opts;
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const weekAgo = addDays(todayStart, -7);

  const where: Prisma.UserWhereInput = {};
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "explorer") where.plan = "FREE";
  else if (filter === "pro") where.plan = "PROFESSIONAL";
  else if (filter === "active") where.subscriptionStatus = "ACTIVE";
  else if (filter === "expired")
    where.AND = [
      { plan: "PROFESSIONAL" },
      { currentPeriodEnd: { lt: now } },
    ];
  else if (filter === "new_users") where.createdAt = { gte: weekAgo };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionSource: true,
      suspended: true,
      lastActiveAt: true,
      createdAt: true,
      currentPeriodEnd: true,
    },
  });

  // analyses today per user
  const todayCounts = await prisma.analysisUsage.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: todayStart } },
    _count: { _all: true },
  });
  const countMap = new Map(todayCounts.map((c) => [c.userId, c._count._all]));

  let rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    username: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
    email: u.email,
    role: u.role,
    plan: u.plan,
    subscriptionStatus: u.subscriptionStatus,
    subscriptionSource: u.subscriptionSource,
    suspended: u.suspended,
    analysesToday: countMap.get(u.id) ?? 0,
    lastActive: u.lastActiveAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    subscriptionEnd: u.currentPeriodEnd?.toISOString() ?? null,
  }));

  if (filter === "high_usage") rows = rows.filter((r) => r.analysesToday >= 5);

  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Pro subscribers                                                            */
/* -------------------------------------------------------------------------- */

export interface ProSubscriberRow {
  id: string;
  user: string;
  email: string;
  source: string;
  started: string | null;
  expires: string | null;
  daysRemaining: number | null;
  status: string;
  expiringSoon: boolean;
}

export async function getProSubscribers(): Promise<ProSubscriberRow[]> {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: { plan: "PROFESSIONAL" },
    orderBy: [{ currentPeriodEnd: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      subscriptionSource: true,
      subscriptionStatus: true,
      subscriptionStart: true,
      currentPeriodEnd: true,
    },
  });

  return users.map((u) => {
    const end = u.currentPeriodEnd;
    const daysRemaining = end
      ? Math.ceil((end.getTime() - now.getTime()) / 86400000)
      : null; // null = lifetime
    return {
      id: u.id,
      user: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0],
      email: u.email,
      source: (u.subscriptionSource ?? "PAYMENT").toLowerCase(),
      started: u.subscriptionStart?.toISOString() ?? null,
      expires: end?.toISOString() ?? null,
      daysRemaining,
      status: u.subscriptionStatus,
      expiringSoon: daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Analysis activity                                                          */
/* -------------------------------------------------------------------------- */

export interface UserActivityRow {
  id: string;
  user: string;
  email: string;
  today: number;
  yesterday: number;
  last7: number;
  last30: number;
  lifetime: number;
  topPair: string | null;
  avgConfidence: number | null;
}

export async function getAnalysisActivity(): Promise<{
  rows: UserActivityRow[];
  series: { date: string; count: number }[];
}> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -6);
  const monthStart = addDays(todayStart, -29);

  const events = await prisma.analysisUsage.findMany({
    where: { createdAt: { gte: addDays(todayStart, -400) } },
    select: {
      userId: true,
      pair: true,
      confidence: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // 30-day global series
  const series: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDays(todayStart, -i);
    series.push({ date: ymd(day), count: 0 });
  }
  const seriesIndex = new Map(series.map((s, i) => [s.date, i]));

  interface Acc {
    user: string;
    email: string;
    today: number;
    yesterday: number;
    last7: number;
    last30: number;
    lifetime: number;
    pairs: Map<string, number>;
    confSum: number;
    confN: number;
  }
  const map = new Map<string, Acc>();

  for (const e of events) {
    const created = e.createdAt;
    let acc = map.get(e.userId);
    if (!acc) {
      acc = {
        user:
          [e.user.firstName, e.user.lastName].filter(Boolean).join(" ") ||
          e.user.email.split("@")[0],
        email: e.user.email,
        today: 0,
        yesterday: 0,
        last7: 0,
        last30: 0,
        lifetime: 0,
        pairs: new Map(),
        confSum: 0,
        confN: 0,
      };
      map.set(e.userId, acc);
    }
    acc.lifetime++;
    if (created >= todayStart) acc.today++;
    if (created >= yesterdayStart && created < todayStart) acc.yesterday++;
    if (created >= weekStart) acc.last7++;
    if (created >= monthStart) acc.last30++;
    if (e.pair) acc.pairs.set(e.pair, (acc.pairs.get(e.pair) ?? 0) + 1);
    if (typeof e.confidence === "number") {
      acc.confSum += e.confidence;
      acc.confN++;
    }
    // global series
    if (created >= monthStart) {
      const idx = seriesIndex.get(ymd(startOfUtcDay(created)));
      if (idx !== undefined) series[idx].count++;
    }
  }

  const rows: UserActivityRow[] = [...map.entries()]
    .map(([id, a]) => {
      let topPair: string | null = null;
      let top = 0;
      a.pairs.forEach((n, p) => {
        if (n > top) {
          top = n;
          topPair = p;
        }
      });
      return {
        id,
        user: a.user,
        email: a.email,
        today: a.today,
        yesterday: a.yesterday,
        last7: a.last7,
        last30: a.last30,
        lifetime: a.lifetime,
        topPair,
        avgConfidence: a.confN ? Math.round(a.confSum / a.confN) : null,
      };
    })
    .sort((x, y) => y.lifetime - x.lifetime);

  return { rows, series };
}

/* -------------------------------------------------------------------------- */
/*  Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface AnalyticsData {
  userGrowth: { date: string; total: number; new: number }[];
  proConversionRate: number;
  dailyAnalyses: { date: string; count: number }[];
  topPairs: { label: string; value: number }[];
  topTimeframes: { label: string; value: number }[];
  revenueTrend: { date: string; value: number }[];
  countryDistribution: { label: string; value: number }[];
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);

  const [users, events, txns] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true, plan: true } }),
    prisma.analysisUsage.findMany({
      where: { createdAt: { gte: addDays(todayStart, -29) } },
      select: { pair: true, timeframe: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { status: "SUCCESS" },
      select: { amount: true, createdAt: true },
    }),
  ]);

  // user growth (cumulative) over last 30 days
  const growth: { date: string; total: number; new: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDays(todayStart, -i);
    const dayEnd = addDays(day, 1);
    const total = users.filter((u) => u.createdAt < dayEnd).length;
    const isNew = users.filter(
      (u) => u.createdAt >= day && u.createdAt < dayEnd
    ).length;
    growth.push({ date: ymd(day), total, new: isNew });
  }

  const proCount = users.filter((u) => u.plan === "PROFESSIONAL").length;
  const proConversionRate = users.length
    ? Math.round((proCount / users.length) * 1000) / 10
    : 0;

  // daily analyses
  const daily: { date: string; count: number }[] = [];
  const dailyIdx = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const day = ymd(addDays(todayStart, -i));
    dailyIdx.set(day, daily.length);
    daily.push({ date: day, count: 0 });
  }
  const pairCount = new Map<string, number>();
  const tfCount = new Map<string, number>();
  for (const e of events) {
    const idx = dailyIdx.get(ymd(startOfUtcDay(e.createdAt)));
    if (idx !== undefined) daily[idx].count++;
    if (e.pair) pairCount.set(e.pair, (pairCount.get(e.pair) ?? 0) + 1);
    if (e.timeframe) tfCount.set(e.timeframe, (tfCount.get(e.timeframe) ?? 0) + 1);
  }
  const topPairs = [...pairCount.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const topTimeframes = [...tfCount.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // revenue trend (last 12 months)
  const revenueTrend: { date: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const mEnd = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    const value =
      txns
        .filter((t) => t.createdAt >= m && t.createdAt < mEnd)
        .reduce((s, t) => s + t.amount, 0) / 100;
    revenueTrend.push({ date: m.toISOString().slice(0, 7), value });
  }

  return {
    userGrowth: growth,
    proConversionRate,
    dailyAnalyses: daily,
    topPairs,
    topTimeframes,
    revenueTrend,
    countryDistribution: [], // geo not captured yet
  };
}

/* -------------------------------------------------------------------------- */
/*  Payments                                                                   */
/* -------------------------------------------------------------------------- */

export interface PaymentRow {
  id: string;
  user: string;
  email: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  transactionId: string;
}

export async function getPayments(opts: {
  provider?: string;
  status?: string;
}): Promise<PaymentRow[]> {
  const where: Prisma.TransactionWhereInput = {};
  if (opts.provider && opts.provider !== "all") where.provider = opts.provider;
  if (opts.status && opts.status !== "all")
    where.status = opts.status.toUpperCase() as Prisma.TransactionWhereInput["status"];

  const txns = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      provider: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      reference: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return txns.map((t) => ({
    id: t.id,
    user:
      [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") ||
      t.user.email.split("@")[0],
    email: t.user.email,
    provider: t.provider,
    amount: t.amount / 100,
    currency: t.currency,
    status: t.status.toLowerCase(),
    date: t.createdAt.toISOString(),
    transactionId: t.reference,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Audit logs                                                                 */
/* -------------------------------------------------------------------------- */

export interface AuditRow {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  targetUser: string | null;
  details: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  GRANT_PRO: "Granted Pro",
  EXTEND_PRO: "Extended Pro",
  REVOKE_PRO: "Revoked Pro",
  RESET_USAGE: "Reset analyses",
  SUSPEND_USER: "Suspended user",
  UNSUSPEND_USER: "Unsuspended user",
  CHANGE_SETTINGS: "Changed settings",
};

export async function getAuditLogs(): Promise<AuditRow[]> {
  const actions = await prisma.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      type: true,
      details: true,
      createdAt: true,
      actor: { select: { firstName: true, lastName: true, email: true } },
      target: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return actions.map((a) => ({
    id: a.id,
    timestamp: a.createdAt.toISOString(),
    admin:
      [a.actor.firstName, a.actor.lastName].filter(Boolean).join(" ") ||
      a.actor.email,
    action: ACTION_LABELS[a.type] ?? a.type,
    targetUser: a.target
      ? [a.target.firstName, a.target.lastName].filter(Boolean).join(" ") ||
        a.target.email
      : null,
    details: a.details,
  }));
}

/* -------------------------------------------------------------------------- */
/*  System health                                                             */
/* -------------------------------------------------------------------------- */

export interface SystemHealth {
  gemini: { status: "online" | "offline"; providers: string[] };
  database: { status: "online" | "offline"; latencyMs: number };
  apiLatencyMs: number;
  errorRate: number;
  queueSize: number;
  activeSessions: number;
  recentErrors: { id: string; time: string; message: string }[];
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const now = new Date();
  const dayAgo = addDays(now, -1);

  // DB ping + latency
  const t0 = Date.now();
  let dbOnline = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOnline = false;
  }
  const latencyMs = Date.now() - t0;

  const [activeSessions, failed24h, total24h, recentFailed] = await Promise.all([
    prisma.session.count({ where: { expires: { gt: now } } }),
    prisma.transaction.count({
      where: { status: "FAILED", createdAt: { gte: dayAgo } },
    }),
    prisma.transaction.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.transaction.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, createdAt: true, provider: true, description: true },
    }),
  ]);

  const errorRate = total24h ? Math.round((failed24h / total24h) * 1000) / 10 : 0;

  return {
    gemini: {
      status: isVisionConfigured() ? "online" : "offline",
      providers: configuredProviders(),
    },
    database: { status: dbOnline ? "online" : "offline", latencyMs },
    apiLatencyMs: latencyMs,
    errorRate,
    queueSize: 0,
    activeSessions,
    recentErrors: recentFailed.map((t) => ({
      id: t.id,
      time: t.createdAt.toISOString(),
      message: `Payment failed · ${t.provider}${t.description ? ` · ${t.description}` : ""}`,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Live activity feed                                                         */
/* -------------------------------------------------------------------------- */

export interface ActivityItem {
  id: string;
  type: "analysis" | "upgrade" | "payment" | "signup" | "limit";
  user: string;
  detail: string;
  time: string;
}

export async function getLiveActivity(limit = 12): Promise<ActivityItem[]> {
  const [events, txns, newUsers] = await Promise.all([
    prisma.analysisUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        pair: true,
        createdAt: true,
        user: { select: { firstName: true, email: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
        user: { select: { firstName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, firstName: true, email: true, createdAt: true },
    }),
  ]);

  const name = (u: { firstName: string | null; email: string }) =>
    u.firstName || u.email.split("@")[0];

  const items: ActivityItem[] = [
    ...events.map((e) => ({
      id: `a-${e.id}`,
      type: "analysis" as const,
      user: name(e.user),
      detail: e.pair ? `analyzed ${e.pair}` : "ran a chart analysis",
      time: e.createdAt.toISOString(),
    })),
    ...txns.map((t) => ({
      id: `p-${t.id}`,
      type: "payment" as const,
      user: name(t.user),
      detail: `payment completed · ${t.currency} ${(t.amount / 100).toFixed(2)}`,
      time: t.createdAt.toISOString(),
    })),
    ...newUsers.map((u) => ({
      id: `s-${u.id}`,
      type: "signup" as const,
      user: name(u),
      detail: "created an account",
      time: u.createdAt.toISOString(),
    })),
  ];

  return items
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, limit);
}
