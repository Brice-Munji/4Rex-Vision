import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  VISION_SYSTEM_PROMPT,
  VISION_USER_PROMPT,
  parseVisionText,
  type VisionChartRead,
} from "./schema";

/**
 * Anthropic Claude multimodal vision provider (tertiary fallback). Uses the
 * shared Vision contract so it's interchangeable with OpenAI / Gemini.
 */

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function readChartWithAnthropic(
  base64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp"
): Promise<VisionChartRead | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.REX_VISION_MODEL || "claude-opus-4-8";

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: VISION_USER_PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  return parseVisionText(textBlock.text);
}
