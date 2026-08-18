import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAnalysisGate, consumeAnalysis } from "@/lib/usage";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { analyzeChartImage, type MediaType } from "@/lib/rex/vision-providers";

const ALLOWED: MediaType[] = ["image/png", "image/jpeg", "image/webp"];

/**
 * Backend Vision endpoint. Accepts a base64 chart image and returns the
 * multimodal model's structured recognition JSON (VisionChartRead). API keys are
 * read from the server environment only and are never exposed to the client.
 *
 * Hardened: enforces auth, the same daily analysis gate as the main flow, a
 * short-window rate limit, and consumes exactly one credit ONLY on success — so
 * this endpoint cannot be used to bypass free/Pro limits, and a failed provider
 * attempt never consumes a credit.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true, dailyAnalysisCount: true, analysisCountDate: true },
  });
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Daily allowance (server-side source of truth).
  const gate = await evaluateAnalysisGate(user);
  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, error: "limit_reached", message: "Daily analysis limit reached." },
      { status: 429 }
    );
  }

  // Short-window anti-spam throttle (server-side; cannot be bypassed).
  const ip = await clientIp();
  const perUser = user.plan === "FREE" ? 6 : 20;
  if (!rateLimit(`vision:user:${user.id}`, perUser, 60_000).ok || !rateLimit(`vision:ip:${ip}`, 40, 60_000).ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  let body: { base64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const base64 = body.base64?.replace(/^data:[^,]+,/, "");
  const mediaType = (body.mediaType ?? "image/png") as MediaType;
  if (!base64) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ALLOWED.includes(mediaType)) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const result = await analyzeChartImage(base64, mediaType);

  if (result.status === "no-provider") {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: "No vision provider configured." },
      { status: 503 }
    );
  }

  // Failed provider attempt → do NOT consume a credit.
  if (result.status === "unavailable") {
    return NextResponse.json(
      { ok: false, error: "vision_unavailable", message: "Vision service temporarily unavailable." },
      { status: 502 }
    );
  }

  // Success → consume exactly one credit.
  try {
    await consumeAnalysis(user.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[rex.vision.route] consume failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, provider: result.provider, data: result.data });
}
