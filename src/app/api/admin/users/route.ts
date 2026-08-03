import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/guard";
import { getUsers, type UserFilter } from "@/lib/admin/queries";

export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if ("response" in gate) return gate.response;
  const { searchParams } = new URL(req.url);
  const rows = await getUsers({
    search: searchParams.get("search") ?? undefined,
    filter: (searchParams.get("filter") as UserFilter) ?? "all",
  });
  return NextResponse.json({ users: rows });
}
