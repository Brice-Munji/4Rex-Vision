import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createNotification } from "@/lib/notifications/service";
import { assessNewsRisk } from "./news-risk";
import {
  type JournalEntryDTO,
  type JournalStats,
  type ResultType,
  type NewsRisk,
  type TradeDirection,
} from "./constants";

const ENTRY_INCLUDE = {
  tags: true,
  emotions: true,
  outcome: true,
} satisfies Prisma.JournalEntryInclude;

type EntryWithRelations = Prisma.JournalEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

function toDTO(e: EntryWithRelations): JournalEntryDTO {
  return {
    id: e.id,
    analysisId: e.analysisId,
    pair: e.pair,
    timeframe: e.timeframe,
    direction: (e.direction as TradeDirection) ?? null,
    confidence: e.confidence,
    entryPrice: e.entryPrice,
    stopLoss: e.stopLoss,
    takeProfit: e.takeProfit,
    lotSize: e.lotSize,
    riskAmount: e.riskAmount,
    resultType: e.resultType as ResultType,
    resultR: e.resultR,
    resultAmount: e.resultAmount,
    traderNote: e.traderNote,
    newsRisk: (e.newsRisk as NewsRisk) ?? null,
    tags: e.tags.map((t) => t.label),
    emotions: e.emotions.map((m) => m.emotion),
    outcome: e.outcome
      ? {
          targetReached: e.outcome.targetReached,
          mfe: e.outcome.mfe,
          mae: e.outcome.mae,
          timeToTargetMins: e.outcome.timeToTargetMins,
          accuracyScore: e.outcome.accuracyScore,
          note: e.outcome.note,
          checkedAt: e.outcome.checkedAt.toISOString(),
        }
      : null,
    createdAt: e.createdAt.toISOString(),
    closedAt: e.closedAt ? e.closedAt.toISOString() : null,
  };
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export interface CreateEntryInput {
  analysisId?: string | null;
  pair: string;
  timeframe?: string | null;
  direction?: string | null;
  confidence?: number | null;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lotSize?: number | null;
  riskAmount?: number | null;
  traderNote?: string | null;
  tags?: string[];
  emotions?: string[];
}

export async function createEntry(
  userId: string,
  input: CreateEntryInput
): Promise<JournalEntryDTO> {
  const news = await assessNewsRisk(input.pair, new Date());

  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      analysisId: input.analysisId ?? null,
      pair: input.pair,
      timeframe: input.timeframe ?? null,
      direction: input.direction ?? null,
      confidence: input.confidence ?? null,
      entryPrice: input.entryPrice ?? null,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
      lotSize: input.lotSize ?? null,
      riskAmount: input.riskAmount ?? null,
      traderNote: input.traderNote ?? null,
      newsRisk: news.level,
      tags: input.tags?.length
        ? { create: dedupe(input.tags).map((label) => ({ label })) }
        : undefined,
      emotions: input.emotions?.length
        ? { create: dedupe(input.emotions).map((emotion) => ({ emotion })) }
        : undefined,
    },
    include: ENTRY_INCLUDE,
  });

  // Notifications: trade added + (optionally) high news risk.
  await createNotification({
    userId,
    type: "journal_outcome",
    title: "Trade added to journal",
    message: `Your ${entry.pair} trade was saved to the Smart Journal.`,
    actionUrl: `/journal/${entry.id}`,
  });
  if (news.level === "HIGH") {
    await createNotification({
      userId,
      type: "journal_outcome",
      title: "High news risk detected",
      message: news.warning ?? `High-impact news is near your ${entry.pair} trade.`,
      actionUrl: `/journal/${entry.id}`,
    });
  }

  return toDTO(entry);
}

/* ── Read ───────────────────────────────────────────────────────────────── */

export interface ListFilters {
  pair?: string | null;
  timeframe?: string | null;
  direction?: string | null;
  result?: string | null;
  newsRisk?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
}

export async function listEntries(
  userId: string,
  f: ListFilters = {}
): Promise<JournalEntryDTO[]> {
  const where: Prisma.JournalEntryWhereInput = { userId };
  if (f.pair) where.pair = f.pair;
  if (f.timeframe) where.timeframe = f.timeframe;
  if (f.direction) where.direction = f.direction;
  if (f.result) where.resultType = f.result;
  if (f.newsRisk) where.newsRisk = f.newsRisk;
  if (f.search) where.pair = { contains: f.search, mode: "insensitive" };
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(f.from);
    if (f.to) where.createdAt.lte = new Date(f.to);
  }

  const rows = await prisma.journalEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: ENTRY_INCLUDE,
    take: 200,
  });
  return rows.map(toDTO);
}

export async function getEntry(
  userId: string,
  id: string
): Promise<JournalEntryDTO | null> {
  const e = await prisma.journalEntry.findFirst({
    where: { id, userId },
    include: ENTRY_INCLUDE,
  });
  return e ? toDTO(e) : null;
}

/* ── Update ─────────────────────────────────────────────────────────────── */

export interface UpdateEntryInput {
  traderNote?: string | null;
  tags?: string[];
  emotions?: string[];
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lotSize?: number | null;
  riskAmount?: number | null;
}

export async function updateEntry(
  userId: string,
  id: string,
  input: UpdateEntryInput
): Promise<JournalEntryDTO | null> {
  const existing = await prisma.journalEntry.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.update({
      where: { id },
      data: {
        traderNote: input.traderNote ?? undefined,
        entryPrice: input.entryPrice ?? undefined,
        stopLoss: input.stopLoss ?? undefined,
        takeProfit: input.takeProfit ?? undefined,
        lotSize: input.lotSize ?? undefined,
        riskAmount: input.riskAmount ?? undefined,
      },
    });
    if (input.tags) {
      await tx.journalTag.deleteMany({ where: { entryId: id } });
      if (input.tags.length)
        await tx.journalTag.createMany({
          data: dedupe(input.tags).map((label) => ({ entryId: id, label })),
        });
    }
    if (input.emotions) {
      await tx.journalEmotion.deleteMany({ where: { entryId: id } });
      if (input.emotions.length)
        await tx.journalEmotion.createMany({
          data: dedupe(input.emotions).map((emotion) => ({ entryId: id, emotion })),
        });
    }
  });

  return getEntry(userId, id);
}

/* ── Close ──────────────────────────────────────────────────────────────── */

export interface CloseInput {
  exitPrice?: number | null;
  resultAmount?: number | null;
  resultR?: number | null;
  note?: string | null;
}

export async function closeEntry(
  userId: string,
  id: string,
  input: CloseInput
): Promise<JournalEntryDTO | null> {
  const e = await prisma.journalEntry.findFirst({ where: { id, userId } });
  if (!e) return null;

  // Derive the R multiple if not supplied and we have the geometry.
  let r = input.resultR ?? null;
  if (r === null && input.exitPrice != null && e.entryPrice != null && e.stopLoss != null) {
    const risk = Math.abs(e.entryPrice - e.stopLoss);
    if (risk > 0) {
      const dir = e.direction === "Bearish" ? -1 : 1;
      r = ((input.exitPrice - e.entryPrice) * dir) / risk;
    }
  }

  let resultType: ResultType = "BREAKEVEN";
  if (r != null) {
    if (r > 0.05) resultType = "WIN";
    else if (r < -0.05) resultType = "LOSS";
  }

  let amount = input.resultAmount ?? null;
  if (amount === null && r != null && e.riskAmount != null) amount = r * e.riskAmount;

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      resultType,
      resultR: r ?? undefined,
      resultAmount: amount ?? undefined,
      closedAt: new Date(),
      traderNote: input.note ? appendNote(e.traderNote, input.note) : undefined,
    },
    include: ENTRY_INCLUDE,
  });

  await createNotification({
    userId,
    type: "journal_outcome",
    title: "Trade closed",
    message: `Your ${updated.pair} trade closed as ${resultType.toLowerCase()}${
      r != null ? ` (${r >= 0 ? "+" : ""}${r.toFixed(2)}R)` : ""
    }.`,
    actionUrl: `/journal/${id}`,
  });

  return toDTO(updated);
}

/* ── What Happened Next (outcome) ───────────────────────────────────────── */

/** Deterministic 0..1 factor from an id (stable across re-checks, SSR-safe). */
function hashFactor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return (Math.abs(h) % 1000) / 1000;
}

export async function checkOutcome(
  userId: string,
  id: string
): Promise<JournalEntryDTO | null> {
  const e = await prisma.journalEntry.findFirst({ where: { id, userId } });
  if (!e) return null;

  const entry = e.entryPrice ?? 0;
  const tp = e.takeProfit ?? null;
  const sl = e.stopLoss ?? null;
  const f = hashFactor(e.id);

  // MVP model: compare the plan geometry with a deterministic simulated move.
  // (Replaceable by a real price feed — the shape/fields stay identical.)
  const wonAlready = e.resultType === "WIN";
  const targetReached = tp != null ? wonAlready || f > 0.45 : wonAlready;

  const dir = e.direction === "Bearish" ? -1 : 1;
  const rewardDist = tp != null ? Math.abs(tp - entry) : Math.abs(entry) * 0.002;
  const riskDist = sl != null ? Math.abs(entry - sl) : Math.abs(entry) * 0.001;

  const mfe = entry + dir * rewardDist * (targetReached ? 1 : 0.4 + f * 0.4);
  const mae = entry - dir * riskDist * (0.3 + f * 0.5);
  const timeToTargetMins = targetReached ? Math.round(20 + f * 220) : null;

  const base = targetReached ? 68 : 34;
  const confBoost = Math.round(((e.confidence ?? 60) - 60) * 0.4);
  const accuracyScore = Math.max(5, Math.min(99, base + confBoost + Math.round(f * 16)));

  const note = targetReached
    ? "Price reached the planned target after the setup played out."
    : "Target was not reached; price stalled before the objective.";

  await prisma.journalOutcome.upsert({
    where: { entryId: id },
    create: {
      entryId: id,
      targetReached,
      mfe,
      mae,
      timeToTargetMins,
      accuracyScore,
      note,
    },
    update: { targetReached, mfe, mae, timeToTargetMins, accuracyScore, note, checkedAt: new Date() },
  });

  await createNotification({
    userId,
    type: "journal_outcome",
    title: "What Happened Next available",
    message: `Outcome analysis is ready for your ${e.pair} trade.`,
    actionUrl: `/journal/${id}`,
  });

  return getEntry(userId, id);
}

/* ── Stats ──────────────────────────────────────────────────────────────── */

const SESSION_BY_HOUR = (h: number): string => {
  if (h >= 7 && h < 12) return "London";
  if (h >= 12 && h < 17) return "New York";
  if (h >= 0 && h < 7) return "Tokyo";
  return "Sydney";
};

export async function computeStats(userId: string): Promise<JournalStats> {
  const rows = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      pair: true,
      resultType: true,
      resultR: true,
      createdAt: true,
      closedAt: true,
    },
  });

  const total = rows.length;
  const open = rows.filter((r) => r.resultType === "OPEN").length;
  const closed = rows.filter((r) => r.resultType !== "OPEN");
  const wins = closed.filter((r) => r.resultType === "WIN").length;
  const losses = closed.filter((r) => r.resultType === "LOSS").length;
  const rValues = closed.map((r) => r.resultR ?? 0);
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  const avgR = rValues.length
    ? Math.round((rValues.reduce((s, v) => s + v, 0) / rValues.length) * 100) / 100
    : 0;

  // Best pair by net R.
  const byPair = new Map<string, number>();
  const bySession = new Map<string, number>();
  for (const r of closed) {
    byPair.set(r.pair, (byPair.get(r.pair) ?? 0) + (r.resultR ?? 0));
    const sess = SESSION_BY_HOUR((r.closedAt ?? r.createdAt).getUTCHours());
    bySession.set(sess, (bySession.get(sess) ?? 0) + (r.resultR ?? 0));
  }
  const bestPair = topKey(byPair);
  const bestSession = topKey(bySession);

  // Cumulative R over closed trades (by close time).
  let running = 0;
  const cumulativeR = closed
    .slice()
    .sort((a, b) => (a.closedAt ?? a.createdAt).getTime() - (b.closedAt ?? b.createdAt).getTime())
    .map((r) => {
      running += r.resultR ?? 0;
      return {
        date: (r.closedAt ?? r.createdAt).toISOString().slice(0, 10),
        r: Math.round(running * 100) / 100,
      };
    });

  return {
    totalTrades: total,
    openTrades: open,
    closedTrades: closed.length,
    wins,
    losses,
    winRate,
    avgR,
    bestPair,
    bestSession,
    cumulativeR,
  };
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}
function appendNote(existing: string | null, addition: string): string {
  return existing ? `${existing}\n\n${addition}` : addition;
}
function topKey(m: Map<string, number>): string | null {
  let best: string | null = null;
  let bestV = -Infinity;
  for (const [k, v] of m) if (v > bestV) ((bestV = v), (best = k));
  return best;
}
