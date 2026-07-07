"use server";

import { auth } from "@/auth";
import { analyzeImage } from "@/lib/rex/image-analysis";
import {
  validateImage,
  classifyChart,
  computeVisionConfidence,
  computeImageQuality,
  type ChartClassification,
} from "@/lib/rex/vision";
import { readChartWithAI, isAiConfigured } from "@/lib/rex/anthropic-engine";
import { getEconomicContext } from "@/lib/rex/economic";
import { normalizeInstrument, unsupportedReason } from "@/lib/rex/instruments";
import { rex } from "@/lib/rex/mock-pipeline";
import { CLOSING_NOTE } from "@/lib/rex/scenarios";
import type {
  RexReport,
  UploadValidation,
  ReliabilitySection,
  VisionConfidence,
  Timeframe,
  PriceLevelType,
  ConceptKey,
  ChartMetadata,
  TradingPlatform,
  ReadTimeframe,
} from "@/lib/rex/types";
import type { ImageMetrics } from "@/lib/rex/image-analysis";
import type { AiChartRead } from "@/lib/rex/anthropic-engine";

export type AnalyzeInput = {
  base64: string; // raw base64 (no data: prefix)
  fileName: string;
  sizeBytes: number;
};

export type AnalyzeResult =
  | { status: "invalid"; reason: string; validation: UploadValidation }
  | {
      status: "unsupported";
      classification: ChartClassification;
      visionConfidence: VisionConfidence;
    }
  | { status: "ok"; report: RexReport; metadata: ChartMetadata };

const POSITION_BY_TYPE: Record<PriceLevelType, number> = {
  "Take Profit": 90,
  Resistance: 72,
  Entry: 52,
  Support: 30,
  Invalidation: 10,
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mediaTypeFor(format: string): "image/png" | "image/jpeg" | "image/webp" {
  if (format === "jpeg" || format === "jpg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

function mapPlatform(source: AiChartRead["chartSource"]): TradingPlatform {
  return source === "Unknown" ? "Unknown Trading Platform" : source;
}

/** Build the structured Chart Reader metadata (Steps 1-8). */
function buildMetadata(
  ai: AiChartRead | null,
  metrics: ImageMetrics
): ChartMetadata {
  const imageQuality = computeImageQuality(metrics);

  if (!ai) {
    // No live vision model — image quality is real, text can't be read. Be honest.
    return {
      platform: "Unknown Trading Platform",
      platformConfidence: 0,
      instrument: null,
      symbol: null,
      instrumentConfidence: 0,
      instrumentSupported: false,
      timeframe: null,
      timeframeConfidence: 0,
      currentPrice: null,
      priceConfidence: 0,
      bidAsk: null,
      chartTitle: null,
      imageQuality,
      overallConfidence: 0,
      aiPowered: false,
      notes: [
        "Rex's live vision model isn't connected in this environment, so on-chart text (platform, pair, timeframe, price) can't be read. Image quality below is measured for real.",
      ],
    };
  }

  const normalized = normalizeInstrument(ai.symbol ?? ai.pair);
  const instrument = normalized?.instrument ?? ai.pair ?? null;
  const symbol = normalized?.symbol ?? ai.symbol ?? null;
  const instrumentSupported = normalized?.supported ?? false;
  const timeframe: ReadTimeframe | null =
    ai.timeframe === "Unknown" ? null : (ai.timeframe as ReadTimeframe);

  const notes: string[] = [];
  if (!instrument) notes.push("Currency pair: Unable to determine from the uploaded image.");
  if (!timeframe) notes.push("Timeframe not visible.");
  if (!ai.currentPrice) notes.push("Current price: Unable to determine from the uploaded image.");
  if (instrument && normalized && !instrumentSupported)
    notes.push(unsupportedReason(normalized));

  // Overall metadata confidence = average across the fields Rex actually detected.
  const detected: number[] = [];
  if (ai.chartSource !== "Unknown") detected.push(clamp(ai.platformConfidence));
  if (instrument) detected.push(clamp(ai.pairConfidence));
  if (timeframe) detected.push(clamp(ai.timeframeConfidence));
  if (ai.currentPrice) detected.push(clamp(ai.priceConfidence));
  const overallConfidence = detected.length
    ? clamp(detected.reduce((s, n) => s + n, 0) / detected.length)
    : 0;

  return {
    platform: mapPlatform(ai.chartSource),
    platformConfidence: clamp(ai.platformConfidence),
    instrument,
    symbol,
    instrumentConfidence: instrument ? clamp(ai.pairConfidence) : 0,
    instrumentSupported,
    timeframe,
    timeframeConfidence: timeframe ? clamp(ai.timeframeConfidence) : 0,
    currentPrice: ai.currentPrice,
    priceConfidence: ai.currentPrice ? clamp(ai.priceConfidence) : 0,
    bidAsk: ai.bidAsk,
    chartTitle: ai.chartTitle,
    imageQuality,
    overallConfidence,
    aiPowered: true,
    notes,
  };
}

function buildReliability(
  validation: UploadValidation,
  trendStrength: "Weak" | "Moderate" | "Strong"
): ReliabilitySection {
  const get = (k: string) =>
    validation.checks.find((c) => c.key === k)?.score ?? 70;
  const trendClarity =
    trendStrength === "Strong" ? 90 : trendStrength === "Moderate" ? 78 : 60;
  const metrics = [
    { key: "chart", label: "Chart Quality", score: clamp((get("quality") + get("completeness")) / 2) },
    { key: "trend", label: "Trend Clarity", score: trendClarity },
    { key: "image", label: "Image Quality", score: get("clarity") },
    { key: "indicators", label: "Indicator Visibility", score: clamp(get("clarity") - 5) },
    { key: "timeframe", label: "Timeframe Visibility", score: clamp(get("resolution") - 2) },
  ];
  const overall = clamp(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const reduced = overall < 70;
  return {
    metrics,
    overall,
    reduced,
    note: reduced
      ? "Some chart details were harder to read, so treat this report as directional rather than precise. A clearer screenshot would improve accuracy."
      : undefined,
  };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildReportFromAI(
  ai: AiChartRead,
  validation: UploadValidation,
  visionConfidence: VisionConfidence,
  economic: RexReport["economic"]
): RexReport {
  const overallConfidence = clamp(
    ai.confidence.length
      ? ai.confidence.reduce((s, c) => s + c.score, 0) / ai.confidence.length
      : ai.biasConfidence
  );

  return {
    id: `rex_${slug(ai.pair ?? "chart")}_${Date.now().toString(36)}`,
    pair: ai.pair ?? "Unknown pair",
    timeframe: (ai.timeframe === "Unknown" ? "H1" : ai.timeframe) as Timeframe,
    generatedAtLabel: "Just now",
    headline: ai.headline,
    aiPowered: true,
    chartSource: ai.chartSource,
    currentPrice: ai.currentPrice,
    visionConfidence,
    trend: {
      direction: ai.trendDirection,
      strength: ai.trendStrength,
      timeframe: (ai.timeframe === "Unknown" ? "H1" : ai.timeframe) as Timeframe,
      summary: ai.trendSummary,
    },
    bias: {
      bias: ai.bias,
      confidence: clamp(ai.biasConfidence),
      suggestedDirection: ai.suggestedDirection,
      summary: ai.biasSummary,
    },
    confidence: ai.confidence.map((c) => ({
      key: slug(c.label),
      label: c.label,
      score: clamp(c.score),
      contributors: c.contributors,
    })),
    overallConfidence,
    economic,
    priceLevels: ai.priceLevels.map((l) => ({
      type: l.type,
      value: l.value,
      description: l.description,
      position: POSITION_BY_TYPE[l.type],
    })),
    evidence: ai.evidence.map((e, i) => ({
      key: `ev-${i}`,
      label: e.label,
      explanation: e.explanation,
      icon: "Activity",
    })),
    plainEnglish: ai.plainEnglish.map((p) => ({
      technical: p.technical,
      plain: p.plain,
      concept: (p.concept ?? undefined) as ConceptKey | undefined,
    })),
    insight: { title: ai.insightTitle, body: ai.insightBody },
    reliability: buildReliability(validation, ai.trendStrength),
    whatCouldChange: ai.whatCouldChange,
    closingNote: CLOSING_NOTE,
  };
}

export async function analyzeChart(
  input: AnalyzeInput
): Promise<AnalyzeResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      status: "invalid",
      reason: "You need to be signed in to analyze charts.",
      validation: { checks: [], overall: 0, reliable: false },
    };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.base64, "base64");
  } catch {
    return {
      status: "invalid",
      reason: "That file could not be read. Please upload a PNG or JPG screenshot.",
      validation: { checks: [], overall: 0, reliable: false },
    };
  }

  // STEP 1 — real image analysis + validation
  const metrics = await analyzeImage(buffer, input.sizeBytes);
  if (!metrics) {
    return {
      status: "invalid",
      reason:
        "Rex couldn't read that image. Please upload a clear PNG, JPG or JPEG screenshot of your chart.",
      validation: { checks: [], overall: 0, reliable: false },
    };
  }

  const validation = validateImage(metrics);
  const formatOk = validation.checks.find((c) => c.key === "format")?.ok;
  if (!formatOk) {
    return {
      status: "invalid",
      reason:
        "That file type isn't supported. Please upload a PNG, JPG or JPEG chart screenshot.",
      validation,
    };
  }

  // STEP 2 — chart classification (reject non-charts gracefully)
  const classification = classifyChart(metrics);
  if (!classification.isChart) {
    return {
      status: "unsupported",
      classification,
      visionConfidence: computeVisionConfidence(metrics, classification),
    };
  }

  // STEPS 3-11 — live model if configured, otherwise transparent fallback
  const mediaType = mediaTypeFor(metrics.format);
  const ai = isAiConfigured()
    ? await readChartWithAI(input.base64, mediaType)
    : null;

  if (ai && !ai.isForexChart) {
    return {
      status: "unsupported",
      classification: {
        ...classification,
        isChart: false,
        reasons: ["The live vision model did not recognize a supported Forex chart."],
      },
      visionConfidence: computeVisionConfidence(metrics, classification),
    };
  }

  if (ai) {
    const visionConfidence = computeVisionConfidence(metrics, classification, {
      pairConfidence: clamp(ai.pairConfidence),
      timeframeConfidence: clamp(ai.timeframeConfidence),
      source: ai.chartSource,
    });
    const economic = await getEconomicContext(ai.pair);
    return {
      status: "ok",
      report: buildReportFromAI(ai, validation, visionConfidence, economic),
      metadata: buildMetadata(ai, metrics),
    };
  }

  // Fallback: transparent sample analysis (no live model configured).
  const meta = {
    fileName: input.fileName,
    width: metrics.width,
    height: metrics.height,
    sizeBytes: input.sizeBytes,
  };
  const report = await rex.analyze(meta);
  report.aiPowered = false;
  report.chartSource = classification.source;
  report.visionConfidence = computeVisionConfidence(metrics, classification);
  report.reliability = buildReliability(validation, report.trend.strength);
  report.notice = isAiConfigured()
    ? "Rex's live vision model was unavailable for this upload, so this is a representative sample analysis — not a reading of your specific chart. Please try again."
    : "Rex's live vision model isn't connected in this environment, so this is a representative sample analysis — not a reading of your specific chart. Set ANTHROPIC_API_KEY to enable live analysis of your uploads.";
  return { status: "ok", report, metadata: buildMetadata(null, metrics) };
}
