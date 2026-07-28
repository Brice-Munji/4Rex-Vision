"use client";

import { motion } from "framer-motion";
import { Bell, CalendarClock, Info, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS, type NotificationTone } from "@/lib/dashboard-data";

const toneStyles: Record<
  NotificationTone,
  { icon: LucideIcon; wrap: string; border: string }
> = {
  warning: {
    icon: CalendarClock,
    wrap: "bg-amber-500/10 text-amber-500",
    border: "border-amber-500/20",
  },
  info: {
    icon: Info,
    wrap: "bg-sky-500/10 text-sky-500",
    border: "border-sky-500/20",
  },
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-500/10 text-emerald-500",
    border: "border-emerald-500/20",
  },
};

export function NotificationsCard() {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <h2 className="text-sm font-semibold">Notifications</h2>
      </div>

      <div className="mt-4 space-y-2.5">
        {NOTIFICATIONS.map((n, i) => {
          const tone = toneStyles[n.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-card/40 p-3 transition-colors hover:bg-card/70",
                tone.border
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  tone.wrap
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {n.timeAgo}
                  </span>
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
