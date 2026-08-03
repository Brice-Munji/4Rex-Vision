"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  Crown,
  ScanLine,
  CalendarRange,
  DollarSign,
  Wallet,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AdminCard, TrendPill, formatCurrency, formatNumber } from "./ui";
import type { Kpi } from "@/lib/admin/queries";

const ICONS: Record<string, LucideIcon> = {
  total_users: Users,
  active_today: UserCheck,
  pro_users: Crown,
  analyses_today: ScanLine,
  analyses_month: CalendarRange,
  revenue_month: DollarSign,
  revenue_lifetime: Wallet,
  gemini_today: Sparkles,
};

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(display)}</>;
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, i) => {
        const Icon = ICONS[kpi.key] ?? Sparkles;
        const fmt = (n: number) =>
          kpi.format === "currency"
            ? formatCurrency(n, kpi.currency)
            : formatNumber(Math.round(n));
        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <AdminCard className="p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-[var(--a-muted)]">{kpi.label}</p>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--a-text)]">
                <CountUp value={kpi.value} format={fmt} />
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {kpi.deltas.map((d, j) => (
                  <TrendPill key={j} pct={d.pct} label={d.label} />
                ))}
              </div>
            </AdminCard>
          </motion.div>
        );
      })}
    </div>
  );
}
