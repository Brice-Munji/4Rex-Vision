import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { getPayments } from "@/lib/admin/queries";

export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;
  const { searchParams } = new URL(req.url);
  const rows = await getPayments({
    provider: searchParams.get("provider") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json({ payments: rows });
}
