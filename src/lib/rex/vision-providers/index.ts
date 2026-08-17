import "server-only";
import { readChartWithOpenAI, isOpenAIConfigured } from "./openai";
import { readChartWithGemini, isGeminiConfigured } from "./gemini";
import { readChartWithMistral, isMistralConfigured } from "./mistral";
import { readChartWithNvidia, isNvidiaConfigured } from "./nvidia";
import { readChartWithAnthropic, isAnthropicConfigured } from "./anthropic";
import type { VisionChartRead } from "./schema";

export type { VisionChartRead } from "./schema";
export { normalizeVisionRead, parseVisionText } from "./schema";

export type MediaType = "image/png" | "image/jpeg" | "image/webp";

export type VisionProviderName = "openai" | "gemini" | "mistral" | "nvidia" | "anthropic";

export interface VisionProvider {
  name: VisionProviderName;
  configured: () => boolean;
  read: (base64: string, mediaType: MediaType) => Promise<VisionChartRead | null>;
}

/**
 * Providers in priority order. OpenAI → Gemini are the primaries; Mistral and
 * NVIDIA NIM are OpenAI-compatible fallbacks that kick in when the primaries
 * fail/aren't configured; Anthropic is the final fallback. Only providers with
 * a configured API key participate.
 */
const PROVIDERS: VisionProvider[] = [
  { name: "openai", configured: isOpenAIConfigured, read: readChartWithOpenAI },
  { name: "gemini", configured: isGeminiConfigured, read: readChartWithGemini },
  { name: "mistral", configured: isMistralConfigured, read: readChartWithMistral },
  { name: "nvidia", configured: isNvidiaConfigured, read: readChartWithNvidia },
  { name: "anthropic", configured: isAnthropicConfigured, read: readChartWithAnthropic },
];

export function configuredProviders(): VisionProviderName[] {
  return PROVIDERS.filter((p) => p.configured()).map((p) => p.name);
}

export function isVisionConfigured(): boolean {
  return PROVIDERS.some((p) => p.configured());
}

export type VisionResult =
  /** A provider successfully read the chart. */
  | { status: "ok"; data: VisionChartRead; provider: VisionProviderName }
  /** No provider is configured — caller may use the transparent sample fallback. */
  | { status: "no-provider" }
  /** Providers are configured but all failed — show "temporarily unavailable". */
  | { status: "unavailable"; error: string };

/**
 * Analyze a chart image with the first configured provider (priority order),
 * falling through to the next provider on failure. Returns a discriminated
 * result so callers can distinguish "not configured" from "temporarily down".
 */
export async function analyzeChartImage(
  base64: string,
  mediaType: MediaType
): Promise<VisionResult> {
  const active = PROVIDERS.filter((p) => p.configured());
  if (active.length === 0) return { status: "no-provider" };

  let lastError = "Vision providers did not return a valid result.";
  for (const provider of active) {
    try {
      const data = await provider.read(base64, mediaType);
      if (data) return { status: "ok", data, provider: provider.name };
      lastError = `${provider.name} returned no readable result.`;
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : `${provider.name} request failed.`;
      // eslint-disable-next-line no-console
      console.error(`[rex] vision provider ${provider.name} failed:`, err);
    }
  }

  return { status: "unavailable", error: lastError };
}
