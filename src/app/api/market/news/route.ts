import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { getUpcomingNews } from "@/lib/market/news";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json(getUpcomingNews(), {
    headers: { "Cache-Control": "no-store" },
  });
}
