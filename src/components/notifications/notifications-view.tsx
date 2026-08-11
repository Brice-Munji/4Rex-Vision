"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, CheckCheck, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationIcon } from "./icon";
import {
  relativeTimeShort,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABEL,
  type NotificationDTO,
  type NotificationType,
} from "@/lib/notifications/types";

type ReadFilter = "all" | "unread" | "read";

export function NotificationsView() {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationDTO[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [initialLoaded, setInitialLoaded] = React.useState(false);

  const [type, setType] = React.useState<NotificationType | "all">("all");
  const [read, setRead] = React.useState<ReadFilter>("all");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce the title search.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const buildUrl = React.useCallback(
    (nextCursor?: string | null) => {
      const p = new URLSearchParams({ limit: "20" });
      if (type !== "all") p.set("type", type);
      if (read !== "all") p.set("read", read);
      if (debouncedSearch) p.set("search", debouncedSearch);
      if (nextCursor) p.set("cursor", nextCursor);
      return `/api/notifications?${p.toString()}`;
    },
    [type, read, debouncedSearch]
  );

  const load = React.useCallback(
    async (reset: boolean) => {
      try {
        setLoading(true);
        const res = await fetch(buildUrl(reset ? null : cursor), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const fresh: NotificationDTO[] = data.notifications ?? [];
        setItems((prev) => (reset ? fresh : [...prev, ...fresh]));
        setCursor(data.nextCursor ?? null);
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [buildUrl, cursor]
  );

  // Reload from scratch whenever a filter changes.
  React.useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, read, debouncedSearch]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
  }

  function onItemClick(n: NotificationDTO) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
    }
    if (n.actionUrl) router.push(n.actionUrl);
  }

  const readTabs: { key: ReadFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "read", label: "Read" },
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-card/50 p-1">
          {readTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRead(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                read === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="h-10 w-full rounded-xl border border-input bg-card/50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 sm:w-56"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NotificationType | "all")}
            className="h-10 rounded-xl border border-input bg-card/50 px-3 text-sm outline-none transition-colors focus:border-primary/60"
          >
            <option value="all">All types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <button
            onClick={markAllRead}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        </div>
      </div>

      {/* List */}
      {initialLoaded && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl glass p-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No notifications match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n, i) => (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
              onClick={() => onItemClick(n)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl glass p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30",
                !n.isRead && "border-primary/20 bg-primary/[0.04]"
              )}
            >
              <NotificationIcon type={n.type} size="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTimeShort(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
              </div>
              {!n.isRead && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
              )}
            </motion.button>
          ))}

          {cursor && (
            <div className="pt-2 text-center">
              <button
                onClick={() => load(false)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </button>
            </div>
          )}

          {loading && items.length === 0 && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
