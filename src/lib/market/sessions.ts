/**
 * Active Trading Sessions — computed locally from the current UTC time.
 *
 * Pure and isomorphic (no DB, no `server-only`) so the client card can recompute
 * on a local interval without a round-trip. Session windows are the widely-used
 * FX conventions in UTC.
 */

import type {
  ActivityLevel,
  SessionName,
  SessionsPayload,
  SessionStatus,
  SessionView,
} from "./types";

interface SessionDef {
  name: SessionName;
  open: number; // UTC hour (inclusive)
  close: number; // UTC hour (exclusive)
}

// Standard FX session windows (UTC). London/New York overlap 13:00–16:00 is the
// deepest-liquidity, highest-volatility part of the day.
const SESSION_DEFS: SessionDef[] = [
  { name: "Tokyo", open: 0, close: 9 },
  { name: "London", open: 7, close: 16 },
  { name: "New York", open: 13, close: 22 },
];

const LONDON_NY_OVERLAP: [number, number] = [13, 16];
const TOKYO_LONDON_OVERLAP: [number, number] = [7, 9];

function inWindow(hour: number, open: number, close: number): boolean {
  return open <= close
    ? hour >= open && hour < close
    : hour >= open || hour < close; // handles wrap-around (none today, but safe)
}

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

/**
 * Compute every session's live state for the given moment. Activity blends
 * openness with overlap boosts; the single highest-scoring open session is
 * flagged `active` (the one that gets the blue glow in the UI).
 */
/** "Opening Soon" window — this many minutes before a session opens. */
const OPENING_SOON_MINS = 30;

export function computeSessions(now: Date = new Date()): SessionsPayload {
  const hour = now.getUTCHours();
  const nowMin = hour * 60 + now.getUTCMinutes();
  const londonNyOverlap =
    hour >= LONDON_NY_OVERLAP[0] && hour < LONDON_NY_OVERLAP[1];
  const tokyoLondonOverlap =
    hour >= TOKYO_LONDON_OVERLAP[0] && hour < TOKYO_LONDON_OVERLAP[1];

  const scored = SESSION_DEFS.map((def) => {
    const open = inWindow(hour, def.open, def.close);
    // Minutes until this session's next open (wraps past midnight).
    const openMin = def.open * 60;
    const minsToOpen = openMin >= nowMin ? openMin - nowMin : openMin + 1440 - nowMin;
    const openingSoon = !open && minsToOpen <= OPENING_SOON_MINS;

    const peak =
      open && londonNyOverlap && (def.name === "London" || def.name === "New York");

    let score = open ? 45 : openingSoon ? 20 : 8;
    // Overlaps concentrate volume — reward the sessions taking part.
    if (peak) score += 45;
    if (open && tokyoLondonOverlap && (def.name === "Tokyo" || def.name === "London")) {
      score += 25;
    }
    const progressPct = Math.min(100, score);
    const activity: ActivityLevel =
      score >= 75 ? "High" : score >= 40 ? "Medium" : "Low";
    const status: SessionStatus = peak
      ? "Peak Volatility"
      : open
        ? "Active"
        : openingSoon
          ? "Opening Soon"
          : "Closed";

    return { def, open, score, progressPct, activity, status };
  });

  const openSessions = scored.filter((s) => s.open);
  const top = openSessions.reduce<(typeof scored)[number] | null>(
    (best, s) => (best === null || s.score > best.score ? s : best),
    null
  );

  const sessions: SessionView[] = scored.map((s) => ({
    name: s.def.name,
    open: s.open,
    activity: s.activity,
    status: s.status,
    active: top !== null && s.def.name === top.def.name,
    progressPct: s.progressPct,
    openUtc: `${pad(s.def.open)}:00`,
    closeUtc: `${pad(s.def.close)}:00`,
  }));

  return {
    sessions,
    mostActive: top ? top.def.name : null,
    overlap: londonNyOverlap,
    updatedAt: now.toISOString(),
  };
}
