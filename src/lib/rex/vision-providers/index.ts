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

/**
 * Per-provider cooldown. When a provider signals it's over its own rate limit
 * (HTTP 429) or is having a server-side incident (5xx), we skip it for a short
 * window so we don't keep hammering it (respecting the provider's API limits)
 * and fall through to the next provider faster. Process-local, best-effort.
 */
const providerCooldownUntil = new Map<VisionProviderName, number>();
const RATE_LIMIT_COOLDOWN_MS = 60_000; // 429 → back off 60s
const SERVER_ERROR_COOLDOWN_MS = 20_000; // 5xx → back off 20s

function cooldownFor(message: string): number {
  if (/\b429\b|rate.?limit|too many requests/i.test(message)) return RATE_LIMIT_COOLDOWN_MS;
  if (/\b5\d\d\b|overloaded|unavailable/i.test(message)) return SERVER_ERROR_COOLDOWN_MS;
  return 0;
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

  const now = Date.now();
  let lastError = "Vision providers did not return a valid result.";
  let attempts = 0;

  // Sequential fallback: try each provider in priority order and STOP at the
  // first success. The next provider is only tried when the previous one fails,
  // times out, or returns an unusable result — providers are never all called
  // unnecessarily.
  for (let i = 0; i < active.length; i++) {
    const provider = active[i];

    // Skip a provider that's in a cooldown from a recent 429/5xx.
    const until = providerCooldownUntil.get(provider.name) ?? 0;
    if (until > now) {
      // eslint-disable-next-line no-console
      console.warn(
        `[rex.vision] skip ${provider.name} — cooling down for ${Math.ceil((until - now) / 1000)}s`
      );
      lastError = `${provider.name} is temporarily rate-limited.`;
      continue;
    }

    attempts++;
    const started = Date.now();
    try {
      const data = await provider.read(base64, mediaType);
      if (data) {
        if (i > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[rex.vision] fallback succeeded via ${provider.name} (attempt ${attempts})`);
        }
        return { status: "ok", data, provider: provider.name };
      }
      lastError = `${provider.name} returned no usable result.`;
      // eslint-disable-next-line no-console
      console.warn(`[rex.vision] ${provider.name} returned no usable result (${Date.now() - started}ms)`);
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      const message = aborted
        ? `${provider.name} timed out`
        : err instanceof Error
          ? err.message
          : `${provider.name} request failed`;
      lastError = message;

      const cd = aborted ? SERVER_ERROR_COOLDOWN_MS : cooldownFor(message);
      if (cd > 0) providerCooldownUntil.set(provider.name, Date.now() + cd);

      // Log the reason (no image data, no keys) so failures/fallbacks are traceable.
      // eslint-disable-next-line no-console
      console.error(
        `[rex.vision] ${provider.name} failed (${Date.now() - started}ms)${aborted ? " [timeout]" : ""}${cd ? " [cooldown]" : ""}: ${message}`
      );
      // Continue to the next provider (fallback).
    }
  }

  // eslint-disable-next-line no-console
  console.error(`[rex.vision] all ${active.length} provider(s) unavailable: ${lastError}`);
  return { status: "unavailable", error: lastError };
}
