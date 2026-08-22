"use client";

import { useEffect, useRef } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { NetworkErrorSuppressor } from "./network-error-suppressor";

/**
 * Non-blocking connectivity UI, mounted app-wide (user dashboard + Owner
 * Command Center). Shows a clear "You're offline" banner while the connection
 * is down and a brief "Back online" toast when it returns. It never blocks the
 * page — already-loaded data stays usable while offline.
 *
 * Uses fixed self-contained colors so it reads correctly on any surface,
 * including the admin portal's dark scope, without touching the existing UI.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("Back online", {
        description: "Your connection has been restored.",
        duration: 2500,
      });
    }
  }, [online]);

  return (
    <>
      {/* Keeps expected offline fetch failures out of the global error counter. */}
      <NetworkErrorSuppressor />

      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex max-w-[440px] items-start gap-3 rounded-2xl border border-amber-500/40 bg-[#1c1917]/95 px-4 py-3 text-amber-50 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <WifiOff className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">You&rsquo;re offline</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-100/80">
                Check your internet connection. Some features may be unavailable until you
                reconnect.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
