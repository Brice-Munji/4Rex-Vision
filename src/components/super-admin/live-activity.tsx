"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScanLine, Crown, CreditCard, UserPlus, AlertTriangle, type LucideIcon } from "lucide-react";
import { AdminCard, SectionTitle, relativeTime } from "./ui";
import type { ActivityItem } from "@/lib/admin/queries";

const META: Record<ActivityItem["type"], { icon: LucideIcon; color: string }> = {
  analysis: { icon: ScanLine, color: "text-[#3b82f6] bg-[#3b82f6]/10" },
  upgrade: { icon: Crown, color: "text-amber-400 bg-amber-400/10" },
  payment: { icon: CreditCard, color: "text-emerald-400 bg-emerald-400/10" },
  signup: { icon: UserPlus, color: "text-sky-400 bg-sky-400/10" },
  limit: { icon: AlertTriangle, color: "text-rose-400 bg-rose-400/10" },
};

export function LiveActivity({ initial }: { initial: ActivityItem[] }) {
  const [items, setItems] = React.useState<ActivityItem[]>(initial);
  const [live, setLive] = React.useState(true);

  React.useEffect(() => {
    if (!live) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/live-activity", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.activity)) setItems(data.activity);
        }
      } catch {
        /* ignore transient errors */
      }
    }, 15000);
    return () => clearInterval(id);
  }, [live]);

  return (
    <AdminCard className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>Live Activity</SectionTitle>
        <button
          onClick={() => setLive((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--a-muted)] transition-colors hover:text-[var(--a-text)]"
        >
          <span
            className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-zinc-500"}`}
          />
          {live ? "Live" : "Paused"}
        </button>
      </div>

      <div className="-mr-2 max-h-[420px] flex-1 space-y-1 overflow-y-auto pr-2">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--a-muted)]">
            No recent activity yet.
          </p>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const meta = META[item.type];
            const Icon = meta.icon;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--a-surface-2)]"
              >
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--a-text)]">
                    <span className="font-medium">{item.user}</span>{" "}
                    <span className="text-[var(--a-muted)]">{item.detail}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--a-muted)]">
                  {relativeTime(item.time)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AdminCard>
  );
}
