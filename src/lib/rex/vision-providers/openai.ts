import "server-only";
import {
  VISION_SYSTEM_PROMPT,
  VISION_USER_PROMPT,
  parseVisionText,
  type VisionChartRead,
} from "./schema";

/**
 * OpenAI GPT-4o / GPT-4.1 multimodal vision provider.
 * Uses the REST Chat Completions API directly (no SDK dependency). The image is
 * sent inline as a data URL; the model must return a JSON object (json_object
 * response format). The API key is read from the server environment only.
 */

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function readChartWithOpenAI(
  base64: string,
  mediaType: string
): Promise<VisionChartRead | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";

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
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI vision HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI vision returned no content");

    return parseVisionText(content);
  } finally {
    clearTimeout(timeout);
  }
}
