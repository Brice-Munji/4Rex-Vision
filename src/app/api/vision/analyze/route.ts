import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeChartImage, type MediaType } from "@/lib/rex/vision-providers";

const ALLOWED: MediaType[] = ["image/png", "image/jpeg", "image/webp"];

/**
 * Backend Vision endpoint. Accepts a base64 chart image and returns the
 * multimodal model's structured recognition JSON (VisionChartRead). API keys
 * are read from the server environment only and are never exposed to the client.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  if (result.status === "unavailable") {
    return NextResponse.json(
      { ok: false, error: "vision_unavailable", message: "Vision service temporarily unavailable." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, provider: result.provider, data: result.data });
}
