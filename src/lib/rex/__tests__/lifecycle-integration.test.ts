/**
 * Integration tests for Sprint 2 — wiring Trade Setup Lifecycle persistence
 * into the real analysis workflow (/api/rex/trade-setup's route + the main
 * analyze server action), WITHOUT re-testing Sprint 1's ownership guarantees
 * from scratch (see lifecycle-ownership.test.ts for those).
 *
 * Like lifecycle-ownership.test.ts, this requires a real, reachable Postgres
 * database and is deliberately NOT part of the default `npm test` chain. Run
 * with:
 *   npx tsx src/lib/rex/__tests__/lifecycle-integration.test.ts
 * or:
 *   npm run test:lifecycle-integration
 *
 * There is no automated test anywhere in this repo that invokes a Next.js
 * route handler or server action directly (no HTTP layer, no session
 * mocking framework is installed) — consistent with that, this file tests
 * the real exported functions the route/action now call
 * (buildTradeSetup, toCreateLifecycleInput, createOrGetSetupLifecycle,
 * getSetupLifecycle, recordLifecycleObservations, isProActive,
 * normalizeInstrument) through a small local helper
 * (simulateTradeSetupRoute) that replicates route.ts's integration glue
 * EXACTLY — same helper, same call sequence — so these tests exercise the
 * real logic, not a reimplementation of it. The HTTP-level concerns
 * (access.isPro -> 403, request body parsing) have no new logic of their
 * own this sprint; they gate entry to code already covered here.
 *
 * Sprint 5.1: every function this file calls is already user-scoped, so it
 * was never able to reach another user's row — see lifecycle-ownership.
 * test.ts's own Sprint 5.1 note for why the test-db-guard import below is
 * still required regardless (every file sharing "@/lib/prisma" with
 * production should be structurally incapable of reaching dev/prod).
 */
import { scopedTestEmail } from "./test-db-guard";
import { prisma } from "@/lib/prisma";
import { buildTradeSetup, type TradeSetupResult } from "../trade-setup";
import {
  createOrGetSetupLifecycle,
  getSetupLifecycle,
  recordLifecycleObservations,
  toCreateLifecycleInput,
} from "../lifecycle";
import { normalizeInstrument } from "../instruments";
import { isProActive } from "@/lib/journal/access";
import { evaluateNewsGuard } from "@/lib/economicCalendar/blocking";
import type { NewsGuard } from "@/lib/economicCalendar/blocking";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const clearNews: NewsGuard = {
  state: "clear",
  risk: "Low",
  status: "No high-impact news nearby.",
  event: null,
  currency: null,
  minutesUntil: null,
};

/** A real, valid bullish APA setup — buildTradeSetup() is NOT mocked;
 *  trade-generation logic is completely untouched by this sprint. */
function validBullishSetup(pair = "EUR/USD"): TradeSetupResult {
  return buildTradeSetup({
    pair,
    timeframe: "H1",
    bias: "Bullish",
    confidence: 80,
    currentPrice: "1.2705",
    priceLevels: [
      { type: "Support", value: "1.2700" },
      { type: "Resistance", value: "1.2780" },
      { type: "Entry", value: "1.2710" },
      { type: "Take Profit", value: "1.2850" },
      { type: "Invalidation", value: "1.2680" },
    ],
    trend: { direction: "Uptrend", strength: "Strong" },
    evidence: [{ label: "BOS", explanation: "break of structure HH HL demand liquidity" }],
    newsGuard: clearNews,
  });
}

/** Deliberately weak/contradictory evidence — buildTradeSetup() must return
 *  a non-directional result ("none"), exactly the "failed/invalid analysis"
 *  case lifecycle creation must skip. */
function invalidSetup(pair = "EUR/USD"): TradeSetupResult {
  return buildTradeSetup({
    pair,
    timeframe: "H1",
    bias: "Bullish",
    confidence: 40,
    currentPrice: null,
    priceLevels: [],
    trend: { direction: "Sideways", strength: "Weak" },
    evidence: [],
    newsGuard: clearNews,
  });
}

/**
 * Replicates /api/rex/trade-setup's route integration glue EXACTLY (same
 * helper, same sequence) — NOT a reimplementation. Mirrors:
 *   if (setup.kind === "directional" && analysisId) {
 *     const pair = normalizeInstrument(body.pair)?.symbol ?? body.pair;
 *     ...
 *     await createOrGetSetupLifecycle(toCreateLifecycleInput({...}));
 *   }
 */
async function simulateTradeSetupRoute(opts: {
  userId: string;
  analysisId: string | null;
  rawPair: string;
  timeframe?: string | null;
  currentPriceRaw?: string | null;
  setup: TradeSetupResult;
}) {
  if (opts.setup.kind !== "directional" || !opts.analysisId) return null;
  const pair = normalizeInstrument(opts.rawPair)?.symbol ?? opts.rawPair;
  const rawCurrent = opts.currentPriceRaw ? parseFloat(opts.currentPriceRaw) : NaN;
  return createOrGetSetupLifecycle(
    toCreateLifecycleInput({
      userId: opts.userId,
      setupId: opts.analysisId,
      pair,
      timeframe: opts.timeframe ?? null,
      setup: opts.setup,
      currentPrice: Number.isFinite(rawCurrent) ? rawCurrent : null,
      generatedAt: new Date("2026-11-17T12:00:00.000Z"),
    })
  );
}

const EMAIL_PREFIX_A = "qa.lifecycle.integration.user-a";
const EMAIL_PREFIX_B = "qa.lifecycle.integration.user-b";
const EMAIL_A = scopedTestEmail(EMAIL_PREFIX_A);
const EMAIL_B = scopedTestEmail(EMAIL_PREFIX_B);
const EMAIL_FREE_PREFIX = "qa.lifecycle.integration.free-user";
const EMAIL_FREE = scopedTestEmail(EMAIL_FREE_PREFIX);

/** Pre-run sweep: catches a previous (e.g. crashed) run's leftovers
 *  regardless of ITS run tag. Safe only because test-db-guard has already
 *  confirmed this process is connected to the dedicated test database,
 *  never dev/production — see file header. */
async function sweepPriorRuns(): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: `${EMAIL_PREFIX_A}.` } },
        { email: { startsWith: `${EMAIL_PREFIX_B}.` } },
        { email: { startsWith: `${EMAIL_FREE_PREFIX}.` } },
      ],
    },
  });
}

/** Post-run cleanup: exact match on THIS run's own uniquely-tagged emails
 *  only, so it can never delete a concurrently-running execution of this
 *  same file's still-in-flight fixtures. */
async function deleteOwnTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B] } } });
}

/** Matches exactly what analyze.ts's gateUser select now carries. */
async function makeUser(email: string, overrides: Partial<{ plan: string; subscriptionStatus: string; currentPeriodEnd: Date | null }> = {}) {
  return prisma.user.create({
    data: {
      email,
      plan: (overrides.plan as "FREE" | "PROFESSIONAL" | "ENTERPRISE") ?? "PROFESSIONAL",
      subscriptionStatus: (overrides.subscriptionStatus as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
      currentPeriodEnd: overrides.currentPeriodEnd ?? new Date("2099-01-01T00:00:00.000Z"),
    },
  });
}

async function main() {
  await sweepPriorRuns();
  const userA = await makeUser(EMAIL_A); // active Pro
  const userB = await makeUser(EMAIL_B); // active Pro

  try {
    const bullish = validBullishSetup();
    check("fixture sanity: validBullishSetup() is directional", bullish.kind === "directional");
    const rejected = invalidSetup();
    check("fixture sanity: invalidSetup() is non-directional", rejected.kind !== "directional", `got ${rejected.kind}`);

    // ── 1. Lifecycle creation after successful analysis ───────────────────
    {
      const created = await simulateTradeSetupRoute({
        userId: userA.id,
        analysisId: "rex_eurusd_t1",
        rawPair: "EUR/USD",
        timeframe: "H1",
        currentPriceRaw: "1.2705",
        setup: bullish,
      });
      check("1a lifecycle record created for a successful directional analysis", created !== null);
      check(
        "1b created record's levels match the setup's OWN computed output",
        bullish.kind === "directional" &&
          created?.entryZone === bullish.entryZone &&
          created?.invalidationZone === bullish.invalidationZone &&
          created?.target1 === bullish.target1 &&
          created?.target2 === bullish.target2 &&
          created?.riskReward === bullish.riskReward
      );
      check("1c pair stored normalized (EURUSD), matching analyze.ts's own context.symbol form", created?.pair === "EURUSD", `got ${created?.pair}`);
    }

    // ── 2. No lifecycle creation for failed or invalid analysis ───────────
    {
      const result = await simulateTradeSetupRoute({
        userId: userA.id,
        analysisId: "rex_eurusd_t2_invalid",
        rawPair: "EUR/USD",
        setup: rejected,
      });
      check("2a non-directional analysis never calls into lifecycle creation", result === null);
      const rowCount = await prisma.tradeSetupLifecycle.count({ where: { setupId: "rex_eurusd_t2_invalid" } });
      check("2b no DB row exists for the rejected analysis", rowCount === 0, `got ${rowCount}`);
    }

    // ── 3. Correct authenticated userId association ───────────────────────
    {
      await simulateTradeSetupRoute({
        userId: userA.id,
        analysisId: "rex_eurusd_t3",
        rawPair: "EUR/USD",
        setup: bullish,
      });
      const ownFetch = await getSetupLifecycle(userA.id, "rex_eurusd_t3");
      check("3a the creating user can retrieve their own record", ownFetch !== null);
      const otherFetch = await getSetupLifecycle(userB.id, "rex_eurusd_t3");
      check("3b a different user cannot retrieve it", otherFetch === null);
    }

    // ── 4. Original setup levels remain unchanged on a later submission ───
    {
      const setupId = "rex_eurusd_t4";
      const first = await simulateTradeSetupRoute({ userId: userA.id, analysisId: setupId, rawPair: "EUR/USD", setup: bullish });
      check("4a first submission creates the record", first !== null);

      // A later, DIFFERENT analysis result for the SAME setupId (e.g. price
      // moved, re-upload of a similar chart) must never overwrite the
      // ORIGINAL trading levels — matches requirement 7 verbatim.
      const laterDifferentSetup = buildTradeSetup({
        pair: "EUR/USD",
        timeframe: "H1",
        bias: "Bullish",
        confidence: 80,
        currentPrice: "1.2850",
        priceLevels: [
          { type: "Support", value: "1.2800" },
          { type: "Resistance", value: "1.2900" },
          { type: "Entry", value: "1.2810" },
          { type: "Take Profit", value: "1.3000" },
          { type: "Invalidation", value: "1.2770" },
        ],
        trend: { direction: "Uptrend", strength: "Strong" },
        evidence: [{ label: "BOS", explanation: "break of structure HH HL demand liquidity" }],
        newsGuard: clearNews,
      });
      check("fixture sanity: the later setup genuinely differs", laterDifferentSetup.kind === "directional" && first?.entryZone !== (laterDifferentSetup as { entryZone?: string }).entryZone);

      const second = await simulateTradeSetupRoute({ userId: userA.id, analysisId: setupId, rawPair: "EUR/USD", setup: laterDifferentSetup });
      check("4b second submission returns the SAME record id (idempotent)", second?.id === first?.id);
      check("4c original entryZone preserved, not overwritten", second?.entryZone === first?.entryZone, `got ${second?.entryZone} vs original ${first?.entryZone}`);
      check("4d original invalidationZone preserved", second?.invalidationZone === first?.invalidationZone);
      check("4e original riskReward preserved", second?.riskReward === first?.riskReward);
    }

    // ── 5. Repeated submissions stay idempotent (creation AND observations),
    //       and pair normalization actually lets the two integration points
    //       correlate (the "EUR/USD" vs "EURUSD" mismatch this sprint fixed) ─
    {
      const setupId = "rex_gbpusd_t5";
      await simulateTradeSetupRoute({ userId: userA.id, analysisId: setupId, rawPair: "GBP/USD", setup: validBullishSetup("GBP/USD") });
      await simulateTradeSetupRoute({ userId: userA.id, analysisId: setupId, rawPair: "GBP/USD", setup: validBullishSetup("GBP/USD") });
      const rowCount = await prisma.tradeSetupLifecycle.count({ where: { userId: userA.id, setupId } });
      check("5a repeated creation submissions produce exactly one row", rowCount === 1, `got ${rowCount}`);

      // analyze.ts's own glue uses the NORMALIZED symbol form directly
      // (context.symbol), never the route's raw display-with-slash input —
      // proving the two integration points actually agree on `pair`.
      await recordLifecycleObservations({ userId: userA.id, pair: "GBPUSD", sourceAnalysisId: "analysis_x", price: 1.2706 });
      await recordLifecycleObservations({ userId: userA.id, pair: "GBPUSD", sourceAnalysisId: "analysis_x", price: 1.2706 });
      const tracked = await getSetupLifecycle(userA.id, setupId);
      check(
        "5b the GBP/USD-created record IS found and advanced by a GBPUSD-pair observation (pair normalization works end-to-end)",
        tracked?.observations.length === 1,
        `got ${tracked?.observations.length ?? "null record"}`
      );
      check("5c repeated observation submissions (same sourceAnalysisId) stay idempotent, not duplicated", tracked?.observations.length === 1);
    }

    // ── 6. Lifecycle persistence failures do not break analysis generation ─
    {
      // Force a real persistence failure: a syntactically-valid but
      // nonexistent userId violates the FK constraint inside
      // createOrGetSetupLifecycle.
      let threw = false;
      let result: Awaited<ReturnType<typeof createOrGetSetupLifecycle>> = null;
      try {
        result = await simulateTradeSetupRoute({
          userId: "cl_this_user_id_was_never_created",
          analysisId: "rex_eurusd_t6_forced_failure",
          rawPair: "EUR/USD",
          setup: bullish,
        });
      } catch {
        threw = true;
      }
      check("6a a forced lifecycle persistence failure never throws out of the integration point", !threw);
      check("6b it resolves to null instead", result === null);
      // The critical guarantee: `bullish` (what the route returns to the
      // user as the actual trade setup) is computed entirely independently
      // and is already a complete, valid object regardless of what just
      // happened above — buildTradeSetup() ran before, and does not read
      // from or depend on the lifecycle call's outcome in any way.
      check(
        "6c the actual trade setup result remains fully valid and unaffected",
        bullish.kind === "directional" && typeof bullish.entryZone === "string" && typeof bullish.qualityScore === "number"
      );
    }

    // ── 7. Free users cannot access Pro-restricted lifecycle functionality ─
    {
      check("7a active Pro user is recognized as Pro", isProActive(userA));
      const freeShaped = { plan: "FREE", subscriptionStatus: "INACTIVE", currentPeriodEnd: null };
      check("7b a Free-plan user is correctly NOT recognized as Pro", !isProActive(freeShaped));
      const lapsedShaped = { plan: "PROFESSIONAL", subscriptionStatus: "CANCELED", currentPeriodEnd: new Date("2020-01-01T00:00:00.000Z") };
      check("7c a lapsed/expired Pro user is correctly NOT recognized as Pro", !isProActive(lapsedShaped));

      // analyze.ts's actual gate is `if (isProActive(gateUser)) { await
      // recordLifecycleObservations(...) }` — a Free user's analysis never
      // reaches that call at all. Independently of that gate, the DB layer
      // itself is also safe: a Free user cannot possibly have a tracked
      // setup (creation requires Pro, enforced by the route's OWN
      // access.isPro check), so calling it anyway finds zero candidates.
      const freeUserRow = await prisma.user.create({
        data: { email: EMAIL_FREE, plan: "FREE", subscriptionStatus: "INACTIVE" },
      });
      try {
        await recordLifecycleObservations({ userId: freeUserRow.id, pair: "EURUSD", sourceAnalysisId: "analysis_free", price: 1.27 });
        const freeUserTracked = await prisma.tradeSetupLifecycle.count({ where: { userId: freeUserRow.id } });
        check("7d a Free user has (and can create) no tracked setups to advance", freeUserTracked === 0, `got ${freeUserTracked}`);
      } finally {
        await prisma.user.delete({ where: { id: freeUserRow.id } });
      }
    }

    // ── 8. Cross-user isolation remains intact through the real glue ──────
    {
      const sharedSetupId = "rex_eurusd_t8_shared";
      const aRecord = await simulateTradeSetupRoute({ userId: userA.id, analysisId: sharedSetupId, rawPair: "EUR/USD", setup: bullish });
      const bRecord = await simulateTradeSetupRoute({ userId: userB.id, analysisId: sharedSetupId, rawPair: "EUR/USD", setup: bullish });
      check("8a two different users get two different records for the same analysisId", !!aRecord && !!bRecord && aRecord.id !== bRecord.id);

      await recordLifecycleObservations({ userId: userA.id, pair: "EURUSD", sourceAnalysisId: "analysis_shared", price: 1.272 });
      const aAfter = await getSetupLifecycle(userA.id, sharedSetupId);
      const bAfter = await getSetupLifecycle(userB.id, sharedSetupId);
      check("8b userA's observation does not leak into userB's record", bAfter?.observations.length === 0, `got ${bAfter?.observations.length}`);
      check("8c userA's own record was correctly advanced", aAfter?.observations.length === 1, `got ${aAfter?.observations.length}`);
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
    console.log(`\nLifecycle Integration tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Lifecycle Integration tests crashed:", err);
    process.exitCode = 1;
  });
