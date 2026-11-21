/**
 * Sprint 5.1 — fail-closed database safety guard for every DB-touching
 * lifecycle/market-monitor integration test in this directory.
 *
 * WHY THIS EXISTS: the Sprint 5 entry-freshness integration test used the
 * real instrument identifier "GBPUSD" as a test fixture. Because every test
 * file in this directory imports the SAME shared `prisma` singleton
 * (src/lib/prisma.ts) that production code uses, and
 * recordMarketPriceObservations() is — correctly, by design — scoped to a
 * PAIR, not a user (one real market price must update every tracked setup
 * for that instrument, regardless of owner), that test's call silently
 * overwrote a real user's live TradeSetupLifecycle row that happened to
 * also be GBPUSD. See the Sprint 5.1 forensic/remediation report for the
 * full incident writeup.
 *
 * THE FIX IS STRUCTURAL, NOT A PATCH ON ONE TEST FILE: every test file
 * that touches the database must import this module FIRST — before
 * "@/lib/prisma" or anything that transitively imports it (e.g.
 * "../lifecycle") — so that by the time src/lib/prisma.ts's own top-level
 * `new PrismaClient(...)` call runs, IS_INTEGRATION_TEST is already set and
 * prisma.ts's resolveDatabaseUrl() has already thrown (before any query —
 * before any write) if TEST_DATABASE_URL isn't configured correctly. ES
 * module import evaluation order (sibling imports run top-to-bottom in
 * textual order, each fully before the next starts) is what guarantees
 * this ordering — not a convention that merely SHOULD be followed, but one
 * module resolution actually enforces as long as this import is written
 * first.
 *
 * THIS MODULE ITSELF DOES NOT RE-VALIDATE THE URL: the single source of
 * truth for "which database does `prisma` actually connect to, and is that
 * safe" is prisma.ts's own resolveDatabaseUrl() — duplicating that logic
 * here would create exactly the "second, possibly-diverging copy" this
 * codebase's own conventions (see entry-freshness.ts's header) warn
 * against. This module's job is narrower: load .env (tsx/node don't do
 * this automatically for a plain script — see below), flip the flag, and
 * hand test files a couple of small ergonomics helpers so cleanup can never
 * cross between two overlapping runs of the SAME test file.
 */

// `tsx` does NOT auto-load .env (confirmed empirically — DATABASE_URL is
// undefined in a bare `tsx -e` probe). Node 20.6+/22 ships
// process.loadEnvFile() for exactly this. Swallow a missing-file error:
// a CI environment may inject TEST_DATABASE_URL/DATABASE_URL directly
// without ever writing a .env file at all, and that's equally valid.
try {
  process.loadEnvFile();
} catch {
  // No .env on disk — fine, env vars may already be set by the environment.
}

process.env.IS_INTEGRATION_TEST = "1";

/** Unique per PROCESS RUN (not per file, not per developer) — so two
 *  overlapping executions of the exact same test file against the exact
 *  same test database (e.g. a flaky CI retry racing a still-running prior
 *  attempt) can never delete or interfere with each other's in-flight
 *  fixtures. Deliberately NOT crypto.randomUUID() — no need for that much
 *  entropy for a same-process collision guard, and this keeps the emails
 *  it produces short and readable in test output/DB browsing. */
export const TEST_RUN_TAG = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Builds a per-run-unique, clearly-tagged test email from a stable prefix,
 * e.g. scopedTestEmail("qa.lifecycle.ownership.user-a") ->
 * "qa.lifecycle.ownership.user-a.1732147200000-4821-f3k9zq@4rexvision.test".
 *
 * Callers should use the STABLE PREFIX (without the run tag) for a
 * pre-run sweep that cleans up any previous crashed run's leftovers
 * (`email: { startsWith: prefix + "." } }`), and the full tagged email
 * returned here for creating/deleting THIS run's own rows specifically.
 * See any *-integration.test.ts / lifecycle-*.test.ts / market-monitor
 * test file in this directory for the exact two-phase pattern.
 */
export function scopedTestEmail(stablePrefix: string): string {
  return `${stablePrefix}.${TEST_RUN_TAG}@4rexvision.test`;
}
