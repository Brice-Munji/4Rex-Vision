import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listNotifications, ensureExpiryNotification } from "@/lib/notifications/service";
import type { NotificationType } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Fire the "expiring soon" check opportunistically (idempotent, no cron).
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, currentPeriodEnd: true },
  });
  if (u) await ensureExpiryNotification(u);

  const { searchParams } = new URL(req.url);
  const read = searchParams.get("read");
  const { items, nextCursor } = await listNotifications(userId, {
    limit: Number(searchParams.get("limit")) || 20,
    cursor: searchParams.get("cursor"),
    type: (searchParams.get("type") as NotificationType) || null,
    read: read === "read" || read === "unread" ? read : null,
    search: searchParams.get("search"),
  });

  return NextResponse.json(
    { notifications: items, nextCursor },
    { headers: { "Cache-Control": "no-store" } }
  );
}
