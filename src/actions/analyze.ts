"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateAnalysisGate,
  consumeAnalysis,
  type UsageSummary,
} from "@/lib/usage";
import { analyzeImage, makeThumbnailDataUrl } from "@/lib/rex/image-analysis";
import {
  validateImage,
  classifyChart,
  computeVisionConfidence,
  computeImageQuality,
  type ChartClassification,
} from "@/lib/rex/vision";
import {
  analyzeChartImage,
  isVisionConfigured,
  type VisionChartRead,
} from "@/lib/rex/vision-providers";
import { getEconomicContext } from "@/lib/rex/economic";
import { recordAnalysisEvent } from "@/lib/admin/telemetry";
import { notifyAnalysisSaved } from "@/lib/notifications/service";
import { normalizeInstrument, unsupportedReason } from "@/lib/rex/instruments";
import { rex } from "@/lib/rex/mock-pipeline";
import { CLOSING_NOTE } from "@/lib/rex/scenarios";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { detectDivergence } from "@/lib/rex/correlation";
import {
  assessPairExtraction,
  guardPrimaryPair,
  displayTimeframe,
  applyConfidencePolicy,
  confidenceReasons,
  normalizePairKey,
  PAIR_NOT_DETECTED_TITLE,
  PAIR_NOT_DETECTED_MESSAGE,
  type ConfidenceFlags,
} from "@/lib/rex/pair-integrity";
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
  AnalysisContext,
  CorrelationCheck,
} from "@/lib/rex/types";
import type { ImageMetrics } from "@/lib/rex/image-analysis";

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
  /** Vision providers are configured but the request failed — show a soft error. */
  | { status: "unavailable"; message: string }
  /** Too many requests in a short window (anti-spam) — no credit consumed. */
  | { status: "rate_limited"; message: string }
  /** Strict validation: the pair could not be confidently extracted. Never guess. */
  | { status: "pair_not_detected"; title: string; message: string }
  /** Explorer daily limit reached — blocked BEFORE any AI processing. */
  | { status: "limit_reached"; usage: UsageSummary; resetAt: string }
  | {
      status: "ok";
      report: RexReport;
      metadata: ChartMetadata;
      usage?: UsageSummary;
    };

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

/** Map the vision model's platform enum to the UI's TradingPlatform enum. */
function mapPlatform(platform: VisionChartRead["platform"]): TradingPlatform {
  return platform === "Unknown" ? "Unknown Trading Platform" : platform;
}

/**
 * Build the structured Chart Reader metadata from the real multimodal vision
 * read. Missing fields stay `null`/empty — a chart is never rejected because one
 * field couldn't be detected.
 */
function buildMetadata(
  ai: VisionChartRead | null,
  metrics: ImageMetrics
): ChartMetadata {
  const imageQuality = computeImageQuality(metrics);

  if (!ai) {
    // No live vision provider — image quality is real, on-chart text can't be
    // read. Be honest rather than guess.
    return {
      platform: "Unknown Trading Platform",
      platformConfidence: 0,
      marketType: null,
      instrument: null,
      symbol: null,
      instrumentConfidence: 0,
      instrumentSupported: false,
      visibleIndicators: [],
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

  const normalized = normalizeInstrument(ai.symbol ?? ai.instrument);
  const instrument = normalized?.instrument ?? ai.instrument ?? null;
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
  if (ai.platform !== "Unknown") detected.push(clamp(ai.platformConfidence));
  if (instrument) detected.push(clamp(ai.instrumentConfidence));
  if (timeframe) detected.push(clamp(ai.timeframeConfidence));
  if (ai.currentPrice) detected.push(clamp(ai.priceConfidence));
  const overallConfidence = detected.length
    ? clamp(detected.reduce((s, n) => s + n, 0) / detected.length)
    : 0;

  return {
    platform: mapPlatform(ai.platform),
    platformConfidence: ai.platform === "Unknown" ? 0 : clamp(ai.platformConfidence),
    marketType: ai.marketType,
    instrument,
    symbol,
    instrumentConfidence: instrument ? clamp(ai.instrumentConfidence) : 0,
    instrumentSupported,
    visibleIndicators: ai.visibleIndicators,
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

/**
 * Build the full Rex report from the multimodal vision analysis payload.
 *
 * The pair and timeframe are LOCKED to the authoritative `context` extracted at
 * read time (ANALYSIS LOCK) — never re-derived from free text — and the
 * CONFIDENCE RULE caps the headline confidence on weak/conflicting setups.
 */
function buildReportFromAI(
  ai: VisionChartRead,
  validation: UploadValidation,
  visionConfidence: VisionConfidence,
  economic: RexReport["economic"],
  context: AnalysisContext,
  correlation: CorrelationCheck | undefined,
  flags: ConfidenceFlags,
  correctionNote?: string
): RexReport {
  const rawOverall = clamp(
    ai.confidence.length
      ? ai.confidence.reduce((s, c) => s + c.score, 0) / ai.confidence.length
      : ai.biasConfidence
  );
  // ANALYSIS LOCK: the uploaded timeframe is authoritative; higher timeframes
  // (4H/D1) are context only and must never override it.
  const timeframe: Timeframe = context.timeframe;

  // CONFIDENCE RULE — cap below 85% when the setup is weak or conflicting.
  const overallConfidence = applyConfidencePolicy(rawOverall, flags);
  const biasConfidence = applyConfidencePolicy(clamp(ai.biasConfidence), flags);
  const reduced = overallConfidence < rawOverall || biasConfidence < clamp(ai.biasConfidence);
  const reasons = confidenceReasons(flags);
  const confidenceNote = reduced && reasons.length
    ? `Confidence was held below 85% because ${reasons.join(", ")}.`
    : undefined;

  return {
    id: `rex_${slug(context.instrument)}_${Date.now().toString(36)}`,
    // RESPONSE GUARD / ANALYSIS LOCK — always the uploaded pair.
    pair: context.instrument,
    timeframe,
    generatedAtLabel: "Just now",
    headline: ai.headline,
    analysisContext: context,
    correlation,
    confidenceNote,
    aiPowered: true,
    chartSource: ai.platform,
    currentPrice: context.currentPrice ?? ai.currentPrice,
    visionConfidence,
    trend: {
      direction: ai.trendDirection,
      strength: ai.trendStrength,
      timeframe,
      summary: ai.trendSummary,
    },
    bias: {
      bias: ai.bias,
      confidence: biasConfidence,
      suggestedDirection: ai.suggestedDirection,
      summary: correctionNote ? `${correctionNote} ${ai.biasSummary}`.trim() : ai.biasSummary,
    },
    confidence: ai.confidence.map((c) => ({
      key: slug(c.label),
      label: c.label,
      score: applyConfidencePolicy(clamp(c.score), flags),
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

/**
 * Public entrypoint. Wraps the implementation in a guard so ANY unexpected
 * failure (database down, provider crash, etc.) fails gracefully: the technical
 * detail is logged server-side and the client receives a friendly message with
 * no stack trace / DB details / provider secrets.
 */
export async function analyzeChart(
  input: AnalyzeInput
): Promise<AnalyzeResult> {
  try {
    return await analyzeChartImpl(input);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "[rex.analyze] unexpected error:",
      err instanceof Error ? `${err.name}: ${err.message}` : err
    );
    return {
      status: "unavailable",
      message:
        "Something went wrong while analyzing your chart. Please try again in a moment.",
    };
  }
}

async function analyzeChartImpl(
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

  // ── SUBSCRIPTION GATE ─────────────────────────────────────────────────────
  // The backend is the single source of truth. Enforce the Explorer daily limit
  // BEFORE any AI processing — no Vision call, no RAE, no tokens spent once the
  // allowance is exhausted. Rex Pro / unlimited plans skip this entirely.
  const gateUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      plan: true,
      dailyAnalysisCount: true,
      analysisCountDate: true,
    },
  });
  if (!gateUser) {
    return {
      status: "invalid",
      reason: "You need to be signed in to analyze charts.",
      validation: { checks: [], overall: 0, reliable: false },
    };
  }
  const gate = await evaluateAnalysisGate(gateUser);
  if (!gate.allowed) {
    return {
      status: "limit_reached",
      usage: {
        used: gate.used,
        limit: gate.limit,
        remaining: gate.remaining,
        unlimited: gate.unlimited,
      },
      resetAt: gate.resetAt,
    };
  }

  // ── ANTI-SPAM RATE LIMIT ──────────────────────────────────────────────────
  // Short-window throttle on top of the daily allowance so users (incl. Pro /
  // unlimited) cannot spam the Vision providers. Enforced server-side — the
  // client cannot bypass it. No credit is consumed when throttled.
  const ip = await clientIp();
  const perUser = gateUser.plan === "FREE" ? 6 : 20; // requests / minute
  const rlUser = rateLimit(`analyze:user:${gateUser.id}`, perUser, 60_000);
  const rlIp = rateLimit(`analyze:ip:${ip}`, 40, 60_000);
  if (!rlUser.ok || !rlIp.ok) {
    // eslint-disable-next-line no-console
    console.warn(
      `[rex.analyze] rate-limited user=${gateUser.id} plan=${gateUser.plan} ip=${ip}`
    );
    return {
      status: "rate_limited",
      message:
        "You're sending analyses too quickly. Please wait a few seconds and try again.",
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

  // STEP 2 — cheap local classification (reject obvious non-charts / photos)
  const classification = classifyChart(metrics);
  if (!classification.isChart) {
    return {
      status: "unsupported",
      classification,
      visionConfidence: computeVisionConfidence(metrics, classification),
    };
  }

  // STEPS 3-11 — real multimodal Vision (OpenAI → Gemini → Anthropic), with a
  // transparent sample fallback when no provider is configured.
  const mediaType = mediaTypeFor(metrics.format);
  const vision = await analyzeChartImage(input.base64, mediaType);

  // Providers are configured but the request failed. Per spec: show a soft
  // "temporarily unavailable" message — never claim the upload isn't a chart.
  if (vision.status === "unavailable") {
    return {
      status: "unavailable",
      message: "Vision service temporarily unavailable.",
    };
  }

  const ai = vision.status === "ok" ? vision.data : null;

  // The vision model is authoritative on whether this is a trading chart.
  if (ai && !ai.isTradingChart) {
    return {
      status: "unsupported",
      classification: {
        ...classification,
        isChart: false,
        reasons: ["The live vision model did not recognize a supported trading chart."],
      },
      visionConfidence: computeVisionConfidence(metrics, classification),
    };
  }

  if (ai) {
    // ── PAIR EXTRACTION + STRICT VALIDATION ──────────────────────────────
    const normalized = normalizeInstrument(ai.symbol ?? ai.instrument);
    const instrument = normalized?.instrument ?? null;
    const symbol = normalized?.symbol ?? (ai.symbol ? normalizePairKey(ai.symbol) : null);
    const supported = normalized?.supported ?? false;
    const instrumentConfidence = clamp(ai.instrumentConfidence);

    const extraction = assessPairExtraction({
      instrument,
      symbol,
      supported,
      instrumentConfidence,
    });
    // Never guess / substitute / default: stop when the pair itself couldn't be
    // read confidently. A recognized-but-unsupported market (e.g. an index) is a
    // separate case and still flows through to existing metadata handling.
    if (extraction.reason === "no-instrument" || extraction.reason === "low-confidence") {
      return {
        status: "pair_not_detected",
        title: PAIR_NOT_DETECTED_TITLE,
        message: PAIR_NOT_DETECTED_MESSAGE,
      };
    }

    const lockedSymbol = symbol as string;
    const lockedInstrument = instrument as string;

    // ── ANALYSIS LOCK — authoritative context (uploaded pair + timeframe) ──
    // The timeframe is never hallucinated: when the model can't read it we keep
    // a neutral internal default for ordering but mark it unknown so the UI and
    // history show it as such (spec: don't invent a timeframe).
    const timeframeKnown = ai.timeframe !== "Unknown";
    const timeframe: Timeframe = (timeframeKnown ? ai.timeframe : "H1") as Timeframe;
    const context: AnalysisContext = {
      symbol: lockedSymbol,
      instrument: lockedInstrument,
      timeframe,
      timeframeLabel: displayTimeframe(ai.timeframe),
      timeframeKnown,
      platform: mapPlatform(ai.platform),
      currentPrice: ai.currentPrice,
    };

    // ── RESPONSE GUARD — the verdict must be for the uploaded pair ─────────
    const verdictText = (a: VisionChartRead) =>
      `${a.headline} ${a.biasSummary} ${a.trendSummary}`;
    let activeAi = ai;
    let guard = guardPrimaryPair(verdictText(activeAi), lockedSymbol);
    if (guard.violated) {
      // Reject and regenerate once with the same image.
      const retry = await analyzeChartImage(input.base64, mediaType);
      if (retry.status === "ok" && retry.data.isTradingChart) {
        const retryNorm = normalizeInstrument(retry.data.symbol ?? retry.data.instrument);
        const g2 = guardPrimaryPair(verdictText(retry.data), lockedSymbol);
        if (!g2.violated && retryNorm?.symbol === lockedSymbol) {
          activeAi = retry.data;
          guard = g2;
        }
      }
    }
    // If the drift persists, hard-correct so the final verdict is unambiguously
    // for the uploaded pair.
    const correctionNote = guard.violated
      ? `This verdict is for the uploaded pair ${lockedInstrument}.`
      : undefined;

    // ── CORRELATION GUARD — explain any correlated-pair divergence ─────────
    const correlation: CorrelationCheck = detectDivergence(
      { symbol: lockedSymbol, bias: activeAi.bias },
      activeAi.marketContext.map((c) => ({
        pair: c.pair,
        bias: c.bias,
        note: c.note ?? undefined,
      }))
    );

    const economic = await getEconomicContext(lockedInstrument);

    // ── CONFIDENCE RULE — reduce on weak / conflicting setups ──────────────
    const flags: ConfidenceFlags = {
      lowExtraction: instrumentConfidence < 70,
      mixedStructure:
        activeAi.bias === "Neutral" ||
        activeAi.suggestedDirection === "Wait" ||
        activeAi.suggestedDirection === "Wait For Confirmation" ||
        Math.abs(clamp(activeAi.bullishProbability) - clamp(activeAi.bearishProbability)) < 15,
      conflictingCorrelation: correlation.hasDivergence,
      highNews: economic.some((e) => e.impact === "High"),
    };

    const visionConfidence = computeVisionConfidence(metrics, classification, {
      pairConfidence: instrumentConfidence,
      timeframeConfidence: clamp(activeAi.timeframeConfidence),
      source: activeAi.platform,
    });

    // Analysis succeeded → consume one credit (after AI, never before).
    const usage = await consumeAnalysis(gateUser.id);

    const report = buildReportFromAI(
      activeAi,
      validation,
      visionConfidence,
      economic,
      context,
      correlation.correlated.length ? correlation : undefined,
      flags,
      correctionNote
    );

    // Additive usage telemetry + Analysis History record (never gates analysis).
    const thumbnail = await makeThumbnailDataUrl(buffer);
    await recordAnalysisEvent({
      userId: gateUser.id,
      pair: context.symbol,
      timeframe: context.timeframeKnown ? context.timeframe : null,
      confidence: report.overallConfidence,
      provider: vision.status === "ok" ? vision.provider : null,
      direction: report.bias.bias,
      headline: report.headline,
      summary: report.bias.summary,
      imageUrl: thumbnail,
    });
    await notifyAnalysisSaved(gateUser.id, context.instrument);
    return {
      status: "ok",
      report,
      metadata: buildMetadata(activeAi, metrics),
      usage,
    };
  }

  // Fallback: transparent sample analysis (no vision provider configured).
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
  report.notice = isVisionConfigured()
    ? "Rex's live vision model was unavailable for this upload, so this is a representative sample analysis — not a reading of your specific chart. Please try again."
    : "Rex's live vision model isn't connected in this environment, so this is a representative sample analysis — not a reading of your specific chart. Set OPENAI_API_KEY (or GEMINI_API_KEY / ANTHROPIC_API_KEY) to enable live analysis of your uploads.";
  // Still lock the (sample) pair/timeframe so the validation banner renders.
  const fbNorm = normalizeInstrument(report.pair);
  report.analysisContext = {
    symbol: fbNorm?.symbol ?? normalizePairKey(report.pair) ?? report.pair,
    instrument: fbNorm?.instrument ?? report.pair,
    timeframe: report.timeframe,
    timeframeLabel: displayTimeframe(report.timeframe),
    timeframeKnown: true, // sample scenario carries a concrete timeframe
    platform: "Unknown Trading Platform",
    currentPrice: report.currentPrice,
  };
  // Analysis succeeded (sample fallback) → consume one credit.
  const usage = await consumeAnalysis(gateUser.id);
  const thumbnail = await makeThumbnailDataUrl(buffer);
  await recordAnalysisEvent({
    userId: gateUser.id,
    pair: report.analysisContext?.symbol ?? report.pair,
    timeframe: report.analysisContext?.timeframe ?? report.timeframe,
    confidence: report.overallConfidence ?? report.visionConfidence?.overall ?? null,
    provider: null,
    direction: report.bias.bias,
    headline: report.headline,
    summary: report.bias.summary,
    imageUrl: thumbnail,
  });
  await notifyAnalysisSaved(gateUser.id, report.analysisContext?.instrument ?? report.pair);
  return { status: "ok", report, metadata: buildMetadata(null, metrics), usage };
}
