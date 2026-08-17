import "server-only";
import {
  VISION_SYSTEM_PROMPT,
  VISION_USER_PROMPT,
  parseVisionText,
  type VisionChartRead,
} from "./schema";

/**
 * NVIDIA NIM multimodal vision provider (fallback). The build.nvidia.com catalog
 * is OpenAI-compatible; Llama-3.2 Vision reads the chart image inline. JSON is
 * requested in the prompt and extracted with `parseVisionText` (no forced
 * response_format, which some NIM models reject). Key read from the server env.
 */

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

export function isNvidiaConfigured(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}

export async function readChartWithNvidia(
  base64: string,
  mediaType: string
): Promise<VisionChartRead | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  const model = process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";

  // Last-resort fallback: bound the wait so a slow NIM generation can't hang the
  // request (Gemini + Mistral are tried first).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);

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
        max_tokens: 2500,
        temperature: 0.2,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: VISION_USER_PROMPT },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`NVIDIA vision HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("NVIDIA vision returned no content");

    return parseVisionText(content);
  } finally {
    clearTimeout(timeout);
  }
}
