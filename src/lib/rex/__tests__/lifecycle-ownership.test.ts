/**
 * Integration tests for the Trade Setup Lifecycle ownership fix
 * (createOrGetSetupLifecycle / getSetupLifecycle / recordLifecycleObservations
 * in ../lifecycle.ts).
 *
 * Unlike every other test file in this project, this ONE requires a real,
 * reachable Postgres database — the whole point of these tests is proving
 * the actual compound (userId, setupId) unique constraint and the actual
 * Prisma queries behave correctly together; a mocked Prisma client would
 * only prove whatever the mock was told to return, not that the fix works.
 *
 * Sprint 5.1: every function this file calls is already user-scoped
 * (userId is part of every query), so this file was never able to reach
 * another user's row, let alone a real one's — unlike
 * recordMarketPriceObservations() (market-monitor.test.ts,
 * entry-freshness-integration.test.ts), which is deliberately pair-wide.
 * The test-db-guard import below is still required, for the same reason
 * "Inspect ALL lifecycle integration test database connections" is phrased
 * that way: every file sharing the "@/lib/prisma" singleton with
 * production code should be structurally incapable of reaching dev/prod,
 * not just the two files where a concrete incident already happened.
 *
 * Creates two throwaway User rows (unique-per-run, clearly-tagged emails —
 * swept before this file runs and deleted after, so a prior crashed run
 * never leaves junk and this run never leaves junk either) and real
 * TradeSetupLifecycle / SetupLifecycleObservation rows under them. Cleans
 * up everything it created; never touches any pre-existing row.
 *
 * Deliberately NOT part of the default `npm test` chain (every other file in
 * that chain is DB-free and must stay runnable without Postgres available) —
 * run explicitly with:
 *   npx tsx src/lib/rex/__tests__/lifecycle-ownership.test.ts
 * or:
 *   npm run test:lifecycle-ownership
 */
import { scopedTestEmail } from "./test-db-guard";
import { prisma } from "@/lib/prisma";
import {
  createOrGetSetupLifecycle,
  getSetupLifecycle,
  recordLifecycleObservations,
  type CreateLifecycleInput,
} from "../lifecycle";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const EMAIL_PREFIX_A = "qa.lifecycle.ownership.user-a";
const EMAIL_PREFIX_B = "qa.lifecycle.ownership.user-b";
const EMAIL_A = scopedTestEmail(EMAIL_PREFIX_A);
const EMAIL_B = scopedTestEmail(EMAIL_PREFIX_B);

/** A valid, fully-populated create input for one bullish EURUSD setup. All
 *  fields are varied per call via `overrides` so each test can prove WHICH
 *  copy of the data came back. */
function lifecycleInput(userId: string, setupId: string, overrides: Partial<CreateLifecycleInput> = {}): CreateLifecycleInput {
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
    generatedAt: new Date("2026-11-17T12:00:00.000Z"),
    ...overrides,
  };
}

// TradeSetupLifecycle has onDelete: Cascade from User, so deleting the
// test users also removes every lifecycle/observation row they own — no
// separate cleanup query needed, and no risk of leaving orphans.

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

async function main() {
  // Pre-run cleanup: a prior crashed run must never contaminate this one.
  await sweepPriorRuns();

  const userA = await prisma.user.create({ data: { email: EMAIL_A } });
  const userB = await prisma.user.create({ data: { email: EMAIL_B } });

  try {
    // ── 1. Same-user retrieval and idempotency ────────────────────────────
    {
      const first = await createOrGetSetupLifecycle(lifecycleInput(userA.id, "s1_idempotency", { entryMid: 1.1111 }));
      check("1a first call creates a record", first !== null);
      check("1a created record has the submitted entryMid", first?.entryMid === 1.1111, `got ${first?.entryMid}`);

      // Re-POST for the SAME (userId, setupId) with DIFFERENT levels — must
      // return the ORIGINAL record untouched, never overwrite it.
      const second = await createOrGetSetupLifecycle(lifecycleInput(userA.id, "s1_idempotency", { entryMid: 9.9999 }));
      check("1b second call is idempotent (same record id)", second?.id === first?.id);
      check("1b original entryMid preserved, NOT overwritten by the second call", second?.entryMid === 1.1111, `got ${second?.entryMid}`);

      const fetched = await getSetupLifecycle(userA.id, "s1_idempotency");
      check("1c getSetupLifecycle retrieves the same record for its owner", fetched?.id === first?.id);

      const rowCount = await prisma.tradeSetupLifecycle.count({ where: { userId: userA.id, setupId: "s1_idempotency" } });
      check("1d exactly one row exists for (userA, s1_idempotency), not two", rowCount === 1, `got ${rowCount}`);
    }

    // ── 2. Cross-user access denial ───────────────────────────────────────
    {
      await createOrGetSetupLifecycle(lifecycleInput(userA.id, "s2_cross_user", { entryMid: 2.2222 }));

      const bReadsAsSelf = await getSetupLifecycle(userB.id, "s2_cross_user");
      check("2a userB cannot retrieve userA's record via getSetupLifecycle", bReadsAsSelf === null, `got ${JSON.stringify(bReadsAsSelf)}`);

      const aReadsAsSelf = await getSetupLifecycle(userA.id, "s2_cross_user");
      check("2b userA can still retrieve their own record", aReadsAsSelf !== null && aReadsAsSelf.entryMid === 2.2222);
    }

    // ── 3. Same setupId independently owned by two users ──────────────────
    {
      const setupId = "s3_shared_id";
      const aRecord = await createOrGetSetupLifecycle(lifecycleInput(userA.id, setupId, { entryMid: 3.1 }));
      const bRecord = await createOrGetSetupLifecycle(lifecycleInput(userB.id, setupId, { entryMid: 3.2 }));

      check("3a userA and userB get DIFFERENT record ids for the identical setupId", !!aRecord && !!bRecord && aRecord.id !== bRecord.id);
      check("3b userA's own levels are untouched by userB's create", aRecord?.entryMid === 3.1, `got ${aRecord?.entryMid}`);
      check("3c userB's own levels are untouched by userA's create", bRecord?.entryMid === 3.2, `got ${bRecord?.entryMid}`);

      const aFetched = await getSetupLifecycle(userA.id, setupId);
      const bFetched = await getSetupLifecycle(userB.id, setupId);
      check("3d userA fetches their own copy, not userB's", aFetched?.entryMid === 3.1);
      check("3e userB fetches their own copy, not userA's", bFetched?.entryMid === 3.2);

      const rowCount = await prisma.tradeSetupLifecycle.count({ where: { setupId } });
      check("3f two independent rows exist in the DB for the shared setupId", rowCount === 2, `got ${rowCount}`);
    }

    // ── 4. Unauthenticated access denial ──────────────────────────────────
    // This layer has no session concept of its own (by design — the caller
    // must resolve userId server-side before calling in; see lifecycle.ts's
    // header comment). What IS this layer's responsibility: never resolve a
    // row for an empty or unrecognized userId, i.e. never fall back to
    // "no owner specified -> return something anyway".
    {
      await createOrGetSetupLifecycle(lifecycleInput(userA.id, "s4_unauth", { entryMid: 4.1 }));

      const emptyUserId = await getSetupLifecycle("", "s4_unauth");
      check("4a empty-string userId retrieves nothing", emptyUserId === null, `got ${JSON.stringify(emptyUserId)}`);

      const unknownUserId = await getSetupLifecycle("cl_this_user_id_was_never_created", "s4_unauth");
      check("4b a syntactically valid but nonexistent userId retrieves nothing", unknownUserId === null, `got ${JSON.stringify(unknownUserId)}`);

      // An "unauthenticated create" attempt (empty userId) must not silently
      // attach to or merge with userA's real record, and must not crash.
      const createdWithEmptyUserId = await createOrGetSetupLifecycle(lifecycleInput("", "s4_unauth", { entryMid: 4.2 }));
      check(
        "4c create with empty userId never returns userA's record",
        createdWithEmptyUserId === null || createdWithEmptyUserId.entryMid !== 4.1
      );
      // Clean up the stray row only if the FK happened to allow it (it won't,
      // since "" is not a real User.id — asserted next).
      const strayRows = await prisma.tradeSetupLifecycle.count({ where: { userId: "", setupId: "s4_unauth" } });
      check("4d no row was ever persisted under a blank/unauthenticated userId", strayRows === 0, `got ${strayRows}`);
    }

    // ── 5. Client-supplied user ID spoofing (the original vulnerability) ──
    // Simulates the exact confirmed exploit: userA generates a real tracked
    // setup; userB learns/guesses that setupId (report ids are predictable
    // `rex_<pair>_<timestamp>` strings, not secrets — see analyze.ts) and
    // submits it as their OWN request while authenticated as themselves.
    {
      const guessedSetupId = "rex_eurusd_predictable123";
      const victim = await createOrGetSetupLifecycle(lifecycleInput(userA.id, guessedSetupId, { entryMid: 5.1, riskReward: "1:3.0" }));
      check("5a victim (userA) record created normally", victim !== null && victim.entryMid === 5.1);

      // Attacker (authenticated as userB) submits the SAME setupId.
      const attackerAttempt = await createOrGetSetupLifecycle(
        lifecycleInput(userB.id, guessedSetupId, { entryMid: 5.2, riskReward: "1:1.5" })
      );
      check(
        "5b attacker never receives the victim's data back",
        attackerAttempt !== null && attackerAttempt.entryMid !== 5.1 && attackerAttempt.riskReward !== "1:3.0"
      );
      check("5c attacker instead gets their own independent record", attackerAttempt?.entryMid === 5.2);

      // The critical assertion: the victim's record must be byte-for-byte
      // unmodified after the attacker's call — never retrieved, never
      // overwritten, never merged.
      const victimAfter = await getSetupLifecycle(userA.id, guessedSetupId);
      check(
        "5d victim's record is completely unmodified after the spoofing attempt",
        victimAfter?.entryMid === 5.1 && victimAfter?.riskReward === "1:3.0" && victimAfter?.id === victim?.id
      );

      // And the attacker still cannot read the victim's record directly.
      const attackerReadsVictim = await getSetupLifecycle(userB.id, guessedSetupId);
      check("5e attacker cannot retrieve the victim's record by the same setupId", attackerReadsVictim?.entryMid !== 5.1);
    }

    // ── 6. Cross-user observation access ───────────────────────────────────
    // Observations are only ever reached through a TradeSetupLifecycle row
    // that recordLifecycleObservations() already filtered by `userId` — so
    // this proves there is no SEPARATE, unguarded path onto another user's
    // observation history either.
    {
      const setupId = "s6_observations";
      const aSetup = await createOrGetSetupLifecycle(lifecycleInput(userA.id, setupId, { pair: "GBPUSD", entryMid: 6.1 }));
      check("6a userA's setup for observation testing created", aSetup !== null);

      await recordLifecycleObservations({ userId: userA.id, pair: "GBPUSD", sourceAnalysisId: "analysis_1", price: 1.2705 });
      const afterFirstObservation = await getSetupLifecycle(userA.id, setupId);
      check(
        "6b userA's own observation was recorded",
        afterFirstObservation?.observations.length === 1 && afterFirstObservation.observations[0].sourceAnalysisId === "analysis_1"
      );

      // userB has NO tracked setup for GBPUSD at all. Their own analysis of
      // the same pair must advance zero rows — specifically, never touch
      // userA's setup or its observation log.
      await recordLifecycleObservations({ userId: userB.id, pair: "GBPUSD", sourceAnalysisId: "analysis_2", price: 1.9999 });

      const afterUserBAnalysis = await getSetupLifecycle(userA.id, setupId);
      check(
        "6c userB's analysis of the same pair does not add to userA's observation log",
        afterUserBAnalysis?.observations.length === 1,
        `got ${afterUserBAnalysis?.observations.length}`
      );
      check(
        "6d userA's lastPrice/state unaffected by userB's unrelated analysis",
        afterUserBAnalysis?.lastPrice === 1.2705,
        `got ${afterUserBAnalysis?.lastPrice}`
      );

      // userB cannot reach userA's setup (and therefore its observations)
      // via the setupId either, mirroring test 2.
      const bReadsA = await getSetupLifecycle(userB.id, setupId);
      check("6e userB cannot retrieve userA's setup+observations via setupId", bReadsA === null);
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
    console.log(`\nLifecycle Ownership integration tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Lifecycle Ownership integration tests crashed:", err);
    process.exitCode = 1;
  });
