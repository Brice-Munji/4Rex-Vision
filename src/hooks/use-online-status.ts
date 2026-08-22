"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the browser's connectivity via `navigator.onLine` and the
 * `online` / `offline` events. Defaults to `true` for SSR / first paint so the
 * offline UI never flashes before hydration.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    // Reconcile with the real value right after mount.
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
