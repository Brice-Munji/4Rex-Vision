import { NextResponse } from "next/server";
import { getMarketAccess } from "@/lib/market/access";
import { getMarketContext } from "@/lib/market/context";

export const dynamic = "force-dynamic";

/**
 * Journal-integration seam. Exposes current_session, news_risk_level,
 * pair_sentiment and correlation_flags for the future Smart Journal. Structured
 * now; the integration itself is intentionally not built yet.
 */
export async function GET() {
  const access = await getMarketAccess();
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isPro) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const context = await getMarketContext();
  return NextResponse.json(context, { headers: { "Cache-Control": "no-store" } });
}
