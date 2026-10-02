import "server-only";
import type { CoachMessage } from "./prompt";

/**
 * Minimal text chat for Rex Coach, reusing the existing Gemini credentials/model
 * (the same provider powering vision). Server-side only; the key never reaches
 * the browser. Non-streaming for simplicity. Thinking is disabled so the whole
 * output budget goes to the reply.
 */
export function isCoachConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function chatWithRexCoach(
  system: string,
  messages: CoachMessage[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Coach LLM not configured");
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 1024,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Coach LLM HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error("Coach LLM returned no content");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
