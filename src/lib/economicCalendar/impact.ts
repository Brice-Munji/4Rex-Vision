import type { NormalizedImpact } from "./types";

/**
 * Deterministically map any provider's impact representation to our internal
 * scale. Never GUESS: an unrecognized value becomes "Unknown" (which the news
 * blocker treats as non-blocking), so a malformed value can't be misread as High.
 *
 * Handles: word labels ("High"/"Medium"/"Low"), numeric levels ("1"/"2"/"3"),
 * Forex Factory's "Holiday", and empty/garbage → "Unknown".
 */
export function normalizeImpact(raw: string | null | undefined): NormalizedImpact {
  if (raw == null) return "Unknown";
  const s = String(raw).trim().toLowerCase();
  if (s === "") return "Unknown";

  if (s === "high" || s === "3" || s === "red") return "High";
  if (s === "medium" || s === "moderate" || s === "2" || s === "orange" || s === "yellow")
    return "Medium";
  if (s === "low" || s === "1" || s === "gray" || s === "grey") return "Low";
  if (s === "holiday" || s === "non-economic" || s === "noneconomic" || s === "none" || s === "0")
    return "Non-Economic";

  return "Unknown";
}
