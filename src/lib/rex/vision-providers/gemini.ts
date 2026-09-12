import "server-only";
import {
  VISION_SYSTEM_PROMPT,
  VISION_USER_PROMPT,
  parseVisionText,
  type VisionChartRead,
} from "./schema";

/**
 * Google Gemini 2.5 Flash multimodal vision provider.
 * Uses the Generative Language REST API directly (no SDK dependency). The image
 * is sent inline (base64); JSON output is requested via responseMimeType. The
 * API key is read from the server environment only.
 */

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function readChartWithGemini(
  base64: string,
  mediaType: string
): Promise<VisionChartRead | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: VISION_USER_PROMPT },
              { inline_data: { mime_type: mediaType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          // Gemini 2.5 Flash is a THINKING model: internal reasoning tokens are
          // drawn from the output budget. With thinking on and a small cap, the
          // JSON answer gets truncated mid-array (invalid JSON → provider fails →
          // wrong/weak fallback bias). Disable thinking and give the structured
          // answer plenty of room so it always returns complete JSON.
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini vision HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const candidate = json.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) {
      throw new Error(
        `Gemini vision returned no content (finishReason=${candidate?.finishReason ?? "unknown"})`
      );
    }
    // parseVisionText salvages a truncated response (finishReason MAX_TOKENS) so
    // the core read (pair/bias/levels) survives even if a late field is cut.
    return parseVisionText(text);
  } finally {
    clearTimeout(timeout);
  }
}
