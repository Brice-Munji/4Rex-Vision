"use client";

import * as React from "react";
import { Bell, CalendarClock, Info, CheckCircle2, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS, type NotificationTone } from "@/lib/dashboard-data";

const toneStyles: Record<NotificationTone, { icon: LucideIcon; className: string }> = {
  warning: { icon: CalendarClock, className: "bg-amber-500/10 text-amber-500" },
  info: { icon: Info, className: "bg-sky-500/10 text-sky-500" },
  success: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-500" },
};

export function NotificationsMenu() {
  const count = NOTIFICATIONS.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-500">
            {count} new
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-1 py-1">
          {NOTIFICATIONS.map((n) => {
            const tone = toneStyles[n.tone];
            const Icon = tone.icon;
            return (
              <div
                key={n.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    tone.className
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
              </div>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <button className="w-full rounded-xl px-3 py-2 text-center text-xs font-medium text-sky-500 transition-colors hover:bg-secondary">
          Mark all as read
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
