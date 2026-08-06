"use client";

import * as React from "react";
import type { NotificationDTO } from "@/lib/notifications/types";

const POLL_MS = 15_000;

/**
 * Near real-time notifications via polling. The unread badge count refreshes
 * every 15s (and on tab focus); the list is fetched on demand (panel open /
 * page load) and can be refreshed alongside.
 */
export function useNotifications() {
  const [count, setCount] = React.useState(0);
  const [items, setItems] = React.useState<NotificationDTO[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refreshCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      /* keep last-known */
    }
  }, []);

  const refreshList = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.notifications)) setItems(data.notifications);
    } catch {
      /* keep last-known */
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } finally {
      refreshCount();
    }
  }, [refreshCount]);

  const markRead = React.useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setCount((c) => Math.max(0, c - 1));
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
      } finally {
        refreshCount();
      }
    },
    [refreshCount]
  );

  // Badge auto-updates: poll every 15s + refresh when the tab regains focus.
  React.useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  return { count, items, loading, refreshCount, refreshList, markAllRead, markRead };
}
