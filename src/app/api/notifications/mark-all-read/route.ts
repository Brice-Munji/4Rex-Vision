import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markAllRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
