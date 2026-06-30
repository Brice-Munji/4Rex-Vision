"use client";

import { motion } from "framer-motion";
import { Bell, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BILLING_NOTIFICATIONS } from "@/lib/billing-data";

const toneStyles: Record<string, { icon: LucideIcon; wrap: string }> = {
  success: { icon: CheckCircle2, wrap: "bg-emerald-500/10 text-emerald-500" },
  info: { icon: Info, wrap: "bg-sky-500/10 text-sky-500" },
};

export function BillingActivity() {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <Bell className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">Billing activity</h3>
      </div>

      <div className="mt-4 space-y-2.5">
        {BILLING_NOTIFICATIONS.map((n, i) => {
          const tone = toneStyles[n.tone] ?? toneStyles.info;
          const Icon = tone.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-3"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone.wrap)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{n.timeAgo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{n.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
