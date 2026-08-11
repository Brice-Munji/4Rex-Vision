import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { grantPro, type GrantDuration } from "@/lib/admin/actions";

const DURATIONS: GrantDuration[] = ["7d", "30d", "90d", "1y", "lifetime"];

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    duration?: string;
    reason?: string;
  };
  if (!body.identifier || !DURATIONS.includes(body.duration as GrantDuration)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await grantPro(gate.admin.id, {
    identifier: body.identifier,
    duration: body.duration as GrantDuration,
    reason: body.reason,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
