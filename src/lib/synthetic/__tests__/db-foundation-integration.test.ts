/**
 * Integration tests for Sprint 1's Prisma schema foundation
 * (SyntheticAnalysisUsage / SyntheticSetupLifecycle /
 * SyntheticLifecycleObservation / SyntheticInstrumentMeta).
 *
 * Requires a real, reachable Postgres database and is deliberately NOT part
 * of the default `npm test` chain (same convention as every rex/__tests__
 * lifecycle integration test). Run with:
 *   npx tsx src/lib/synthetic/__tests__/db-foundation-integration.test.ts
 *
 * Two things this file proves:
 *
 * 1. Basic round-trip/cascade correctness for the four new models — Sprint
 *    1's own job ("land the Prisma models") isn't done until something
 *    actually creates/reads/deletes through them, not just until
 *    `prisma migrate deploy` exits 0.
 *
 * 2. **The single most important test class the Sprint 0 architecture spec
 *    calls for (§10 Testing Strategy, "Database isolation")**: a
 *    deliberate, adversarial attempt to make a Synthetic row and a Forex
 *    row collide. It creates a Forex TradeSetupLifecycle row and a
 *    Synthetic SyntheticSetupLifecycle row for the SAME user, with the
 *    IDENTICAL setupId and an IDENTICAL instrument-like string in
 *    `pair`/`instrument`, then confirms a query against either table can
 *    only ever see its own row. Unlike Forex's `recordMarketPriceObservations()`
 *    (which matches a bare `pair` string with no asset-class discriminator
 *    — the exact mechanism behind an earlier real cross-contamination
 *    incident), there is no shared table or shared worklist here for a
 *    future bug to accidentally collide through — this test exists to keep
 *    proving that by construction, not just by a one-time code review.
 *
 * This file touches ONLY the shared `prisma` client and raw model shapes —
 * it deliberately does not import `../trade-setup`, `../lifecycle`, or any
 * other Forex business-logic module from src/lib/rex/, even though it
 * creates a TradeSetupLifecycle row for the adversarial test. That keeps
 * even this test's own coupling to the Forex side at the absolute minimum
 * (the shared table schema only), consistent with src/lib/synthetic/**
 * never depending on src/lib/rex/** for anything beyond what's explicitly
 * safe to share (see instruments.ts's module header).
 */
import { scopedTestEmail } from "../../rex/__tests__/test-db-guard";
import { prisma } from "@/lib/prisma";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const EMAIL_PREFIX = "qa.synthetic.db-foundation";
const EMAIL = scopedTestEmail(EMAIL_PREFIX);

/** Pre-run sweep: catches a previous (e.g. crashed) run's leftovers,
 *  regardless of its run tag. Safe only because test-db-guard has already
 *  confirmed this process is connected to the dedicated test database. */
async function sweepPriorRuns(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { startsWith: `${EMAIL_PREFIX}.` } } });
  await prisma.syntheticInstrumentMeta.deleteMany({ where: { symbol: { startsWith: "QA_TEST_" } } });
}

async function deleteOwnTestUser(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.syntheticInstrumentMeta.deleteMany({ where: { symbol: { startsWith: "QA_TEST_" } } });
}

async function main() {
  await sweepPriorRuns();
  const user = await prisma.user.create({ data: { email: EMAIL } });

  try {
    // ── 1. SyntheticAnalysisUsage — basic create/read, nullable extraction
    //       fields behave like AnalysisUsage's (never a hard requirement). ──
    {
      const row = await prisma.syntheticAnalysisUsage.create({
        data: {
          userId: user.id,
          instrument: "VOLATILITY_75",
          category: "VOLATILITY",
          timeframe: "H1",
          confidence: 72,
          provider: "gemini",
          direction: "Bullish",
          headline: "Test headline",
        },
      });
      check("1a row created with an id", typeof row.id === "string" && row.id.length > 0);

      const unresolved = await prisma.syntheticAnalysisUsage.create({
        data: { userId: user.id, instrument: null, category: null },
      });
      check("1b instrument/category may be null (not confidently extracted)", unresolved.instrument === null && unresolved.category === null);

      const found = await prisma.syntheticAnalysisUsage.findMany({ where: { userId: user.id } });
      check("1c both rows retrievable by userId", found.length === 2, `got ${found.length}`);
    }

    // ── 2. SyntheticSetupLifecycle + SyntheticLifecycleObservation — the
    //       ownership-scoped uniqueness convention, the observations
    //       relation, and cascade delete on the parent. ───────────────────
    {
      const lifecycle = await prisma.syntheticSetupLifecycle.create({
        data: {
          userId: user.id,
          setupId: "synth_volatility75_test1",
          instrument: "VOLATILITY_75",
          category: "VOLATILITY",
          timeframe: "H1",
          bias: "Bullish",
          entryZone: "900 – 905",
          invalidationZone: "890 – 895",
          target1: "920 – 925",
          target2: "940 – 945",
          entryMid: 902.5,
          invalidationMid: 892.5,
          target1Mid: 922.5,
          target2Mid: 942.5,
          riskReward: "1:2.0",
          generatedAt: new Date("2026-11-20T00:00:00.000Z"),
          priceAtGeneration: 903,
        },
      });
      check("2a lifecycle row created", lifecycle.state === "ACTIVE", `got state=${lifecycle.state}`);

      // Same (userId, setupId) must be idempotent-unique, exactly like
      // TradeSetupLifecycle — a second create attempt must violate the
      // compound unique constraint, never silently duplicate.
      let duplicateRejected = false;
      try {
        await prisma.syntheticSetupLifecycle.create({
          data: {
            userId: user.id,
            setupId: "synth_volatility75_test1", // same compound key
            instrument: "VOLATILITY_75",
            category: "VOLATILITY",
            bias: "Bullish",
            entryZone: "x",
            invalidationZone: "x",
            target1: "x",
            target2: "x",
            entryMid: 1,
            invalidationMid: 1,
            target1Mid: 1,
            target2Mid: 1,
            riskReward: "1:1",
            generatedAt: new Date(),
          },
        });
      } catch {
        duplicateRejected = true;
      }
      check("2b duplicate (userId, setupId) is rejected by the unique constraint", duplicateRejected);

      const observation = await prisma.syntheticLifecycleObservation.create({
        data: {
          setupId: lifecycle.id,
          sourceAnalysisId: "synth_analysis_test1",
          price: 910,
          state: "APPROACHING_ENTRY",
          source: "chart_analysis",
        },
      });
      check("2c observation linked to the lifecycle row", observation.setupId === lifecycle.id);

      const withObservations = await prisma.syntheticSetupLifecycle.findUnique({
        where: { id: lifecycle.id },
        include: { observations: true },
      });
      check("2d relation query returns the observation", withObservations?.observations.length === 1);

      // Deleting the PARENT must cascade to the observation (mirrors
      // TradeSetupLifecycle -> SetupLifecycleObservation exactly).
      await prisma.syntheticSetupLifecycle.delete({ where: { id: lifecycle.id } });
      const orphanCheck = await prisma.syntheticLifecycleObservation.findUnique({ where: { id: observation.id } });
      check("2e deleting the lifecycle cascades to delete its observation", orphanCheck === null);
    }

    // ── 3. SyntheticInstrumentMeta — symbol is the primary key; verified
    //       defaults to false (the honest Sprint 1 default, not a soft
    //       placeholder — see instruments.ts's module header). ───────────
    {
      const meta = await prisma.syntheticInstrumentMeta.create({
        data: { symbol: "QA_TEST_VOLATILITY_75", displayName: "Volatility 75 Index (QA)", category: "VOLATILITY" },
      });
      check("3a verified defaults to false", meta.verified === false);

      let duplicatePkRejected = false;
      try {
        await prisma.syntheticInstrumentMeta.create({
          data: { symbol: "QA_TEST_VOLATILITY_75", displayName: "duplicate", category: "VOLATILITY" },
        });
      } catch {
        duplicatePkRejected = true;
      }
      check("3b duplicate symbol primary key is rejected", duplicatePkRejected);
    }

    // ── 4. THE adversarial cross-market isolation test ────────────────────
    // Deliberately create a Forex TradeSetupLifecycle row and a Synthetic
    // SyntheticSetupLifecycle row for the SAME user, with an IDENTICAL
    // setupId and an IDENTICAL colliding string in pair/instrument — the
    // worst case a shared table+worklist could ever produce — and confirm
    // a query scoped to either table can only ever see its own row.
    {
      const collidingSetupId = "COLLISION_TEST_SETUP_ID";
      const collidingSymbol = "COLLISION_TEST_SYMBOL"; // deliberately NOT a real forex pair or
      // real registry symbol — this test is about table-level isolation,
      // not instrument-name collisions, so a synthetic placeholder string
      // is the right fixture here, used identically on both sides.

      const forexRow = await prisma.tradeSetupLifecycle.create({
        data: {
          userId: user.id,
          setupId: collidingSetupId,
          pair: collidingSymbol,
          bias: "Bullish",
          entryZone: "1.1000 – 1.1010",
          invalidationZone: "1.0950 – 1.0960",
          target1: "1.1100 – 1.1110",
          target2: "1.1200 – 1.1210",
          entryMid: 1.1005,
          invalidationMid: 1.0955,
          target1Mid: 1.1105,
          target2Mid: 1.1205,
          riskReward: "1:2.0",
          generatedAt: new Date("2026-11-20T00:00:00.000Z"),
        },
      });

      const syntheticRow = await prisma.syntheticSetupLifecycle.create({
        data: {
          userId: user.id,
          setupId: collidingSetupId, // IDENTICAL to the Forex row's setupId
          instrument: collidingSymbol, // IDENTICAL to the Forex row's pair
          category: "VOLATILITY",
          bias: "Bearish", // deliberately the OPPOSITE bias, so a cross-read would be obviously wrong, not coincidentally right
          entryZone: "900 – 905",
          invalidationZone: "910 – 915",
          target1: "880 – 885",
          target2: "860 – 865",
          entryMid: 902.5,
          invalidationMid: 912.5,
          target1Mid: 882.5,
          target2Mid: 862.5,
          riskReward: "1:2.0",
          generatedAt: new Date("2026-11-20T00:00:00.000Z"),
        },
      });

      try {
        // A Forex-shaped query (as recordMarketPriceObservations() would
        // run it — matching on the bare `pair` string) must see ONLY the
        // Forex row, never the Synthetic one, even though the Synthetic
        // row's `instrument` value is byte-for-byte identical.
        const forexMatches = await prisma.tradeSetupLifecycle.findMany({ where: { pair: collidingSymbol } });
        check("4a Forex query returns exactly one row", forexMatches.length === 1, `got ${forexMatches.length}`);
        check("4b that row is the real Forex row (bullish)", forexMatches[0]?.id === forexRow.id && forexMatches[0]?.bias === "Bullish");

        // The symmetric Synthetic-shaped query must see ONLY the Synthetic
        // row, never the Forex one.
        const syntheticMatches = await prisma.syntheticSetupLifecycle.findMany({ where: { instrument: collidingSymbol } });
        check("4c Synthetic query returns exactly one row", syntheticMatches.length === 1, `got ${syntheticMatches.length}`);
        check("4d that row is the real Synthetic row (bearish)", syntheticMatches[0]?.id === syntheticRow.id && syntheticMatches[0]?.bias === "Bearish");

        // And the (userId, setupId) compound-unique convention is scoped
        // PER TABLE — the same colliding setupId existing in both tables
        // simultaneously must not throw or merge; each table's own unique
        // index is independent of the other table's.
        check("4e both rows coexist without a cross-table constraint violation", forexRow.setupId === syntheticRow.setupId);
      } finally {
        await prisma.tradeSetupLifecycle.delete({ where: { id: forexRow.id } });
        await prisma.syntheticSetupLifecycle.delete({ where: { id: syntheticRow.id } });
      }
    }
  } finally {
    await deleteOwnTestUser();
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    const total = passed + failures.length;
    // eslint-disable-next-line no-console
    console.log(`\nSynthetic DB foundation integration tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Synthetic DB foundation integration tests crashed:", err);
    process.exitCode = 1;
  });
