/**
 * Integration tests for Sprint 3 — authenticated Tracked Setups retrieval
 * (listTrackedSetups/countTrackedSetups in lifecycle.ts).
 *
 * Like the other lifecycle test files, this requires a real, reachable
 * Postgres database and is deliberately NOT part of the default `npm test`
 * chain. Run with:
 *   npx tsx src/lib/rex/__tests__/lifecycle-retrieval.test.ts
 * or:
 *   npm run test:lifecycle-retrieval
 *
 * On "unauthenticated requests are rejected": getTrackedSetupsAccess()
 * (lifecycle-access.ts) calls auth(), which internally calls Next.js's
 * headers() — this throws with "`headers` was called outside a request
 * scope" the moment it's invoked outside a real Next.js request, regardless
 * of whether a session exists. Confirmed by direct probe; there is no way
 * to invoke it meaningfully in this plain-script harness, and no test
 * anywhere in this repo invokes any auth()-touching function directly for
 * the same reason (none ever has). What IS this layer's own responsibility,
 * and what the tests below actually prove: listTrackedSetups/
 * countTrackedSetups (which take a plain userId, no session of their own)
 * never resolve another user's data for an empty, unrecognized, or
 * otherwise "not a real authenticated user" id — the same boundary
 * convention lifecycle-ownership.test.ts already established for
 * getSetupLifecycle.
 */
import { prisma } from "@/lib/prisma";
import { createOrGetSetupLifecycle, listTrackedSetups, countTrackedSetups } from "../lifecycle";
import type { CreateLifecycleInput } from "../lifecycle";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

const EMAIL_A = "qa.lifecycle.retrieval.user-a@4rexvision.test";
const EMAIL_B = "qa.lifecycle.retrieval.user-b@4rexvision.test";

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
    generatedAt: new Date("2026-11-18T12:00:00.000Z"),
    ...overrides,
  };
}

async function deleteTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL_A, EMAIL_B] } } });
}

async function main() {
  await deleteTestUsers();
  const userA = await prisma.user.create({ data: { email: EMAIL_A } });
  const userB = await prisma.user.create({ data: { email: EMAIL_B } });

  try {
    // ── 0. A fresh user with zero tracked setups: genuinely empty, NOT the
    //       same thing as a failure — the UI depends on this distinction. ──
    {
      const result = await listTrackedSetups(userA.id);
      check("0a brand-new user has zero tracked setups", result.setups.length === 0);
      check("0b that is reported as a clean empty list, not a failure", result.failed === false);
      const count = await countTrackedSetups(userA.id);
      check("0c countTrackedSetups agrees (0)", count === 0, `got ${count}`);
    }

    // ── 1. Authenticated retrieval (userId as getTrackedSetupsAccess() would
    //       supply it from a real session) — newest generated first ────────
    {
      await createOrGetSetupLifecycle(
        lifecycleInput(userA.id, "rex_eurusd_older", { generatedAt: new Date("2026-11-01T00:00:00.000Z"), entryMid: 1.1 })
      );
      await createOrGetSetupLifecycle(
        lifecycleInput(userA.id, "rex_eurusd_newer", { generatedAt: new Date("2026-11-15T00:00:00.000Z"), entryMid: 1.2 })
      );

      const { setups, failed } = await listTrackedSetups(userA.id);
      check("1a both of userA's setups are retrieved", setups.length === 2, `got ${setups.length}`);
      check("1b retrieval did not fail", failed === false);
      check("1c newest-generated-first ordering", setups[0]?.setupId === "rex_eurusd_newer" && setups[1]?.setupId === "rex_eurusd_older");
    }

    // ── 2. Cross-user isolation through the retrieval path ────────────────
    {
      await createOrGetSetupLifecycle(lifecycleInput(userB.id, "rex_gbpusd_b_only", { pair: "GBPUSD", entryMid: 2.1 }));

      const aList = (await listTrackedSetups(userA.id)).setups;
      const bList = (await listTrackedSetups(userB.id)).setups;
      check("2a userA's list never contains userB's setup", !aList.some((s) => s.setupId === "rex_gbpusd_b_only"));
      check("2b userB's list contains only userB's own setup", bList.length === 1 && bList[0]?.setupId === "rex_gbpusd_b_only");
      check("2c userB's list never contains userA's setups", !bList.some((s) => s.setupId === "rex_eurusd_older" || s.setupId === "rex_eurusd_newer"));
    }

    // ── 3. "Unauthenticated" at this layer's own boundary: an empty or
    //       unrecognized userId must never resolve to someone else's data,
    //       and must never crash (see file header for the fuller auth()
    //       limitation this is scoped around) ──────────────────────────────
    {
      const emptyIdResult = await listTrackedSetups("");
      check("3a empty-string userId returns an empty list, never a crash", emptyIdResult.setups.length === 0 && emptyIdResult.failed === false);

      const unknownIdResult = await listTrackedSetups("cl_this_user_id_was_never_created");
      check("3b a syntactically valid but nonexistent userId returns an empty list", unknownIdResult.setups.length === 0 && unknownIdResult.failed === false);

      const unknownCount = await countTrackedSetups("cl_this_user_id_was_never_created");
      check("3c countTrackedSetups also returns 0 for a nonexistent userId", unknownCount === 0, `got ${unknownCount}`);
    }

    // ── 4. Original trade levels remain unchanged through the LIST path ───
    // (the single-record idempotency guarantee from Sprints 1-2, now
    // verified specifically through the NEW retrieval path this sprint adds)
    {
      const setupId = "rex_eurusd_levels_preserved";
      await createOrGetSetupLifecycle(lifecycleInput(userA.id, setupId, { entryMid: 4.111, riskReward: "1:3.0" }));
      // A later, different submission for the SAME setupId must not alter it.
      await createOrGetSetupLifecycle(lifecycleInput(userA.id, setupId, { entryMid: 4.999, riskReward: "1:1.0" }));

      const { setups } = await listTrackedSetups(userA.id);
      const listed = setups.find((s) => s.setupId === setupId);
      check("4a the setup appears in the list", listed !== undefined);
      check("4b entryMid in the LISTED record is the ORIGINAL value, not the later submission", listed?.entryMid === 4.111, `got ${listed?.entryMid}`);
      check("4c riskReward in the LISTED record is the ORIGINAL value", listed?.riskReward === "1:3.0", `got ${listed?.riskReward}`);
    }

    // ── 5. listTrackedSetups never throws, even on a genuine query failure
    //       (forced via an invalid `take`, the same "force a real error"
    //       approach used for createOrGetSetupLifecycle in earlier sprints) ─
    {
      let threw = false;
      let result: Awaited<ReturnType<typeof listTrackedSetups>> | null = null;
      try {
        result = await listTrackedSetups(userA.id, Number.NaN);
      } catch {
        threw = true;
      }
      check("5a a forced query failure never throws out of listTrackedSetups", !threw);
      check("5b it resolves with failed: true and an empty list instead", result?.failed === true && result?.setups.length === 0);
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
    console.log(`\nLifecycle Retrieval tests: ${passed}/${total} passed`);
    if (failures.length) {
      // eslint-disable-next-line no-console
      console.log("FAILURES:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Lifecycle Retrieval tests crashed:", err);
    process.exitCode = 1;
  });
