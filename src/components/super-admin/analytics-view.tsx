"use client";

import { AdminCard, SectionTitle, formatCurrency } from "./ui";
import { AreaChart, BarList, Donut } from "./charts";
import type { AnalyticsData } from "@/lib/admin/queries";

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminCard className="p-5 lg:col-span-2">
          <SectionTitle>User Growth · Last 30 days</SectionTitle>
          <div className="mt-4">
            <AreaChart data={data.userGrowth} valueKey="total" labelKey="date" height={240} />
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col items-center justify-center gap-3 p-5">
          <SectionTitle>Pro Conversion</SectionTitle>
          <Donut value={data.proConversionRate} sublabel="of users" size={150} stroke={14} />
          <p className="text-center text-xs text-[var(--a-muted)]">
            Share of accounts on Rex Pro
          </p>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard className="p-5">
          <SectionTitle>Daily Analyses</SectionTitle>
          <div className="mt-4">
            <AreaChart data={data.dailyAnalyses} valueKey="count" labelKey="date" height={200} color="#22c55e" />
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <SectionTitle>Revenue Trend · Last 12 months</SectionTitle>
          <div className="mt-4">
            <AreaChart
              data={data.revenueTrend}
              valueKey="value"
              labelKey="date"
              height={200}
              color="#f59e0b"
              format={(n) => formatCurrency(n)}
            />
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <SectionTitle>Top Currency Pairs</SectionTitle>
          <div className="mt-4">
            <BarList data={data.topPairs} />
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <SectionTitle>Top Timeframes</SectionTitle>
          <div className="mt-4">
            <BarList data={data.topTimeframes} color="#8b5cf6" />
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-5">
        <SectionTitle>Country Distribution</SectionTitle>
        {data.countryDistribution.length ? (
          <div className="mt-4">
            <BarList data={data.countryDistribution} color="#06b6d4" />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--a-muted)]">
            Geographic data isn&apos;t being captured yet. Add IP-based geolocation at
            sign-in to populate this chart.
          </p>
        )}
      </AdminCard>
    </div>
  );
}
