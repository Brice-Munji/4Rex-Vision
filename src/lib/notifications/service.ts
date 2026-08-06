import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { NotificationDTO, NotificationType } from "./types";

/* ── Core CRUD ──────────────────────────────────────────────────────────── */

interface CreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Create one notification. Best-effort — never throws into the caller path. */
export async function createNotification(input: CreateInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl ?? null,
        metadata: input.metadata,
      },
    });
  } catch {
    // Notifications must never break the primary action.
  }
}

/** Bulk-create the same notification for many users (announcements). */
export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateInput, "userId">
): Promise<number> {
  if (!userIds.length) return 0;
  try {
    const res = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl ?? null,
        metadata: input.metadata,
      })),
    });
    return res.count;
  } catch {
    return 0;
  }
}

function toDTO(n: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    actionUrl: n.actionUrl,
    createdAt: n.createdAt.toISOString(),
  };
}

export interface ListOptions {
  limit?: number;
  cursor?: string | null; // id to paginate after
  type?: NotificationType | null;
  read?: "read" | "unread" | null;
  search?: string | null;
}

export async function listNotifications(
  userId: string,
  opts: ListOptions = {}
): Promise<{ items: NotificationDTO[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const where: Prisma.NotificationWhereInput = { userId };
  if (opts.type) where.type = opts.type;
  if (opts.read === "read") where.isRead = true;
  if (opts.read === "unread") where.isRead = false;
  if (opts.search) where.title = { contains: opts.search, mode: "insensitive" };

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toDTO);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/* ── Event helpers (auto-generated notifications) ───────────────────────── */

function formatDate(d: Date | null): string {
  if (!d) return "lifetime";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** 1 — Payment successful → Rex Pro activated. */
export function notifyPaymentSuccess(userId: string, periodEnd: Date | null) {
  return createNotification({
    userId,
    type: "pro_activated",
    title: "Rex Pro activated",
    message: `Your Pro subscription is now active until ${formatDate(periodEnd)}.`,
    actionUrl: "/billing",
    metadata: { periodEnd: periodEnd ? periodEnd.toISOString() : null },
  });
}

/** 2 — Admin grants Pro. */
export function notifyProGranted(userId: string) {
  return createNotification({
    userId,
    type: "pro_granted",
    title: "Rex Pro granted",
    message: "An administrator activated Rex Pro on your account.",
    actionUrl: "/billing",
  });
}

/** 3 — Admin revokes Pro. */
export function notifyProRevoked(userId: string) {
  return createNotification({
    userId,
    type: "pro_revoked",
    title: "Rex Pro revoked",
    message: "Your Pro access has been removed by an administrator.",
    actionUrl: "/billing",
  });
}

/** 5 — Analysis saved to history. */
export function notifyAnalysisSaved(userId: string, pair?: string | null) {
  return createNotification({
    userId,
    type: "analysis_saved",
    title: "Analysis saved",
    message: pair
      ? `Your ${pair} chart analysis was added to history.`
      : "Your latest chart analysis was added to history.",
    actionUrl: "/history",
  });
}

/** 6 — Journal outcome available. */
export function notifyJournalOutcome(userId: string) {
  return createNotification({
    userId,
    type: "journal_outcome",
    title: "Journal update available",
    message: "What Happened Next is now available for one of your trades.",
    actionUrl: "/journal",
  });
}

/**
 * 4 — Subscription expiring in ≤3 days. Idempotent per billing period: only
 * one notification is created for a given `currentPeriodEnd`. Called cheaply
 * from the polled endpoints so it fires without a cron.
 */
export async function ensureExpiryNotification(user: {
  id: string;
  plan: string;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  const end = user.currentPeriodEnd;
  if (!end || user.plan === "FREE") return;
  const now = Date.now();
  const msLeft = end.getTime() - now;
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  if (msLeft <= 0 || msLeft > THREE_DAYS) return;

  try {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "subscription_expiring",
        metadata: { path: ["periodEnd"], equals: end.toISOString() },
      },
      select: { id: true },
    });
    if (existing) return;
    await createNotification({
      userId: user.id,
      type: "subscription_expiring",
      title: "Subscription expiring soon",
      message: "Renew your Pro plan to keep unlimited access.",
      actionUrl: "/billing",
      metadata: { periodEnd: end.toISOString() },
    });
  } catch {
    // best-effort
  }
}
