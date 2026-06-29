import type { Metadata } from "next";
import { Globe, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { HIGH_IMPACT_EVENTS } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Market Intelligence · 4RexVision AI",
};

export default function MarketPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Globe className="h-5 w-5" />}
        title="Market Intelligence"
        description="Sentiment, sessions and the economic calendar at a glance."
      />

      <MarketOverview />

      <div className="rounded-3xl glass p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <CalendarClock className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold">Today&apos;s Economic Calendar</h2>
        </div>
        <div className="mt-4 divide-y divide-border/60">
          {HIGH_IMPACT_EVENTS.map((e) => (
            <div key={e.id} className="flex items-center gap-4 py-3">
              <span className="w-14 text-sm font-medium text-muted-foreground">
                {e.time}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                {e.currency}
              </span>
              <span className="flex-1 text-sm">{e.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                  e.impact === "high"
                    ? "bg-rose-500/10 text-rose-500"
                    : e.impact === "medium"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-sky-500/10 text-sky-500"
                }`}
              >
                {e.impact} impact
              </span>
            </div>
          ))}
        </div>
      </div>

      <ComingSoon
        title="Live market intelligence coming soon"
        description="Real-time sentiment, a streaming economic calendar and session heatmaps will plug in here."
        features={[
          "Live sentiment feeds",
          "Streaming calendar",
          "Session heatmaps",
          "Pair correlation maps",
        ]}
      />
    </div>
  );
}
