"use client";

import * as React from "react";

/**
 * Animate a number from 0 to `end` once `active` becomes true.
 * Returns the current value; supports decimals via `decimals`.
 */
export function useCountUp(end: number, active: boolean, duration = 1000, decimals = 0) {
  const [value, setValue] = React.useState(0);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    let raf = 0;
    let startTime: number | null = null;

    const tick = (t: number) => {
      if (startTime === null) startTime = t;
      const progress = Math.min(1, (t - startTime) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(end * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end, duration]);

  return decimals > 0
    ? Number(value.toFixed(decimals))
    : Math.round(value);
}
