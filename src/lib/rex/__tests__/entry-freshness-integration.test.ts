/**
 * Integration tests for Sprint 5 — Review Entry Freshness, wired into the
 * Sprint 4 market-price monitoring pipeline (recordMarketPriceObservations
 * in ../lifecycle.ts, which now also calls evaluateEntryFreshness).
 *
 * Like the other lifecycle test files, this requires a real, reachable
 * Postgres database and is deliberately NOT part of the default `npm test`
 * chain. Run with:
 *   NODE_OPTIONS="--require ./src/lib/rex/__tests__/stub-server-only.cjs" \
 *     npx tsx src/lib/rex/__tests__/entry-freshness-integration.test.ts
 * or:
 *   npm run test:entry-freshness-integration
 *
 * Scope: this file proves entryFreshness is correctly PERSISTED, correctly
 * ASSOCIATED with its own instrument, and correctly PRESERVES original
 * trade levels when driven through the real market-monitor pipeline. The
 * underlying classification logic itself (directional integrity,
 * staleness, stickiness/no-regression, idempotency) is already exhaustively
 * covered without a database in entry-freshness.test.ts (npm run
 * test:entry-freshness) — not re-derived here.
 *
 * Creates two throwaway User rows (fixed, clearly-tagged emails — deleted
 * before AND after this file runs) and real TradeSetupLifecycle rows under
 * them. Cleans up everything it created; never touches any pre-existing row.
 */
import { prisma } from "@/lib/prisma";
import {
  createOrGetSetupLifecycle,
  recordMarketPriceObservations,
  type CreateLifecycleInput,
} from "../lifecycle";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const EMAIL_A = "qa.entry-freshness.user-a@4rexvision.test";
const EMAIL_B = "qa.entry-freshness.user-b@4rexvision.test";

function bullishInput(userId: string, setupId: string, overrides: Partial<CreateLifecycleInput> = {}): CreateLifecycleInput {
  return {
    userId,
    setupId,
    pair: "EURUSD",
    timeframe: "H1",
    bias: "Bullish",
    entryZone: "1.2700 – 1.2710",
    invalidationZone: "1.2670 – 1.2680",
    target1: "1.2850 – 1.2860",
    target2: "1.2950 – 1.2960",
    entryMid: 1.2705,
    invalidationMid: 1.268,
    target1Mid: 1.2855,
    target2Mid: 1.2955,
    riskReward: "1:2.1",
    priceAtGeneration: 1.2706,
    generatedAt: new Date(), // "now" — comfortably within every expiry window
    ...overrides,
  };
}

function bearishInput(userId: string, setupId: string, overrides: Partial<CreateLifecycleInput> = {}): CreateLifecycleInput {
  return {
    userId,
    setupId,
    pair: "GBPUSD",
    timeframe: "H1",
    bias: "Bearish",
    entryZone: "1.2700 – 1.2710",
    invalidationZone: "1.2730 – 1.2740",
    target1: "1.2550 – 1.2560",
    target2: "1.2450 – 1.2460",
    entryMid: 1.2705,
    invalidationMid: 1.274,
    target1Mid: 1.2555,
    target2Mid: 1.2455,
    riskReward: "1:2.1",
    priceAtGeneration: 1.2706,
    generatedAt: new Date(),
    ...overrides,
  };
}

async function deleteTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B] } } });
}

async function rawLifecycle(id: string) {
  return prisma.tradeSetupLifecycle.findUniqueOrThrow({ where: { id } });
}

/** Push lastCheckedAt back in time so a subsequent call isn't gated by
 *  recordMarketPriceObservations' own MIN_MARKET_RECHECK_MS window — the
 *  same technique Sprint 4's own market-monitor.test.ts uses. */
async function backdateCheck(id: string, minutesAgo: number): Promise<void> {
  await prisma.tradeSetupLifecycle.update({
    where: { id },
    data: { lastCheckedAt: new Date(Date.now() - minutesAgo * 60 * 1000) },
  });
}

async function main() {
  await deleteTestUsers();
  const userA = await prisma.user.create({ data: { email: EMAIL_A } });
  const userB = await prisma.user.create({ data: { email: EMAIL_B } });

  try {
    // ── 0. Missing observations: a setup that has never been through the
    //       market monitor has entryFreshness: null, not a guess ─────────
    {
      const dto = await createOrGetSetupLifecycle(bullishInput(userA.id, "rex_eurusd_ef_0"));
      check("0a brand-new setup has no freshness verdict yet", dto?.entryFreshness === null);
    }

    // ── 1. Directional integrity through the real pipeline: bullish AND
    //       bearish setups, same monitor call shape, correct verdicts ────
    let bullId = "";
    let bearId = "";
    {
      const bull = await createOrGetSetupLifecycle(bullishInput(userA.id, "rex_eurusd_ef_1"));
      const bear = await createOrGetSetupLifecycle(bearishInput(userA.id, "rex_gbpusd_ef_1"));
      bullId = bull!.id;
      bearId = bear!.id;

      // Price inside the (identical-looking) 1.2700-1.2710 zone for BOTH —
      // same raw price, opposite instruments, must both read ENTRY_REACHED
      // (reaching is direction-agnostic; the directional check comes next).
      await recordMarketPriceObservations({ pair: "EURUSD", price: 1.2705, cycleId: "ef-cycle-1a" });
      await recordMarketPriceObservations({ pair: "GBPUSD", price: 1.2705, cycleId: "ef-cycle-1a" });

      const bullRow = await rawLifecycle(bullId);
      const bearRow = await rawLifecycle(bearId);
      check("1a bullish entry reached", bullRow.entryFreshness === "ENTRY_REACHED", String(bullRow.entryFreshness));
      check("1b bearish entry reached (same raw price)", bearRow.entryFreshness === "ENTRY_REACHED", String(bearRow.entryFreshness));

      // Now push price in OPPOSITE real-world directions for each (both
      // "missed" relative to their OWN bias) and confirm neither regresses
      // (stickiness) — reaching is permanent, so both stay ENTRY_REACHED.
      await backdateCheck(bullId, 20);
      await backdateCheck(bearId, 20);
      await recordMarketPriceObservations({ pair: "EURUSD", price: 1.29, cycleId: "ef-cycle-1b" }); // bullish: ran up
      await recordMarketPriceObservations({ pair: "GBPUSD", price: 1.26, cycleId: "ef-cycle-1b" }); // bearish: ran down
      const bullRow2 = await rawLifecycle(bullId);
      const bearRow2 = await rawLifecycle(bearId);
      check("1c bullish stays ENTRY_REACHED (sticky)", bullRow2.entryFreshness === "ENTRY_REACHED");
      check("1d bearish stays ENTRY_REACHED (sticky)", bearRow2.entryFreshness === "ENTRY_REACHED");
    }

    // ── 2. Correct instrument/pair association: a GBPUSD-pair monitor run
    //       must never touch a EURUSD setup's freshness, and vice versa ───
    let userBEurId = "";
    let userBGbpId = "";
    {
      const eur = await createOrGetSetupLifecycle(bullishInput(userB.id, "rex_eurusd_ef_2"));
      const gbp = await createOrGetSetupLifecycle(bearishInput(userB.id, "rex_gbpusd_ef_2"));
      userBEurId = eur!.id;
      userBGbpId = gbp!.id;

      // Only run the monitor for GBPUSD.
      await recordMarketPriceObservations({ pair: "GBPUSD", price: 1.2705, cycleId: "ef-cycle-2" });

      const eurRow = await rawLifecycle(userBEurId);
      const gbpRow = await rawLifecycle(userBGbpId);
      check("2a GBPUSD-only run updates the GBPUSD setup", gbpRow.entryFreshness === "ENTRY_REACHED");
      check(
        "2b GBPUSD-only run never touches the EURUSD setup's freshness",
        eurRow.entryFreshness === null && eurRow.lastCheckedAt === null
      );
    }

    // ── 3. Preservation of original trade levels through the freshness
    //       integration specifically (not just state/lastPrice) ──────────
    {
      const row = await rawLifecycle(userBGbpId);
      check(
        "3a original entry/invalidation/target levels untouched after freshness evaluation",
        row.entryZone === "1.2700 – 1.2710" &&
          row.invalidationZone === "1.2730 – 1.2740" &&
          row.target1 === "1.2550 – 1.2560" &&
          row.target2 === "1.2450 – 1.2460" &&
          row.invalidationMid === 1.274 &&
          row.target1Mid === 1.2555 &&
          row.target2Mid === 1.2455 &&
          row.bias === "Bearish" &&
          row.riskReward === "1:2.1"
      );
    }

    // ── 4. Repeated evaluation through the real pipeline is idempotent:
    //       re-running the SAME cycle must not change an already-resolved
    //       verdict, and a genuinely later cycle re-affirms it unchanged ──
    {
      const beforeId = userBGbpId;
      const before = await rawLifecycle(beforeId);
      check("4a precondition: already ENTRY_REACHED from section 2", before.entryFreshness === "ENTRY_REACHED");

      // Re-run the exact same cycle (upsert-in-place on the observation;
      // the setup itself is gated by MIN_MARKET_RECHECK_MS so this is a
      // cheap skip at the lifecycle row level too). Asserting `updated===0`
      // only (not an exact `skipped` count) — by this point in the suite
      // ANOTHER GBPUSD setup also exists from section 1, equally within
      // its own recheck window, so the precise skipped count depends on
      // how many GBPUSD setups the whole file has created so far; the
      // actual claim under test is "nothing was re-applied", not a count.
      const repeat = await recordMarketPriceObservations({ pair: "GBPUSD", price: 1.2705, cycleId: "ef-cycle-2" });
      check("4b immediate repeat is gated, not re-applied", repeat.updated === 0 && repeat.skipped >= 1, JSON.stringify(repeat));
      const afterRepeat = await rawLifecycle(beforeId);
      check("4c freshness unchanged by the gated repeat", afterRepeat.entryFreshness === "ENTRY_REACHED");

      // A genuinely later cycle, even with a price that LOOKS like a fresh
      // approach, must not un-reach the entry (stickiness survives the
      // real DB round-trip, not just the pure function in isolation).
      await backdateCheck(beforeId, 20);
      await recordMarketPriceObservations({ pair: "GBPUSD", price: 1.5, cycleId: "ef-cycle-3" });
      const afterLater = await rawLifecycle(beforeId);
      check("4d a later cycle still can't un-reach the entry (sticky across real DB calls)", afterLater.entryFreshness === "ENTRY_REACHED");
    }

    // ── 5. Invalidated and stale verdicts persist correctly end-to-end ───
    {
      const invDto = await createOrGetSetupLifecycle(bullishInput(userA.id, "rex_eurusd_ef_invalid"));
      await recordMarketPriceObservations({ pair: "EURUSD", price: 1.268, cycleId: "ef-cycle-inv" }); // at invalidationMid
      const invRow = await rawLifecycle(invDto!.id);
      check("5a invalidation persists through the real pipeline", invRow.entryFreshness === "INVALIDATED");

      // Stale: generatedAt far enough in the past that H1's 1440-minute
      // window (SNIPER_EXPIRY_MINUTES_BY_TIMEFRAME.H1) has elapsed.
      const staleDto = await createOrGetSetupLifecycle(
        bullishInput(userA.id, "rex_eurusd_ef_stale", {
          generatedAt: new Date(Date.now() - 1441 * 60 * 1000),
        })
      );
      // A "merely far away, not invalidated" price (see entry-freshness.test.ts).
      await recordMarketPriceObservations({ pair: "EURUSD", price: 1.2683, cycleId: "ef-cycle-stale" });
      const staleRow = await rawLifecycle(staleDto!.id);
      check("5b staleness persists through the real pipeline", staleRow.entryFreshness === "STALE", String(staleRow.entryFreshness));
    }
  } finally {
    await deleteTestUsers();
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    const total = passed + failures.length;
    // eslint-disable-next-line no-console
    console.log(`\nEntry Freshness Integration tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Entry Freshness Integration tests crashed:", err);
    process.exitCode = 1;
  });
