/**
 * Correlation Watch — lightweight static service for the MVP.
 *
 * Returns the key relationships as fixed coefficients today. The shape and the
 * `source` field are deliberately designed so a live rolling-correlation
 * calculation (e.g. Pearson over recent closes) can be swapped in behind
 * `getCorrelations` without any UI changes.
 */

import type { CorrelationsPayload, CorrelationView } from "./types";

// Static reference correlations (approximate typical FX/gold relationships).
const STATIC_CORRELATIONS: Omit<CorrelationView, "source">[] = [
  { id: "eurusd-gbpusd", a: "EURUSD", b: "GBPUSD", value: 0.91 },
  { id: "usdjpy-xauusd", a: "USDJPY", b: "XAUUSD", value: -0.62 },
  { id: "eurusd-xauusd", a: "EURUSD", b: "XAUUSD", value: -0.41 },
  { id: "gbpusd-xauusd", a: "GBPUSD", b: "XAUUSD", value: -0.38 },
];

/**
 * Current correlation matrix. MVP returns the static table; the async signature
 * lets a future implementation compute live coefficients from price history
 * without changing callers.
 */
export async function getCorrelations(
  now: Date = new Date()
): Promise<CorrelationsPayload> {
  const pairs: CorrelationView[] = STATIC_CORRELATIONS.map((c) => ({
    ...c,
    value: Math.round(c.value * 100) / 100,
    source: "static",
  }));

  return { pairs, updatedAt: now.toISOString() };
}
