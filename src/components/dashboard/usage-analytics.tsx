"use client";

import { StatCard } from "./stat-card";
import { USAGE_ANALYTICS } from "@/lib/billing-data";

export function UsageAnalytics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {USAGE_ANALYTICS.map((s, i) => (
        <StatCard
          key={s.key}
          index={i}
          label={s.label}
          value={s.value}
          suffix={s.suffix}
          icon={s.icon}
          accent={s.accent}
          delta={s.delta}
          countUp={typeof s.value === "number"}
        />
      ))}
    </div>
  );
}
