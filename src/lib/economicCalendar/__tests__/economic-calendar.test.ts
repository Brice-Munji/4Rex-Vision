/**
 * Deterministic tests for the economic-calendar core (STEP 11).
 * Runnable with:  npx tsx src/lib/economicCalendar/__tests__/economic-calendar.test.ts
 *
 * All timing uses a FIXED `now` — never Date.now()/browser time — so results are
 * reproducible regardless of the machine's timezone.
 */
import type { NormalizedEvent, RawProviderEvent } from "../types";
import { normalizeImpact } from "../impact";
import { currenciesForPair, isRelevant } from "../relevance";
import { normalizeEvents, toUtcIso, minutesUntil } from "../normalize";
import { evaluateNewsGuard } from "../blocking";

const NOW = new Date("2026-09-10T12:00:00.000Z"); // fixed server-UTC anchor

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

function evt(
  currency: string,
  impact: NormalizedEvent["impact"],
  minsFromNow: number,
  title = `${currency} event`
): NormalizedEvent {
  return {
    id: `${currency}:${title}:${minsFromNow}`,
    timestampUtc: new Date(NOW.getTime() + minsFromNow * 60000).toISOString(),
    currency,
    title,
    impact,
    actual: null,
    forecast: null,
    previous: null,
    source: "forexfactory",
  };
}
const guard = (
  events: NormalizedEvent[],
  pair: string,
  providerStatus: "live" | "stale" | "unavailable" = "live",
  config?: Parameters<typeof evaluateNewsGuard>[0]["config"]
) => evaluateNewsGuard({ events, pair, now: NOW, providerStatus, config });

// 1. GBPUSD + USD high 10m → BLOCK
check("1 GBPUSD+USD High 10m → BLOCK", guard([evt("USD", "High", 10)], "GBPUSD").state === "blocked");

// 2. GBPUSD + GBP high 15m → BLOCK
check("2 GBPUSD+GBP High 15m → BLOCK", guard([evt("GBP", "High", 15)], "GBPUSD").state === "blocked");

// 3. GBPUSD + USD high 45m → ALLOW
check("3 GBPUSD+USD High 45m → ALLOW", guard([evt("USD", "High", 45)], "GBPUSD").state === "clear");

// 4. GBPUSD + JPY high 10m → NOT RELEVANT
check("4 GBPUSD+JPY not relevant", isRelevant({ currency: "JPY" }, "GBPUSD") === false);
check("4 GBPUSD+JPY High 10m → not blocked", guard([evt("JPY", "High", 10)], "GBPUSD").state === "clear");

// 5. GBPUSD + USD medium 10m → WARNING ONLY (not blocked)
check("5 GBPUSD+USD Medium 10m → not blocked", guard([evt("USD", "Medium", 10)], "GBPUSD").state !== "blocked");
// ...but blocks if config opts into medium
check("5b medium blocks when configured", guard([evt("USD", "Medium", 10)], "GBPUSD", "live", { blockMediumImpact: true }).state === "blocked");

// 6. XAUUSD + USD high 10m → BLOCK
check("6 XAUUSD+USD High 10m → BLOCK", guard([evt("USD", "High", 10)], "XAUUSD").state === "blocked");

// 7. XAUUSD + EUR high 10m → NOT a direct blocker
check("7 XAUUSD+EUR not relevant", isRelevant({ currency: "EUR" }, "XAUUSD") === false);
check("7 XAUUSD+EUR High 10m → not blocked", guard([evt("EUR", "High", 10)], "XAUUSD").state === "clear");
check("7 XAUUSD currencies = [USD]", JSON.stringify(currenciesForPair("XAUUSD").currencies) === JSON.stringify(["USD"]));

// 8. Event already passed → do not block
check("8 passed USD High -5m → not blocked", guard([evt("USD", "High", -5)], "GBPUSD").state !== "blocked");

// 9. Timestamp conversion — independent of local TZ
check("9 FF offset → UTC", toUtcIso("2026-09-10T08:15:00-04:00") === "2026-09-10T12:15:00.000Z");
check("9 naive → UTC", toUtcIso("2026-09-10 12:30:00") === "2026-09-10T12:30:00.000Z");
check("9 minutesUntil from UTC", minutesUntil("2026-09-10T12:15:00.000Z", NOW) === 15);

// 10. Duplicate event → one normalized event
{
  const raw: RawProviderEvent = { currency: "USD", title: "CPI m/m", impactRaw: "High", dateRaw: "2026-09-10T13:30:00-04:00", forecast: "0.3%", previous: "0.2%" };
  const { events } = normalizeEvents([raw, { ...raw }], "forexfactory");
  check("10 duplicate → 1 event", events.length === 1, `got ${events.length}`);
}

// 11. Missing timestamp → invalid, no fabricated timestamp
{
  const { events, invalid } = normalizeEvents([{ currency: "USD", title: "Ghost", impactRaw: "High" }], "forexfactory");
  check("11 missing timestamp → 0 events", events.length === 0);
  check("11 marked missing-timestamp", invalid[0]?.reason === "missing-timestamp");
}

// 12. Invalid impact → never classified High
check("12 garbage impact → Unknown", normalizeImpact("banana") === "Unknown");
check("12 empty impact → Unknown", normalizeImpact("") === "Unknown");
{
  const e = evt("USD", "Unknown", 10);
  check("12 Unknown-impact event → not blocked", guard([e], "GBPUSD").state !== "blocked");
}

// 13. Provider unavailable → unavailable state (not "clear")
check("13 unavailable → unavailable", guard([], "GBPUSD", "unavailable").state === "unavailable");
check("13 unavailable + blockWhenUnavailable → blocked", guard([], "GBPUSD", "unavailable", { blockWhenUnavailable: true }).state === "blocked");

// 14. Revised event → updated, not duplicated
{
  const base: RawProviderEvent = { currency: "EUR", title: "Main Refinancing Rate", impactRaw: "High", dateRaw: "2026-09-10T08:15:00-04:00", forecast: "2.40%", previous: "2.40%" };
  const revised: RawProviderEvent = { ...base, forecast: "2.65%" }; // same id, updated forecast
  const { events } = normalizeEvents([base, revised], "forexfactory");
  check("14 revised → 1 event", events.length === 1, `got ${events.length}`);
  check("14 revised → forecast updated", events[0]?.forecast === "2.65%", `got ${events[0]?.forecast}`);
}

// Bonus: impact mapping table
check("impact High/Medium/Low/Holiday", normalizeImpact("High") === "High" && normalizeImpact("Medium") === "Medium" && normalizeImpact("Low") === "Low" && normalizeImpact("Holiday") === "Non-Economic");

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nEconomic Calendar tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exit(1);
}
