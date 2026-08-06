"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationIcon } from "@/components/notifications/icon";
import { useNotifications } from "@/components/notifications/use-notifications";
import { relativeTimeShort } from "@/lib/notifications/types";

export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { count, items, loading, refreshList, refreshCount, markAllRead, markRead } =
    useNotifications();

  // Load + poll the list only while the panel is open.
  React.useEffect(() => {
    if (!open) return;
    refreshList();
    const id = setInterval(refreshList, 15_000);
    return () => clearInterval(id);
  }, [open, refreshList]);

  function onItemClick(id: string, actionUrl: string | null, isRead: boolean) {
    if (!isRead) markRead(id);
    setOpen(false);
    if (actionUrl) router.push(actionUrl);
  }

  const badge = count > 99 ? "99+" : String(count);

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) refreshCount(); }}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-primary-foreground shadow-sm">
              {badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="flex items-center gap-2">
            Notifications
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {count} new
              </span>
            )}
          </span>
          <button
            onClick={() => markAllRead()}
            disabled={count === 0}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[22rem] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
                </>
              )}
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => onItemClick(n.id, n.actionUrl, n.isRead)}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary",
                  !n.isRead && "bg-primary/[0.04]"
                )}
              >
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTimeShort(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                )}
              </button>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block w-full rounded-b-xl px-3 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:bg-secondary"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
