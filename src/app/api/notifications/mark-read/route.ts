import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) ids = body.ids.filter((x: unknown) => typeof x === "string");
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  await markRead(session.user.id, ids);
  return NextResponse.json({ ok: true });
}
