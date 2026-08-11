"use client";

import * as React from "react";
import { formatDate, relativeTime } from "./ui";

/**
 * Hydration-safe relative timestamp.
 *
 * `relativeTime()` depends on `Date.now()`, so rendering it during SSR and then
 * re-rendering on the client produces different strings ("2m ago" vs "3m ago")
 * and trips React's hydration check. To stay deterministic, the server and the
 * first client render both emit the absolute (UTC-stable) date; only after the
 * component mounts do we swap in the live relative string and keep it fresh.
 */
export function RelativeTime({ iso }: { iso: string | null }) {
  // 0 = not yet mounted (SSR + first client render). A monotonically
  // increasing tick both flips us to the relative label after mount and keeps
  // it fresh on an interval.
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    setTick((t) => t + 1);
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Pre-mount (and SSR): deterministic absolute date → matches on both sides.
  return (
    <span suppressHydrationWarning>
      {tick === 0 ? formatDate(iso) : relativeTime(iso)}
    </span>
  );
}
