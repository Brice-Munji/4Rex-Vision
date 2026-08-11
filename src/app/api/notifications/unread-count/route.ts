import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUnreadCount, ensureExpiryNotification } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, currentPeriodEnd: true },
  });
  if (u) await ensureExpiryNotification(u);

  const count = await getUnreadCount(userId);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
