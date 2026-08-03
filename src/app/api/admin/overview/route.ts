import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { getOverview, getLiveActivity } from "@/lib/admin/queries";

export async function GET() {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;
  const [overview, activity] = await Promise.all([
    getOverview(),
    getLiveActivity(),
  ]);
  return NextResponse.json({ ...overview, activity });
}
