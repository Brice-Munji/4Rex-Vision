import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Sprint 5.1 — test/production database isolation.
 *
 * Normal app code (Next.js dev/build/start, server actions, API routes) is
 * completely unaffected by this: IS_INTEGRATION_TEST is never set in any of
 * those contexts, so this returns `process.env.DATABASE_URL` exactly as the
 * single `new PrismaClient()` call below always has.
 *
 * It is set to "1" ONLY by src/lib/rex/__tests__/test-db-guard.ts, which
 * every DB-touching lifecycle/market-monitor integration test file imports
 * FIRST (before this module, transitively, ever loads) — see that file's
 * header for why import order is what makes this reliable rather than
 * merely conventional. When the flag is set, this function becomes the
 * ONE place that decides whether a test run is allowed to proceed at all:
 * it throws — before `new PrismaClient()` is even called below, i.e.
 * before any test file's own code has run a single query — unless
 * TEST_DATABASE_URL is present, distinct from DATABASE_URL, and names a
 * database that is recognizably a test database. This is what actually
 * prevents a repeat of the Sprint 5 incident (a test fixture using a real
 * instrument name like "GBPUSD" overwrote a real user's row, because the
 * test imported this exact shared client, unisolated, against the real
 * DATABASE_URL) — not a convention test authors have to remember, a
 * precondition the shared client itself refuses to skip.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.IS_INTEGRATION_TEST !== "1") {
    return process.env.DATABASE_URL;
  }

  const testUrl = process.env.TEST_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;

  if (!testUrl) {
    throw new Error(
      "[prisma] IS_INTEGRATION_TEST=1 but TEST_DATABASE_URL is not set. " +
        "Refusing to fall back to DATABASE_URL — integration tests must run " +
        "against a dedicated test database. Set TEST_DATABASE_URL (see " +
        ".env.example) and re-run."
    );
  }
  if (appUrl && testUrl === appUrl) {
    throw new Error(
      "[prisma] TEST_DATABASE_URL is identical to DATABASE_URL. Refusing to " +
        "run integration tests against the application database."
    );
  }

  let dbName = "";
  try {
    dbName = new URL(testUrl).pathname;
  } catch {
    throw new Error("[prisma] TEST_DATABASE_URL is not a valid connection URL.");
  }
  if (!/test/i.test(dbName)) {
    throw new Error(
      `[prisma] TEST_DATABASE_URL's database name ("${dbName}") does not ` +
        'contain "test". Refusing to run integration tests against what may ' +
        "be a real database. Point TEST_DATABASE_URL at a database whose " +
        "name contains \"test\"."
    );
  }

  return testUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
