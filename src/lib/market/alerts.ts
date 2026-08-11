import "server-only";

/**
 * Auto-notify a user when a high-impact economic event is imminent (<30 min).
 *
 * Called cheaply from the polled /api/market/calendar route (no cron needed).
 * Idempotent per event: we tag the notification metadata with the event id and
 * skip if one already exists, so polling every 15 min won't spam duplicates.
 */

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/service";
import { affectedPairsFor } from "./insight";
import type { CalendarEvent } from "./types";

const IMMINENT_MINS = 30;

function pairsForNotification(ccy: string): string[] {
  // Notifications use XAUUSD (not the friendly "Gold") to match the app's tickers.
  return affectedPairsFor(ccy).map((p) => (p === "Gold" ? "XAUUSD" : p));
}

function humanList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Create an in-app notification for the nearest imminent high-impact event.
 * Best-effort; never throws into the request path.
 */
export async function maybeNotifyHighImpact(
  userId: string,
  events: CalendarEvent[]
): Promise<void> {
  try {
    const imminent = events
      .filter((e) => e.impact === "High" && e.minutesUntil >= 0 && e.minutesUntil <= IMMINENT_MINS)
      .sort((a, b) => a.minutesUntil - b.minutesUntil)[0];
    if (!imminent) return;

    // Dedup: one notification per (user, event id).
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "system_announcement",
        metadata: { path: ["eventId"], equals: imminent.id },
      },
      select: { id: true },
    });
    if (existing) return;

    const pairs = pairsForNotification(imminent.currency);
    const mins = Math.max(1, imminent.minutesUntil);
    await createNotification({
      userId,
      type: "system_announcement",
      title: "Upcoming High-Impact News",
      message: `${imminent.currency} ${imminent.event} in ${mins} minute${mins === 1 ? "" : "s"} may affect ${humanList(pairs)}.`,
      actionUrl: "/market",
      metadata: { kind: "market_high_impact", eventId: imminent.id, currency: imminent.currency },
    });
  } catch {
    // Notifications must never break the calendar request.
  }
}
