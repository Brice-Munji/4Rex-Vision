"use client";

import { useEffect } from "react";

/**
 * Keeps EXPECTED network failures (offline / dropped connection) out of the
 * global error surface (dev error overlay counter, console noise) by handling
 * the matching `unhandledrejection` / `error` events. Only failures that look
 * like network/fetch errors are swallowed — genuine application errors are left
 * untouched so normal error handling is preserved.
 */
const NETWORK_ERROR = /failed to fetch|networkerror|network request failed|load failed|fetch failed|the (?:network|internet) connection|err_internet_disconnected|err_network/i;

function looksLikeNetworkError(value: unknown): boolean {
  if (!value) return false;
  const msg =
    value instanceof Error
      ? `${value.name}: ${value.message}`
      : typeof value === "string"
        ? value
        : typeof (value as { message?: unknown }).message === "string"
          ? (value as { message: string }).message
          : "";
  return NETWORK_ERROR.test(msg);
}

export function NetworkErrorSuppressor() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (looksLikeNetworkError(e.reason)) e.preventDefault();
    };
    const onError = (e: ErrorEvent) => {
      if (looksLikeNetworkError(e.error ?? e.message)) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
