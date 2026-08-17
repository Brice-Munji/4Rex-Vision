import "server-only";
import {
  VISION_SYSTEM_PROMPT,
  VISION_USER_PROMPT,
  parseVisionText,
  type VisionChartRead,
} from "./schema";

/**
 * Mistral multimodal vision provider (fallback). Uses the OpenAI-compatible
 * Chat Completions API. Image sent inline as a data URL; JSON requested via
 * response_format. Key read from the server environment only.
 */

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

export function isMistralConfigured(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

export async function readChartWithMistral(
  base64: string,
  mediaType: string
): Promise<VisionChartRead | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const model = process.env.MISTRAL_VISION_MODEL || "mistral-small-latest";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: VISION_USER_PROMPT },
              // Mistral accepts image_url as a data-URL string.
              { type: "image_url", image_url: `data:${mediaType};base64,${base64}` },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Mistral vision HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Mistral vision returned no content");

    return parseVisionText(content);
  } finally {
    clearTimeout(timeout);
  }
}
