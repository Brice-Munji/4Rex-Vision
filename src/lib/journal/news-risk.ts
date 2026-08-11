/**
 * Lightweight news-awareness system for the Smart Journal.
 *
 * We intentionally do NOT embed ForexFactory. Instead we expose a small
 * `EconomicCalendar` seam that returns high-impact events near a trade time.
 * A deterministic built-in calendar keeps the feature working today; swap
 * `defaultCalendar` for a real economic-calendar API later without touching
 * callers.
 */

export type NewsRisk = "LOW" | "MEDIUM" | "HIGH";

export interface EconomicEvent {
  currency: string; // "USD", "EUR", …
  title: string;
  impact: "High" | "Medium" | "Low";
  /** Minutes relative to the trade time (negative = before, positive = after). */
  offsetMinutes: number;
}

export interface EconomicCalendar {
  eventsNear(currencies: string[], at: Date): Promise<EconomicEvent[]> | EconomicEvent[];
}

/** Currencies embedded in a pair symbol like "EURUSD" or "XAUUSD". */
export function currenciesOf(pair: string): string[] {
  const s = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (s.startsWith("XAU") || s.startsWith("GOLD")) return ["USD", "XAU"];
  if (s.length >= 6) return [s.slice(0, 3), s.slice(3, 6)];
  return [s.slice(0, 3)];
}

const HIGH_IMPACT_BY_CCY: Record<string, string[]> = {
  USD: ["CPI m/m", "FOMC Statement", "Non-Farm Payrolls"],
  EUR: ["ECB Rate Decision", "German CPI"],
  GBP: ["BoE Rate Decision", "UK CPI"],
  JPY: ["BoJ Policy Rate", "Tokyo CPI"],
  AUD: ["RBA Rate Decision", "AU Employment"],
  NZD: ["RBNZ Rate Decision"],
  CAD: ["BoC Rate Decision", "CA Employment"],
  CHF: ["SNB Policy Rate"],
};

/**
 * Deterministic stand-in calendar. Uses the trade hour to decide whether a
 * high-impact event lands within ±2h — no randomness (safe for SSR) and no
 * external calls. Real API can replace this wholesale.
 */
export const defaultCalendar: EconomicCalendar = {
  eventsNear(currencies, at) {
    const hour = at.getUTCHours();
    const minute = at.getUTCMinutes();
    const out: EconomicEvent[] = [];
    // High-impact windows (UTC) commonly align with 12:30 (US data) and 14:00.
    const anchors = [
      { h: 12, m: 30 },
      { h: 14, m: 0 },
      { h: 8, m: 0 },
    ];
    for (const ccy of currencies) {
      const titles = HIGH_IMPACT_BY_CCY[ccy];
      if (!titles) continue;
      for (const a of anchors) {
        const offset = (a.h - hour) * 60 + (a.m - minute);
        if (Math.abs(offset) <= 120) {
          out.push({
            currency: ccy,
            title: titles[(a.h + a.m) % titles.length],
            impact: "High",
            offsetMinutes: offset,
          });
        }
      }
    }
    return out;
  },
};

export interface NewsAssessment {
  level: NewsRisk;
  events: EconomicEvent[];
  warning: string | null;
}

/**
 * Assess news risk for a trade: HIGH if a high-impact event for one of the
 * pair's currencies lands within ±2h (imminent if ≤30m), else LOW.
 */
export async function assessNewsRisk(
  pair: string,
  at: Date = new Date(),
  calendar: EconomicCalendar = defaultCalendar
): Promise<NewsAssessment> {
  const currencies = currenciesOf(pair);
  const events = (await calendar.eventsNear(currencies, at)) ?? [];
  const high = events.filter((e) => e.impact === "High");

  let level: NewsRisk = "LOW";
  let warning: string | null = null;

  if (high.length) {
    const nearest = high.reduce((a, b) =>
      Math.abs(a.offsetMinutes) <= Math.abs(b.offsetMinutes) ? a : b
    );
    const mins = Math.abs(nearest.offsetMinutes);
    level = mins <= 30 ? "HIGH" : "MEDIUM";
    const when =
      nearest.offsetMinutes >= 0
        ? `within ${mins} minutes`
        : `${mins} minutes before`;
    warning = `High-impact ${nearest.currency} news (${nearest.title}) is scheduled ${when} of this trade.`;
  }

  return { level, events, warning };
}
