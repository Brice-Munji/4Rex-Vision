import "server-only";
import type { EconomicEventItem, MarketSession } from "./types";

/**
 * Economic Intelligence layer (Step 7).
 *
 * Deliberately provider-agnostic so a real calendar (Forex Factory,
 * TradingEconomics, …) can be plugged in later via `ECONOMIC_PROVIDER` without
 * touching the rest of the pipeline. Until one is configured, Rex is honest: it
 * does not invent specific releases — it points the user at their calendar and
 * flags the currencies to watch.
 */

export interface EconomicProvider {
  readonly name: string;
  getUpcoming(currencies: string[]): Promise<EconomicEventItem[]>;
}

const SESSION_BY_CURRENCY: Record<string, MarketSession> = {
  USD: "New York",
  CAD: "New York",
  EUR: "London",
  GBP: "London",
  CHF: "London",
  JPY: "Tokyo",
  AUD: "Sydney",
  NZD: "Sydney",
};

function sessionFor(currency: string): MarketSession {
  return SESSION_BY_CURRENCY[currency.toUpperCase()] ?? "London";
}

/** Default provider — no live feed, fully transparent. */
class UnconfiguredEconomicProvider implements EconomicProvider {
  readonly name = "none";
  async getUpcoming(currencies: string[]): Promise<EconomicEventItem[]> {
    return currencies.map((cur) => ({
      id: `econ-${cur}`,
      currency: cur.toUpperCase(),
      title: `${cur.toUpperCase()} economic releases`,
      impact: "High",
      time: "Check calendar",
      expectedVolatility: "Potential increased volatility",
      session: sessionFor(cur),
      explanation: `A live economic calendar isn't connected yet, so Rex won't guess specific events. Before trading, check a calendar such as Forex Factory or TradingEconomics for high-impact ${cur.toUpperCase()} news — releases can sharply increase volatility and make technical analysis less reliable immediately before and after.`,
    }));
  }
}

export function getEconomicProvider(): EconomicProvider {
  // Future: switch on process.env.ECONOMIC_PROVIDER (e.g. "forexfactory").
  return new UnconfiguredEconomicProvider();
}

/** Split a pair like "EUR/USD" or "EURUSD" into its two currencies. */
export function currenciesFromPair(pair: string | null | undefined): string[] {
  if (!pair) return [];
  const clean = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (clean.length >= 6) return [clean.slice(0, 3), clean.slice(3, 6)];
  if (pair.includes("/")) return pair.split("/").map((s) => s.trim().toUpperCase());
  return [];
}

export async function getEconomicContext(
  pair: string | null | undefined
): Promise<EconomicEventItem[]> {
  const currencies = currenciesFromPair(pair);
  if (currencies.length === 0) return [];
  return getEconomicProvider().getUpcoming(currencies);
}
