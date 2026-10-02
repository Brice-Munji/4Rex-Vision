import type { CoachContext } from "./context";

/**
 * Pure (testable) prompt + message helpers for Rex Coach. No DB / network here,
 * so this module can be imported by tests without `server-only`.
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export const MAX_MESSAGES = 20; // keep the request bounded
export const MAX_CHARS = 4000; // per message

/** The read-only Rex Coach persona + hard behavioral rules. */
export const COACH_SYSTEM_BASE = `You are Rex Coach, the trading coach inside 4RexVision. You have a natural, supportive conversation with the signed-in trader about THEIR own 4RexVision activity: their chart analyses, Rex Trade Setups, Smart Journal trades, performance stats, and the market/economic-calendar context.

HARD RULES:
1. READ-ONLY. You may explain, summarize, analyze and discuss. You must NEVER modify or create trades, analyses, setups, SL/TP, strategies or account settings, and you cannot execute trades. If asked to change something, explain that the Coach is read-only and point them to the relevant screen.
2. USE ONLY THE PROVIDED CONTEXT. Everything you state as fact about the user's analyses, trades, performance or the calendar must come from the "USER CONTEXT" block below. NEVER invent analyses, trades, prices, results, or economic events. If the data isn't there, say so plainly (e.g. "You haven't logged any trades yet").
3. DISTINGUISH FACT FROM INTERPRETATION. Clearly separate what the data literally shows (facts) from your coaching interpretation/opinion (prefix opinions with "My read:" or similar). Never present interpretation as recorded data.
4. This is the authenticated user's OWN data only. Never reference or imply other users.
5. Be concise, concrete and encouraging. Reference specific pairs/dates/numbers from the context when relevant. Do not give financial advice framed as guarantees; this is educational.`;

/** Build the full system prompt by appending the user's context snapshot. */
export function buildCoachSystemPrompt(ctx: CoachContext): string {
  return `${COACH_SYSTEM_BASE}

===== USER CONTEXT (the authenticated user's own data only) =====
${formatCoachContext(ctx)}
===== END USER CONTEXT =====`;
}

/**
 * Render the context as a compact, labeled block. Empty sections are stated
 * explicitly so Rex never fabricates missing data.
 */
export function formatCoachContext(ctx: CoachContext): string {
  const lines: string[] = [];
  lines.push(`USER: ${ctx.user.firstName ?? "Trader"} · plan=${ctx.user.plan} · pro=${ctx.user.isPro ? "active" : "inactive"}`);
  lines.push(`USAGE: ${ctx.usage.used} used, ${ctx.usage.remaining} remaining (limit ${ctx.usage.limit})`);

  lines.push("");
  if (ctx.analyses.total === 0) {
    lines.push("ANALYSES: none yet — the user has not run any chart analyses.");
  } else {
    lines.push(`ANALYSES (most recent ${ctx.analyses.recent.length} of ${ctx.analyses.total}):`);
    for (const a of ctx.analyses.recent) {
      lines.push(
        `- ${a.date.slice(0, 10)} ${a.pair ?? "?"} ${a.timeframe ?? ""} · ${a.direction ?? "?"} (${a.confidence ?? "?"}%) — ${a.headline ?? ""}`.trim()
      );
    }
  }

  lines.push("");
  const j = ctx.journal;
  if (j.totalTrades === 0) {
    lines.push("JOURNAL: no trades logged yet.");
  } else {
    lines.push(
      `JOURNAL STATS: ${j.totalTrades} trades (${j.openTrades} open, ${j.closedTrades} closed) · ` +
        `win rate ${j.winRate}% (${j.wins}W/${j.losses}L) · avg ${j.avgR}R · best pair ${j.bestPair ?? "n/a"}`
    );
    lines.push(`RECENT TRADES (${j.recentTrades.length}):`);
    for (const t of j.recentTrades) {
      lines.push(
        `- ${t.createdAt.slice(0, 10)} ${t.pair} ${t.timeframe ?? ""} ${t.direction ?? ""} · ${t.result}` +
          (t.resultR != null ? ` ${t.resultR}R` : "") +
          (t.entry != null ? ` · entry ${t.entry}` : "") +
          (t.stopLoss != null ? ` SL ${t.stopLoss}` : "") +
          (t.takeProfit != null ? ` TP ${t.takeProfit}` : "")
      );
    }
  }

  lines.push("");
  if (ctx.market.status === "unavailable" || ctx.market.upcoming.length === 0) {
    lines.push(
      ctx.market.status === "unavailable"
        ? "MARKET/CALENDAR: economic-calendar data unavailable right now (do not guess events)."
        : "MARKET/CALENDAR: no high/medium-impact events upcoming in the window."
    );
  } else {
    lines.push(`MARKET/CALENDAR (${ctx.market.status}, as of ${ctx.market.asOfUtc.slice(0, 16)}Z):`);
    for (const e of ctx.market.upcoming) {
      lines.push(`- ${e.currency} ${e.title} — ${e.impact} impact · in ~${e.minutesUntil} min`);
    }
  }

  return lines.join("\n");
}

/**
 * Validate + clamp the client-supplied conversation. Drops malformed items,
 * trims overly long content, and keeps only the most recent MAX_MESSAGES. The
 * last message must be from the user.
 */
export function sanitizeMessages(input: unknown): CoachMessage[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned: CoachMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_CHARS);
    if (!text) continue;
    cleaned.push({ role, content: text });
  }
  const trimmed = cleaned.slice(-MAX_MESSAGES);
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") return null;
  return trimmed;
}
