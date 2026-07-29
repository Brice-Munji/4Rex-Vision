import "server-only";
import type { ImageMetrics } from "./image-analysis";
import { isSupportedFormat } from "./image-analysis";
import type {
  UploadValidation,
  ReliabilityCheck,
  VisionConfidence,
  ChartSource,
  ImageQuality,
  ImageQualityLabel,
} from "./types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/* ----------------- STEP 6: real image quality inspection ----------------- */

/**
 * Evaluate genuine image quality from measured pixel statistics — resolution,
 * blur, brightness, contrast and cropping. No AI required; entirely real.
 */
export function computeImageQuality(metrics: ImageMetrics): ImageQuality {
  const issues: string[] = [];

  // Resolution (≈1.6MP = full marks).
  const resolutionScore = clamp((metrics.megapixels / 1.6) * 100);
  if (metrics.megapixels < 0.4)
    issues.push("Low resolution — small text and price labels may be hard to read.");

  // Blur / sharpness.
  const sharpnessScore = clamp(metrics.sharpness * 125);
  if (metrics.sharpness < 0.28)
    issues.push("Image looks soft or blurry, which can hide candle detail.");

  // Brightness (too dark or blown out).
  let brightnessScore = 100;
  if (metrics.brightness < 0.06) {
    brightnessScore = 45;
    issues.push("Image is very dark — some labels may be unreadable.");
  } else if (metrics.brightness > 0.97) {
    brightnessScore = 55;
    issues.push("Image is overexposed — faint gridlines may be lost.");
  }

  // Contrast.
  const contrastScore = clamp(metrics.contrast * 170);
  if (metrics.contrast < 0.08)
    issues.push("Low contrast — candles and background are hard to separate.");

  // Cropping (unusual aspect ratio suggests a partial screenshot).
  const idealAspect = metrics.aspectRatio >= 1.2 && metrics.aspectRatio <= 2.6;
  const cropScore = idealAspect
    ? 96
    : clamp(70 - Math.abs(1.7 - metrics.aspectRatio) * 26);
  if (!idealAspect)
    issues.push("Unusual crop — part of the chart or its labels may be cut off.");

  const score = clamp(
    resolutionScore * 0.25 +
      sharpnessScore * 0.3 +
      brightnessScore * 0.15 +
      contrastScore * 0.15 +
      cropScore * 0.15
  );

  let label: ImageQualityLabel;
  if (score >= 85) label = "Excellent";
  else if (score >= 70) label = "Good";
  else if (score >= 50) label = "Fair";
  else label = "Poor";

  return { score, label, issues };
}

/* ------------------------------ STEP 1: validate ------------------------- */

export function validateImage(
  metrics: ImageMetrics
): UploadValidation {
  const formatOk = isSupportedFormat(metrics.format);
  const resolutionScore = clamp((metrics.megapixels / 1.6) * 100);
  const idealAspect = metrics.aspectRatio >= 1.2 && metrics.aspectRatio <= 2.6;
  const aspectScore = idealAspect
    ? 96
    : clamp(70 - Math.abs(1.7 - metrics.aspectRatio) * 26);
  const clarityScore = clamp(metrics.sharpness * 130); // blur detector
  const qualityScore = clamp(
    metrics.contrast * 180 + (metrics.brightness > 0.08 && metrics.brightness < 0.96 ? 30 : 0)
  );
  const completenessScore = clamp((resolutionScore + aspectScore) / 2);

  const checks: ReliabilityCheck[] = [
    { key: "format", label: "File type", score: formatOk ? 100 : 0, ok: formatOk },
    { key: "resolution", label: "Resolution", score: resolutionScore, ok: resolutionScore >= 55 },
    { key: "aspect", label: "Aspect ratio", score: aspectScore, ok: aspectScore >= 55 },
    { key: "clarity", label: "Image clarity", score: clarityScore, ok: clarityScore >= 45 },
    { key: "quality", label: "Image quality", score: qualityScore, ok: qualityScore >= 45 },
    { key: "completeness", label: "Screenshot completeness", score: completenessScore, ok: completenessScore >= 55 },
  ];

  const overall = clamp(checks.reduce((s, c) => s + c.score, 0) / checks.length);
  const reliable = formatOk && overall >= 62 && checks.every((c) => c.ok);

  return {
    checks,
    overall,
    reliable,
    message: reliable
      ? undefined
      : "Analysis reliability may be reduced because important chart details are difficult to identify. For the most accurate report, upload a clearer, higher-resolution screenshot.",
  };
}

/* --------------------------- STEP 2: classify ---------------------------- */

export interface ChartClassification {
  isChart: boolean;
  source: ChartSource;
  confidence: number; // 0-100
  reasons: string[];
}

export function classifyChart(metrics: ImageMetrics): ChartClassification {
  const reasons: string[] = [];

  const candle = metrics.greenRatio + metrics.redRatio;
  const bothColors = metrics.greenRatio > 0.0006 && metrics.redRatio > 0.0006;
  // Candlestick presence. A valid chart can be dominated by one colour (a strong
  // trend), so we don't require BOTH green and red — but a frame that's almost
  // entirely candle-coloured is a red/green photo, not a chart (capped low).
  const candleSignal =
    candle >= 0.16 ? 0.18 : candle > 0.0025 ? Math.min(1, candle / 0.03) : 0;
  if (candleSignal > 0.3) {
    reasons.push(
      bothColors
        ? "Bullish and bearish candles detected"
        : "Candlestick bodies detected"
    );
  }

  const structureSignal = Math.min(1, metrics.neutralRatio / 0.45); // chart bg + grid
  if (metrics.neutralRatio > 0.35) reasons.push("Chart-style background and gridlines present");

  const gridSignal = Math.min(1, metrics.gridScore * 3);
  if (metrics.gridScore > 0.05) reasons.push("Price/time gridlines detected");

  const aspectOk = metrics.aspectRatio >= 0.85 && metrics.aspectRatio <= 3.2;
  if (aspectOk) reasons.push("Aspect ratio consistent with a trading terminal");

  // Photos: colourful across the frame with little neutral area.
  const photoPenalty =
    metrics.colorfulness > 0.42 && metrics.neutralRatio < 0.28 ? 0.5 : 0;

  const score =
    candleSignal * 0.42 +
    structureSignal * 0.28 +
    gridSignal * 0.14 +
    (aspectOk ? 0.12 : 0) +
    (metrics.contrast > 0.08 ? 0.04 : 0) -
    photoPenalty;

  const confidence = clamp(score * 100);
  // Require genuine candle presence (either colour) plus a chart-like frame.
  const isChart = confidence >= 52 && candle > 0.004 && candleSignal > 0.12;

  if (!isChart) {
    reasons.length = 0;
    reasons.push("Could not detect candlesticks or a price/time grid");
    if (photoPenalty) reasons.push("Image looks like a photo, not a trading chart");
  }

  return {
    isChart,
    // Platform is only asserted by the live model; heuristics stay honest.
    source: "Unknown",
    confidence,
    reasons,
  };
}

/* ------------------------ STEP 3: vision confidence ---------------------- */

export function computeVisionConfidence(
  metrics: ImageMetrics,
  classification: ChartClassification,
  ai?: { pairConfidence?: number; timeframeConfidence?: number; source?: ChartSource }
): VisionConfidence {
  const validation = validateImage(metrics);
  const recognition = clamp(
    (validation.overall + Math.min(100, metrics.sharpness * 120)) / 2
  );
  const classificationScore = classification.confidence;

  // Pair / timeframe detection confidence comes from the live model. Without it
  // Rex is honest: it cannot read the ticker text from pixels, so confidence is low.
  const pairScore = ai?.pairConfidence ?? 24;
  const timeframeScore = ai?.timeframeConfidence ?? 22;

  const metricsList = [
    { key: "recognition", label: "Image Recognition", score: recognition },
    { key: "classification", label: "Chart Classification", score: classificationScore },
    {
      key: "pair",
      label: "Currency Pair Detection",
      score: pairScore,
      note: ai ? undefined : "The pair text can't be read without the live vision model.",
    },
    {
      key: "timeframe",
      label: "Timeframe Detection",
      score: timeframeScore,
      note: ai ? undefined : "The timeframe label can't be read without the live vision model.",
    },
  ];

  const overall = clamp(
    metricsList.reduce((s, m) => s + m.score, 0) / metricsList.length
  );

  return {
    metrics: metricsList,
    overall,
    chartSource: ai?.source ?? classification.source,
    reduced: overall < 70,
    note:
      overall < 70
        ? "Some details were hard to read with full confidence — treat this report as directional."
        : undefined,
  };
}
