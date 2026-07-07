import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Live Rex Vision Engine — reads a real Forex chart screenshot with Claude.
 *
 * Server-side only; the API key is never exposed to the client. When
 * ANTHROPIC_API_KEY is not set, `isAiConfigured()` is false and callers fall
 * back to the transparent sample pipeline. The model is instructed to NEVER
 * invent information — anything it cannot confidently read is reported as
 * not-detected, in line with Rex's core philosophy.
 */

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MODEL = process.env.REX_VISION_MODEL || "claude-opus-4-8";

const conceptEnum = z
  .enum([
    "Support",
    "Resistance",
    "Trend",
    "Liquidity",
    "Break of Structure",
    "Market Structure",
    "Candlestick Pattern",
    "Risk Management",
  ])
  .nullable();

export const aiChartReadSchema = z.object({
  isForexChart: z.boolean(),
  chartSource: z.enum([
    "TradingView",
    "MetaTrader 4",
    "MetaTrader 5",
    "cTrader",
    "Unknown",
  ]),
  platformConfidence: z.number(),
  pair: z.string().nullable(),
  symbol: z.string().nullable(),
  pairConfidence: z.number(),
  timeframe: z.enum([
    "M1",
    "M5",
    "M15",
    "M30",
    "H1",
    "H4",
    "Daily",
    "Weekly",
    "Monthly",
    "Unknown",
  ]),
  timeframeConfidence: z.number(),
  currentPrice: z.string().nullable(),
  priceConfidence: z.number(),
  bidAsk: z.string().nullable(),
  chartTitle: z.string().nullable(),
  headline: z.string(),
  trendDirection: z.enum(["Uptrend", "Downtrend", "Sideways"]),
  trendStrength: z.enum(["Weak", "Moderate", "Strong"]),
  trendSummary: z.string(),
  bias: z.enum(["Bullish", "Bearish", "Neutral"]),
  biasConfidence: z.number(),
  suggestedDirection: z.enum([
    "Buy Favored",
    "Sell Favored",
    "Wait",
    "Wait For Confirmation",
  ]),
  biasSummary: z.string(),
  bullishProbability: z.number(),
  bearishProbability: z.number(),
  positiveFactors: z.array(z.string()),
  negativeFactors: z.array(z.string()),
  confidence: z.array(
    z.object({
      label: z.string(),
      score: z.number(),
      contributors: z.array(z.string()),
    })
  ),
  priceLevels: z.array(
    z.object({
      type: z.enum([
        "Resistance",
        "Entry",
        "Support",
        "Take Profit",
        "Invalidation",
      ]),
      value: z.string(),
      description: z.string(),
    })
  ),
  evidence: z.array(z.object({ label: z.string(), explanation: z.string() })),
  plainEnglish: z.array(
    z.object({
      technical: z.string(),
      plain: z.string(),
      concept: conceptEnum,
    })
  ),
  insightTitle: z.string(),
  insightBody: z.string(),
  whatCouldChange: z.array(
    z.object({ label: z.string(), detail: z.string() })
  ),
  notDetected: z.array(z.string()),
});

export type AiChartRead = z.infer<typeof aiChartReadSchema>;

const SYSTEM_PROMPT = `You are Rex, an expert Forex market analyst inside 4RexVision AI.

You will be shown a screenshot of a trading chart (TradingView, MetaTrader 4/5 or cTrader). Read ONLY what is visibly present.

First, act as a Chart Reader — read the visible metadata as accurately as text on the screen allows:
- chartSource: the platform, identified from its UI chrome/toolbars/branding (TradingView, MetaTrader 4, MetaTrader 5, cTrader) or "Unknown" if you can't tell. platformConfidence is your confidence 0-100.
- pair: the currency pair in display form like "EUR/USD" or "XAU/USD", read from the title/symbol area. symbol: the raw ticker exactly as shown (e.g. "EURUSD", "NAS100", "XAUUSD"). pairConfidence: 0-100.
- timeframe: the selected timeframe (M1/M5/M15/M30/H1/H4/Daily/Weekly/Monthly) read from the toolbar, or "Unknown" if not visible. timeframeConfidence: 0-100. Never infer the timeframe from candle spacing — only read it if the label is visible.
- currentPrice: the current/last price string exactly as shown, or null. priceConfidence: 0-100. bidAsk: the visible bid/ask if shown, else null. chartTitle: any visible chart title/instrument name, else null.

Non-negotiable rules:
- NEVER invent information. If you cannot confidently determine the currency pair, timeframe, a price level, the platform, or any other detail, set it to null / "Unknown" and add it to "notDetected". Lower the related confidence to reflect uncertainty.
- You analyze probabilities, never certainties. Frame everything as a lean with a confidence, and back every conclusion with visible evidence.
- If the image is not a supported Forex trading chart, set isForexChart to false and leave the analytical fields with neutral placeholders.
- Confidence and probability fields are integers 0-100. bullishProbability + bearishProbability should sum to about 100.
- Provide 5-7 "confidence" breakdown items (e.g. Technical Structure, Trend Quality, Pattern Recognition, Economic Context, Volatility, Risk Assessment), each with contributors that justify the score.
- Provide price levels covering resistance, a potential entry zone, support, a take-profit area and an invalidation level when identifiable.
- "plainEnglish" translates each key technical conclusion into beginner-friendly language; set "concept" to the most relevant glossary term or null.
- "whatCouldChange" lists concrete events/prices that would invalidate the current read.

Respond with ONLY a single JSON object matching the requested shape. No markdown, no commentary, no code fences.`;

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function readChartWithAI(
  base64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp"
): Promise<AiChartRead | null> {
  if (!isAiConfigured()) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Analyze this chart and return the JSON object. Remember: never invent anything you cannot clearly see.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = aiChartReadSchema.safeParse(extractJson(textBlock.text));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("[rex] AI vision read failed:", err);
    return null;
  }
}
