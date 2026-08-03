import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { revokePro } from "@/lib/admin/actions";

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;

  const body = (await req.json().catch(() => ({}))) as {
    identifier?: string;
    reason?: string;
  };
  if (!body.identifier) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await revokePro(gate.admin.id, {
    identifier: body.identifier,
    reason: body.reason,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
