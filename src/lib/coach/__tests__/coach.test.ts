/**
 * Focused tests for Rex Coach's pure logic: message sanitization (what the API
 * route uses to validate client input) and context formatting (missing-data
 * honesty, no fabrication). Runnable with:
 *   npx tsx src/lib/coach/__tests__/coach.test.ts
 *
 * DB-backed checks (auth required, user isolation, live context retrieval) are
 * covered by scripts/coach-live-check.ts against a running Postgres instance —
 * pure unit tests can't exercise Prisma/auth without a database.
 */
import { sanitizeMessages, formatCoachContext, MAX_MESSAGES, MAX_CHARS } from "../prompt";
import type { CoachContext } from "../context";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

/* ── sanitizeMessages ─────────────────────────────────────────────────────── */

check("rejects non-array input", sanitizeMessages("not an array") === null);
check("rejects empty array", sanitizeMessages([]) === null);
check(
  "rejects when last message isn't from user",
  sanitizeMessages([{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }]) === null
);
check(
  "accepts a valid single user message",
  sanitizeMessages([{ role: "user", content: "How did I do this week?" }])?.length === 1
);
check(
  "drops malformed entries (missing content / bad role)",
  sanitizeMessages([
    { role: "user", content: "valid" },
    { role: "system", content: "nope" },
    { role: "user" }, // missing content
    { foo: "bar" },
    { role: "user", content: "second valid" },
  ])?.length === 2
);
check(
  "clamps to MAX_MESSAGES (keeps most recent, last is user)",
  (() => {
    const many = Array.from({ length: MAX_MESSAGES + 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    // Ensure the very last is a user message for a clean assertion.
    many.push({ role: "user", content: "final" });
    const out = sanitizeMessages(many);
    return out !== null && out.length === MAX_MESSAGES && out[out.length - 1].content === "final";
  })()
);
check(
  "clamps overly long content to MAX_CHARS",
  (() => {
    const out = sanitizeMessages([{ role: "user", content: "x".repeat(MAX_CHARS + 500) }]);
    return out !== null && out[0].content.length === MAX_CHARS;
  })()
);
check(
  "trims whitespace and drops empty-after-trim messages",
  sanitizeMessages([{ role: "user", content: "   " }]) === null
);

/* ── formatCoachContext — missing-data honesty (never fabricate) ────────── */

function emptyCtx(): CoachContext {
  return {
    user: { firstName: "Alex", plan: "FREE", subscriptionStatus: "INACTIVE", isPro: false },
    usage: { used: 0, limit: 3, remaining: 3 },
    analyses: { total: 0, recent: [] },
    journal: {
      totalTrades: 0, openTrades: 0, closedTrades: 0, wins: 0, losses: 0,
      winRate: 0, avgR: 0, bestPair: null, recentTrades: [],
    },
    market: { asOfUtc: new Date().toISOString(), status: "unavailable", upcoming: [] },
  };
}

{
  const text = formatCoachContext(emptyCtx());
  check("no analyses → explicit 'none yet' (not fabricated)", /ANALYSES: none yet/i.test(text));
  check("no trades → explicit 'no trades logged'", /JOURNAL: no trades logged yet/i.test(text));
  check("calendar unavailable → explicit, says do not guess", /unavailable/i.test(text) && /do not guess/i.test(text));
}

{
  // A populated context must surface the ACTUAL numbers, not placeholders.
  const ctx = emptyCtx();
  ctx.analyses = {
    total: 2,
    recent: [{ pair: "EURUSD", timeframe: "H1", direction: "Bullish", confidence: 80, headline: "Test headline", date: "2026-09-01T00:00:00.000Z" }],
  };
  ctx.journal = {
    totalTrades: 3, openTrades: 1, closedTrades: 2, wins: 1, losses: 1,
    winRate: 50, avgR: 0.5, bestPair: "EURUSD",
    recentTrades: [{ pair: "EURUSD", direction: "Bullish", result: "WIN", resultR: 2, entry: 1.09, stopLoss: 1.085, takeProfit: 1.1, timeframe: "H1", createdAt: "2026-09-01T00:00:00.000Z" }],
  };
  const text = formatCoachContext(ctx);
  check("includes the real pair", text.includes("EURUSD"));
  check("includes the real win rate", text.includes("50%"));
  check("includes the real headline", text.includes("Test headline"));
  check("includes the real trade result", /WIN/.test(text) && text.includes("2R"));
}

const total = passed + failures.length;
// eslint-disable-next-line no-console
console.log(`\nRex Coach tests: ${passed}/${total} passed`);
if (failures.length) {
  // eslint-disable-next-line no-console
  console.log("FAILURES:\n - " + failures.join("\n - "));
  process.exit(1);
}
