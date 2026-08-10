import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { getEconomicCalendar } from "@/lib/market/calendar";
import { maybeNotifyHighImpact } from "@/lib/market/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const payload = await getEconomicCalendar();

  // Fire an in-app alert if a high-impact event is <30 min away (dedup'd).
  await maybeNotifyHighImpact(access.user.id, payload.events);

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
