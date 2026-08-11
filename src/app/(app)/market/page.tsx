import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMarketAccess } from "@/lib/market/access";
import { MarketIntelligence } from "@/components/market/market-intelligence";
import { MarketLocked } from "@/components/market/market-locked";

export const metadata: Metadata = {
  title: "Market Intelligence · 4RexVision AI",
};

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const access = await getMarketAccess();
  if (!access) redirect("/login");

  // Market Intelligence is a Rex Pro feature — non-Pro users see a blurred
  // preview with an upgrade CTA; Pro users get the full live hub.
  if (!access.isPro) {
    return <MarketLocked />;
  }

  return <MarketIntelligence />;
}
