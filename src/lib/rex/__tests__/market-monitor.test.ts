/**
 * Integration tests for Sprint 4 — Market Price Monitoring
 * (recordMarketPriceObservations / getDistinctTrackedPairs in ../lifecycle.ts).
 *
 * Like the other lifecycle test files, this requires a real, reachable
 * Postgres database and is deliberately NOT part of the default `npm test`
 * chain. Run with:
 *   NODE_OPTIONS="--require ./src/lib/rex/__tests__/stub-server-only.cjs" \
 *     npx tsx src/lib/rex/__tests__/market-monitor.test.ts
 * or:
 *   npm run test:market-monitor
 *
 * Scope: this file proves the PERSISTENCE/CLASSIFICATION layer that the
 * market-price monitor route (src/app/api/rex/market-monitor/route.ts)
 * calls once it already has an externally-validated price. Symbol
 * validation, staleness/invalid-response rejection, and correct-instrument
 * checks against the PROVIDER's own response live entirely in
 * src/lib/market/forex-price.ts and are covered by its own pure test file
 * (npm run test:price-feed) — not re-tested here with real network calls.
 *
 * Sprint 5.1: this file (alongside entry-freshness-integration.test.ts) is
 * one of the two files that call recordMarketPriceObservations(), the
 * deliberately pair-wide (not user-scoped) function whose production
 * behavior caused the Sprint 5 incident — a test fixture using a real
 * instrument name ("GBPUSD") collided with and overwrote a real user's
 * live row because this file ran against the shared dev database. Two
 * independent layers now prevent a repeat:
 *   1. test-db-guard (imported FIRST, below) fails closed before this file
 *      can reach any database other than a dedicated TEST_DATABASE_URL.
 *   2. Defense in depth even if layer 1 is somehow misconfigured: pair
 *      fixtures below use a ZZTEST_ prefix that can never collide with a
 *      real tradable instrument, instead of bare "EURUSD"/"GBPUSD"/"USDJPY".
 *
 * Creates two throwaway User rows (unique-per-run, clearly-tagged emails —
 * swept before this file runs and deleted after) and real
 * TradeSetupLifecycle / SetupLifecycleObservation rows under them. Cleans
 * up everything it created; never touches any pre-existing row.
 */
import { scopedTestEmail } from "./test-db-guard";
import { prisma } from "@/lib/prisma";
import {
  createOrGetSetupLifecycle,
  recordMarketPriceObservations,
  getDistinctTrackedPairs,
  type CreateLifecycleInput,
} from "../lifecycle";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

/** Can never collide with a real tradable instrument (see file header). */
const ZZTEST_EURUSD = "ZZTEST_EURUSD";
const ZZTEST_GBPUSD = "ZZTEST_GBPUSD";
const ZZTEST_USDJPY = "ZZTEST_USDJPY";
const ZZTEST_NOBODY_TRACKS_THIS = "ZZTEST_NOBODY_TRACKS_THIS";

const EMAIL_PREFIX_A = "qa.market-monitor.user-a";
const EMAIL_PREFIX_B = "qa.market-monitor.user-b";
const EMAIL_A = scopedTestEmail(EMAIL_PREFIX_A);
const EMAIL_B = scopedTestEmail(EMAIL_PREFIX_B);

/** Same EURUSD fixture numbers used elsewhere in this test suite
 *  (lifecycle-ownership.test.ts) for consistency: Bullish, entry zone
 *  1.2700-1.2710, invalidation 1.2680, target1 1.2855, target2 1.2955. */
function lifecycleInput(userId: string, setupId: string, overrides: Partial<CreateLifecycleInput> = {}): CreateLifecycleInput {
  return {
    userId,
    setupId,
    pair: ZZTEST_EURUSD,
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
    generatedAt: new Date("2026-11-18T12:00:00.000Z"),
    ...overrides,
  };
}

/** Pre-run sweep: catches a previous (e.g. crashed) run's leftovers
 *  regardless of ITS run tag. Safe only because test-db-guard has already
 *  confirmed this process is connected to the dedicated test database,
 *  never dev/production — see file header. */
async function sweepPriorRuns(): Promise<void> {
  await prisma.user.deleteMany({
    where: { OR: [{ email: { startsWith: `${EMAIL_PREFIX_A}.` } }, { email: { startsWith: `${EMAIL_PREFIX_B}.` } }] },
  });
}

/** Post-run cleanup: exact match on THIS run's own uniquely-tagged emails
 *  only, so it can never delete a concurrently-running execution of this
 *  same file's still-in-flight fixtures. */
async function deleteOwnTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B] } } });
}

/** Directly fetch the raw row (bypassing the DTO) for assertions that need
 *  the real Prisma shape, e.g. lastCheckedAt as a Date for arithmetic. */
async function rawLifecycle(id: string) {
  return prisma.tradeSetupLifecycle.findUniqueOrThrow({ where: { id }, include: { observations: true } });
}

async function main() {
  await sweepPriorRuns();
  const userA = await prisma.user.create({ data: { email: EMAIL_A } });
  const userB = await prisma.user.create({ data: { email: EMAIL_B } });

  try {
    // ── 0. A pair with no tracked setups at all is a cheap, honest no-op ──
    {
      const result = await recordMarketPriceObservations({ pair: ZZTEST_NOBODY_TRACKS_THIS, price: 1, cycleId: "cycle-0" });
      check("0a no candidates → updated:0", result.updated === 0);
      check("0b no candidates → skipped:0", result.skipped === 0);
      check("0c no candidates → failed:false (empty is not an error)", result.failed === false);
    }

    // ── 1. Successful retrieval+persistence, correct state transition, and
    //       original-level preservation, all from ONE externally-sourced
    //       price reading ────────────────────────────────────────────────
    let setupA1Id = "";
    {
      const dto = await createOrGetSetupLifecycle(lifecycleInput(userA.id, "rex_eurusd_mm_1"));
      check("1a setup created", dto !== null);
      setupA1Id = dto!.id;
      check("1b starts ACTIVE with no observations", dto!.state === "ACTIVE" && dto!.observations.length === 0);

      // 1.2860 >= target1Mid(1.2855) and < target2Mid(1.2955) → TP1_HIT.
      const result = await recordMarketPriceObservations({ pair: ZZTEST_EURUSD, price: 1.286, cycleId: "cycle-1" });
      check("1c one setup updated", result.updated === 1 && result.skipped === 0 && !result.failed, JSON.stringify(result));

      const row = await rawLifecycle(setupA1Id);
      check("1d state advanced to TP1_HIT", row.state === "TP1_HIT", row.state);
      check("1e lastPrice recorded", row.lastPrice === 1.286, String(row.lastPrice));
      check("1f lastCheckedAt stamped", row.lastCheckedAt !== null);
      check("1g exactly one observation persisted", row.observations.length === 1, String(row.observations.length));
      check("1h observation tagged source: market_data", row.observations[0]?.source === "market_data", row.observations[0]?.source);
      check("1i observation price matches", row.observations[0]?.price === 1.286);
      check("1j observation state matches", row.observations[0]?.state === "TP1_HIT");

      // Original levels must be byte-for-byte unchanged — monitoring only
      // ever touches state/lastPrice/lastCheckedAt + the observation log.
      check(
        "1k original entry/invalidation/target levels untouched",
        row.entryZone === "1.2700 – 1.2710" &&
          row.invalidationZone === "1.2670 – 1.2680" &&
          row.target1 === "1.2850 – 1.2860" &&
          row.target2 === "1.2950 – 1.2960" &&
          row.entryMid === 1.2705 &&
          row.invalidationMid === 1.268 &&
          row.target1Mid === 1.2855 &&
          row.target2Mid === 1.2955 &&
          row.riskReward === "1:2.1" &&
          row.bias === "Bullish"
      );
    }

    // ── 2. Pair-wide, cross-user application + correct instrument/pair
    //       association: userB's EURUSD setup is updated by the SAME call
    //       shape; userB's GBPUSD setup (different pair) must be untouched ─
    let userBEurId = "";
    let userBGbpId = "";
    {
      const eurDto = await createOrGetSetupLifecycle(lifecycleInput(userB.id, "rex_eurusd_mm_userb"));
      const gbpDto = await createOrGetSetupLifecycle(
        lifecycleInput(userB.id, "rex_gbpusd_mm_userb", {
          pair: ZZTEST_GBPUSD,
          entryZone: "1.2500 – 1.2510",
          invalidationZone: "1.2470 – 1.2480",
          target1: "1.2650 – 1.2660",
          target2: "1.2750 – 1.2760",
          entryMid: 1.2505,
          invalidationMid: 1.248,
          target1Mid: 1.2655,
          target2Mid: 1.2755,
        })
      );
      userBEurId = eurDto!.id;
      userBGbpId = gbpDto!.id;

      const result = await recordMarketPriceObservations({ pair: ZZTEST_EURUSD, price: 1.272, cycleId: "cycle-2" });
      // Two non-terminal EURUSD setups now exist across both users: userA's
      // (TP1_HIT — NOT terminal; only TP2_HIT/INVALIDATED are) from step 1,
      // and userB's brand-new one. userA's was just checked moments ago (in
      // step 1, same test run) so it is correctly gated by
      // MIN_MARKET_RECHECK_MS and skipped; userB's has never been checked
      // (lastCheckedAt: null) so it is processed. This is itself a proof of
      // cross-user application: userB's setup is reached by a call that
      // names only the PAIR, never userB's id.
      check("2a userB's never-checked setup is updated", result.updated === 1, JSON.stringify(result));
      check("2a' userA's just-checked setup is correctly gated, not re-applied", result.skipped === 1, JSON.stringify(result));

      const eurRow = await rawLifecycle(userBEurId);
      const gbpRow = await rawLifecycle(userBGbpId);
      check("2b userB's EURUSD setup was advanced", eurRow.lastPrice === 1.272 && eurRow.lastCheckedAt !== null);
      check(
        "2c userB's GBPUSD setup (different pair) is completely untouched",
        gbpRow.lastPrice === null && gbpRow.lastCheckedAt === null && gbpRow.state === "ACTIVE" && gbpRow.observations.length === 0
      );
    }

    // ── 3. Duplicate observations & repeated execution safety ─────────────
    {
      // Re-running the EXACT same cycleId against userB's GBPUSD setup must
      // upsert in place, never duplicate — even called twice back-to-back.
      const r1 = await recordMarketPriceObservations({ pair: ZZTEST_GBPUSD, price: 1.251, cycleId: "cycle-3" });
      const r2 = await recordMarketPriceObservations({ pair: ZZTEST_GBPUSD, price: 1.251, cycleId: "cycle-3" });
      check("3a first run of cycle-3 updates the setup", r1.updated === 1, JSON.stringify(r1));
      // r2 is the SAME cycle but lastCheckedAt is now extremely recent (set
      // by r1 a moment ago) — the per-setup recheck gate correctly treats
      // this repeat as "too soon", independent of the cycleId match.
      check("3b immediate repeat is gated by recheck window, not re-applied", r2.updated === 0 && r2.skipped === 1, JSON.stringify(r2));

      const afterRepeat = await rawLifecycle(userBGbpId);
      check("3c still exactly one observation row (no duplicate)", afterRepeat.observations.length === 1, String(afterRepeat.observations.length));

      // Simulate real time passing by backdating lastCheckedAt past the
      // recheck window, then run a genuinely NEW cycle — must now process
      // and append a SECOND, distinct observation row.
      await prisma.tradeSetupLifecycle.update({
        where: { id: userBGbpId },
        data: { lastCheckedAt: new Date(Date.now() - 20 * 60 * 1000) }, // 20 min ago > 15 min gate
      });
      const r3 = await recordMarketPriceObservations({ pair: ZZTEST_GBPUSD, price: 1.252, cycleId: "cycle-4" });
      check("3d a later cycle after the recheck window is processed", r3.updated === 1, JSON.stringify(r3));

      const afterLater = await rawLifecycle(userBGbpId);
      check("3e a second, distinct observation row was appended", afterLater.observations.length === 2, String(afterLater.observations.length));
      check("3f lastPrice reflects the newest reading", afterLater.lastPrice === 1.252);
    }

    // ── 4. Terminal states are excluded entirely, even for a matching pair ─
    {
      const dto = await createOrGetSetupLifecycle(lifecycleInput(userA.id, "rex_eurusd_mm_terminal"));
      // Force straight to a terminal state the same way the classifier
      // would (direct update — this test owns persistence, not classification).
      await prisma.tradeSetupLifecycle.update({ where: { id: dto!.id }, data: { state: "INVALIDATED" } });

      const result = await recordMarketPriceObservations({ pair: ZZTEST_EURUSD, price: 1.3, cycleId: "cycle-5" });
      const row = await rawLifecycle(dto!.id);
      check("4a an INVALIDATED setup is never among updated candidates", row.lastCheckedAt === null && row.observations.length === 0);
      check("4b state remains INVALIDATED, never reclassified", row.state === "INVALIDATED");
      // Not asserting on `result` itself here: the other EURUSD setups from
      // earlier sections still exist and are still within their own
      // MIN_MARKET_RECHECK_MS window at this point in the run, so this
      // call's updated/skipped counts reflect THEM, not this row — this
      // row's exclusion is proven directly above via its own untouched
      // lastCheckedAt/observations/state instead.
      void result;
    }

    // ── 5. getDistinctTrackedPairs() — one entry per non-terminal pair,
    //       across users, terminal-only pairs excluded ────────────────────
    {
      const pairs = await getDistinctTrackedPairs();
      check("5a EURUSD present (non-terminal setups exist)", pairs.includes(ZZTEST_EURUSD));
      check("5b GBPUSD present (non-terminal setups exist)", pairs.includes(ZZTEST_GBPUSD));
      check("5c each pair listed exactly once", pairs.filter((p) => p === ZZTEST_EURUSD).length === 1);

      // A pair whose ONLY setups are all terminal must not appear.
      const onlyTerminalDto = await createOrGetSetupLifecycle(lifecycleInput(userA.id, "rex_usdjpy_mm_terminal_only", { pair: ZZTEST_USDJPY }));
      await prisma.tradeSetupLifecycle.update({ where: { id: onlyTerminalDto!.id }, data: { state: "TP2_HIT" } });
      const pairsAfter = await getDistinctTrackedPairs();
      check("5d a pair whose only setup is terminal is excluded", !pairsAfter.includes(ZZTEST_USDJPY));
    }
  } finally {
    await deleteOwnTestUsers();
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    const total = passed + failures.length;
    // eslint-disable-next-line no-console
    console.log(`\nMarket Monitor tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Market Monitor tests crashed:", err);
    process.exitCode = 1;
  });
