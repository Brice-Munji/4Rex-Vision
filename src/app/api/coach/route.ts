import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { buildCoachContext } from "@/lib/coach/context";
import { buildCoachSystemPrompt, sanitizeMessages } from "@/lib/coach/prompt";
import { chatWithRexCoach, isCoachConfigured } from "@/lib/coach/llm";

export const dynamic = "force-dynamic";

/**
 * Rex Coach chat endpoint (read-only). Authenticated users only. The user's own
 * data is loaded server-side via the user-scoped context layer and never exposed
 * directly to the browser. This route performs NO writes.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Short-window anti-spam throttle (server-side).
  const ip = await clientIp();
  if (!rateLimit(`coach:user:${user.id}`, 15, 60_000).ok || !rateLimit(`coach:ip:${ip}`, 40, 60_000).ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "You're sending messages too quickly. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  const messages = sanitizeMessages(body?.messages);
  if (!messages) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!isCoachConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Rex Coach isn't available in this environment yet." },
      { status: 503 }
    );
  }

  try {
    // User-scoped context (authenticated user's own data only).
    const context = await buildCoachContext(user);
    const system = buildCoachSystemPrompt(context);
    const reply = await chatWithRexCoach(system, messages);
    return NextResponse.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[coach] failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
    return NextResponse.json(
      { error: "coach_unavailable", message: "Rex Coach is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
