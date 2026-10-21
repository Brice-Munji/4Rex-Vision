/**
 * Focused tests for position sizing (Rex Scalping Sprint — account risk).
 * Pure/deterministic. Run with:
 *   npx tsx src/lib/rex/__tests__/position-size.test.ts
 */
import { computePositionSize, DEFAULT_RISK_PERCENT, DEFAULT_MIN_VOLUME_LOTS } from "../position-size";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

// 1. EURUSD, $10,000 balance, default 0.5% risk, 20-pip stop → known, sane result.
{
  const r = computePositionSize({
    pair: "EURUSD",
    accountBalance: 10_000,
    entryPrice: 1.1000,
    invalidationPrice: 1.0980, // 20 pips
  });
  check("1 ok", r.ok === true);
  if (r.ok) {
    check("1 riskAmount = 0.5% of 10,000", r.riskAmount === 50);
    check("1 stopPips = 20", Math.abs(r.stopPips - 20) < 0.001);
    check("1 pipValuePerLot = $10", r.pipValuePerLot === 10);
    // lots = 50 / (20 * 10) = 0.25
    check("1 lots = 0.25", Math.abs(r.lots - 0.25) < 0.001, `got ${r.lots}`);
    check("1 note discloses excluded costs", /spread|commission/i.test(r.note));
  }
}

// 2. Default risk percent constant is 0.5.
check("2 DEFAULT_RISK_PERCENT is 0.5", DEFAULT_RISK_PERCENT === 0.5);

// 3. Configurable risk % — doubling risk doubles lots.
{
  const base = { pair: "EURUSD", accountBalance: 10_000, entryPrice: 1.1000, invalidationPrice: 1.0980 };
  const r1 = computePositionSize({ ...base, riskPercent: 1 });
  const r05 = computePositionSize({ ...base, riskPercent: 0.5 });
  check("3 ok both", r1.ok && r05.ok);
  if (r1.ok && r05.ok) check("3 1% risk ⇒ ~2x the lots of 0.5%", Math.abs(r1.lots - r05.lots * 2) < 0.001);
}

// 4. XAU/USD — supported, documented $1/pip/lot convention.
{
  const r = computePositionSize({
    pair: "XAUUSD",
    accountBalance: 10_000,
    riskPercent: 1,
    entryPrice: 4180.0,
    invalidationPrice: 4170.0, // $10 = 1000 "pips" at 0.01 pip size
  });
  check("4 ok", r.ok === true);
  if (r.ok) {
    check("4 pipValuePerLot = $1", r.pipValuePerLot === 1);
    check("4 stopPips = 1000", Math.abs(r.stopPips - 1000) < 0.001);
    // lots = 100 / (1000 * 1) = 0.1
    check("4 lots = 0.1", Math.abs(r.lots - 0.1) < 0.001, `got ${r.lots}`);
  }
}

// 5. Non-USD quote currency (e.g. USDJPY) — pip value unknown without a live
//    conversion rate → explicitly rejected, never guessed.
{
  const r = computePositionSize({
    pair: "USDJPY",
    accountBalance: 10_000,
    entryPrice: 150.0,
    invalidationPrice: 149.5,
  });
  check("5 rejected for non-USD quote", r.ok === false);
  if (!r.ok) check("5 reason mentions conversion rate", /conversion rate/i.test(r.reason));
}

// 6. Below broker minimum volume → rejected, not silently rounded up.
{
  const r = computePositionSize({
    pair: "EURUSD",
    accountBalance: 100, // tiny account
    riskPercent: 0.5,
    entryPrice: 1.1000,
    invalidationPrice: 1.0500, // huge 500-pip stop
  });
  check("6 rejected below min volume", r.ok === false);
  if (!r.ok) check("6 reason mentions minimum", new RegExp(`${DEFAULT_MIN_VOLUME_LOTS}-lot minimum`).test(r.reason));
}

// 7. Invalid inputs — zero/negative balance, zero risk, zero stop distance.
check("7a zero balance rejected", computePositionSize({ pair: "EURUSD", accountBalance: 0, entryPrice: 1.1, invalidationPrice: 1.09 }).ok === false);
check("7b negative balance rejected", computePositionSize({ pair: "EURUSD", accountBalance: -500, entryPrice: 1.1, invalidationPrice: 1.09 }).ok === false);
check("7c zero risk rejected", computePositionSize({ pair: "EURUSD", accountBalance: 10_000, riskPercent: 0, entryPrice: 1.1, invalidationPrice: 1.09 }).ok === false);
check("7d zero stop distance rejected", computePositionSize({ pair: "EURUSD", accountBalance: 10_000, entryPrice: 1.1, invalidationPrice: 1.1 }).ok === false);

// 8. Unsupported/unrecognized pair format → rejected, not guessed.
check("8 unrecognized symbol rejected", computePositionSize({ pair: "BTC", accountBalance: 10_000, entryPrice: 1, invalidationPrice: 0.9 }).ok === false);

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nPosition-size tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exitCode = 1;
}
