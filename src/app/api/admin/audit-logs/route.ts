import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { getAuditLogs } from "@/lib/admin/queries";

export async function GET() {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;
  return NextResponse.json({ logs: await getAuditLogs() });
}
