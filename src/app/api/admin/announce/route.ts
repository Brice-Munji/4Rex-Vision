import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { sendAnnouncement, type AnnouncementAudience } from "@/lib/admin/actions";

const AUDIENCES: AnnouncementAudience[] = ["all", "pro"];

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    message?: string;
    audience?: string;
  };
  const audience = (body.audience ?? "all") as AnnouncementAudience;
  if (!body.title?.trim() || !body.message?.trim() || !AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await sendAnnouncement(gate.admin.id, {
    title: body.title,
    message: body.message,
    audience,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
