/**
 * Mock implementation of the Rex Intelligence Engine.
 *
 * Deterministic, dependency-free stand-ins for each pipeline module. They
 * produce data in the exact shape the UI consumes so real models can replace
 * them one-by-one. No AI is connected here.
 */

import type {
  RexReport,
  UploadMeta,
  UploadValidation,
  ReliabilityCheck,
  ReliabilitySection,
  ThinkingStage,
  PlainEnglishItem,
} from "./types";
import type {
  VisionEngine,
  MarketStructureEngine,
  EconomicIntelligenceEngine,
  ProbabilityEngine,
  PlainEnglishTranslator,
  ReportGenerator,
  RexEngine,
  VisionResult,
  StructureResult,
  EconomicResult,
  ProbabilityResult,
} from "./engines";
import { SCENARIOS, CLOSING_NOTE, type Scenario } from "./scenarios";

export const THINKING_STAGES: ThinkingStage[] = [
  { id: "reading", label: "Reading chart" },
  { id: "pair", label: "Identifying currency pair" },
  { id: "timeframe", label: "Detecting timeframe" },
  { id: "trend", label: "Detecting trend" },
  { id: "sr", label: "Finding support and resistance" },
  { id: "structure", label: "Detecting market structure" },
  { id: "patterns", label: "Looking for technical patterns" },
  { id: "calendar", label: "Checking economic calendar" },
  { id: "conditions", label: "Evaluating market conditions" },
  { id: "probabilities", label: "Calculating probabilities" },
  { id: "translate", label: "Translating into plain English" },
  { id: "report", label: "Preparing Rex's report" },
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickScenario(meta: UploadMeta): Scenario {
  const seed = hashString(meta.fileName + meta.width + meta.height);
  return SCENARIOS[seed % SCENARIOS.length];
}

/* ------------------------------ Validation ------------------------------- */

export function validateUpload(meta: UploadMeta): UploadValidation {
  const { width, height, sizeBytes } = meta;
  const megapixels = (width * height) / 1_000_000;
  const aspect = width && height ? width / height : 0;
  const idealAspect = aspect >= 1.2 && aspect <= 2.4; // typical chart screenshot

  const resolutionScore = clamp((megapixels / 1.6) * 100); // ~1.6MP = full marks
  const aspectScore = idealAspect ? 96 : clamp(60 - Math.abs(1.7 - aspect) * 30);
  const sizeScore = clamp((sizeBytes / (350 * 1024)) * 100); // ~350KB = full marks
  const chartVisibility = clamp((resolutionScore + aspectScore) / 2);
  const imageQuality = clamp(resolutionScore * 0.6 + sizeScore * 0.4);

  const checks: ReliabilityCheck[] = [
    { key: "resolution", label: "Resolution", score: resolutionScore, ok: resolutionScore >= 60 },
    { key: "aspect", label: "Aspect ratio", score: aspectScore, ok: aspectScore >= 60 },
    { key: "visibility", label: "Chart visibility", score: chartVisibility, ok: chartVisibility >= 60 },
    { key: "image", label: "Image quality", score: imageQuality, ok: imageQuality >= 60 },
  ];

  const overall = clamp(
    checks.reduce((sum, c) => sum + c.score, 0) / checks.length
  );
  const reliable = overall >= 65 && checks.every((c) => c.ok);

  return {
    checks,
    overall,
    reliable,
    message: reliable
      ? undefined
      : "Analysis reliability may be reduced because important chart details are difficult to identify. For the most accurate report, upload a clearer, higher-resolution screenshot.",
  };
}

function buildReliability(
  validation: UploadValidation,
  scenario: Scenario
): ReliabilitySection {
  const trendClarity =
    scenario.trend.strength === "Strong"
      ? 92
      : scenario.trend.strength === "Moderate"
        ? 80
        : 62;
  const image = validation.checks.find((c) => c.key === "image")?.score ?? 80;
  const resolution =
    validation.checks.find((c) => c.key === "resolution")?.score ?? 80;
  const visibility =
    validation.checks.find((c) => c.key === "visibility")?.score ?? 80;

  const metrics = [
    { key: "chart", label: "Chart Quality", score: clamp((image + visibility) / 2) },
    { key: "trend", label: "Trend Clarity", score: trendClarity },
    { key: "indicators", label: "Indicator Visibility", score: clamp(visibility - 4) },
    { key: "timeframe", label: "Timeframe Visibility", score: clamp(resolution - 2) },
    { key: "image", label: "Image Quality", score: image },
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

/* -------------------------------- Engines -------------------------------- */

class MockVisionEngine implements VisionEngine {
  readonly name = "Rex Vision Engine (mock)";
  constructor(private scenario: Scenario) {}
  async inspect(meta: UploadMeta): Promise<VisionResult> {
    return {
      pair: this.scenario.pair,
      timeframe: this.scenario.timeframe,
      validation: validateUpload(meta),
      rawObservations: this.scenario.evidence.map((e) => e.label),
    };
  }
}

class MockMarketStructureEngine implements MarketStructureEngine {
  readonly name = "Rex Market Structure Engine (mock)";
  constructor(private scenario: Scenario) {}
  async analyze(_vision: VisionResult): Promise<StructureResult> {
    void _vision;
    return {
      trend: this.scenario.trend,
      priceLevels: this.scenario.priceLevels,
      evidence: this.scenario.evidence,
    };
  }
}

class MockEconomicIntelligenceEngine implements EconomicIntelligenceEngine {
  readonly name = "Rex Economic Intelligence Engine (mock)";
  constructor(private scenario: Scenario) {}
  async context(_pair: string): Promise<EconomicResult> {
    void _pair;
    return { events: this.scenario.economic };
  }
}

class MockProbabilityEngine implements ProbabilityEngine {
  readonly name = "Rex Probability Engine (mock)";
  constructor(private scenario: Scenario) {}
  async evaluate(
    _vision: VisionResult,
    _structure: StructureResult,
    _economic: EconomicResult
  ): Promise<ProbabilityResult> {
    void _vision;
    void _structure;
    void _economic;
    return {
      bias: this.scenario.bias,
      confidence: this.scenario.confidence,
      overallConfidence: this.scenario.overallConfidence,
    };
  }
}

class MockPlainEnglishTranslator implements PlainEnglishTranslator {
  readonly name = "Rex Plain English Translator (mock)";
  constructor(private scenario: Scenario) {}
  translate(
    _structure: StructureResult,
    _probability: ProbabilityResult
  ): PlainEnglishItem[] {
    void _structure;
    void _probability;
    return this.scenario.plainEnglish;
  }
}

class MockReportGenerator implements ReportGenerator {
  readonly name = "Rex Report Generator (mock)";
  constructor(private scenario: Scenario) {}
  generate(input: {
    vision: VisionResult;
    structure: StructureResult;
    economic: EconomicResult;
    probability: ProbabilityResult;
    plainEnglish: PlainEnglishItem[];
  }): RexReport {
    const { vision, structure, economic, probability, plainEnglish } = input;
    return {
      id: `rex_${hashString(vision.pair + Date.now()).toString(36)}`,
      pair: vision.pair,
      timeframe: vision.timeframe,
      generatedAtLabel: "Just now",
      headline: this.scenario.headline,
      aiPowered: false,
      chartSource: "Unknown",
      currentPrice: null,
      visionConfidence: {
        metrics: [
          { key: "recognition", label: "Image Recognition", score: 88 },
          { key: "classification", label: "Chart Classification", score: 90 },
          { key: "pair", label: "Currency Pair Detection", score: 84 },
          { key: "timeframe", label: "Timeframe Detection", score: 82 },
        ],
        overall: 86,
        chartSource: "Unknown",
        reduced: false,
      },
      trend: structure.trend,
      bias: probability.bias,
      confidence: probability.confidence,
      overallConfidence: probability.overallConfidence,
      economic: economic.events,
      priceLevels: structure.priceLevels,
      evidence: structure.evidence,
      plainEnglish,
      insight: this.scenario.insight,
      reliability: buildReliability(vision.validation, this.scenario),
      whatCouldChange: this.scenario.whatCouldChange,
      closingNote: CLOSING_NOTE,
    };
  }
}

/* ------------------------------- Pipeline -------------------------------- */

class MockRexEngine implements RexEngine {
  readonly version = "rex-mock-1.0";

  validateUpload(meta: UploadMeta): UploadValidation {
    return validateUpload(meta);
  }

  async analyze(meta: UploadMeta): Promise<RexReport> {
    const scenario = pickScenario(meta);

    const vision = new MockVisionEngine(scenario);
    const structureEngine = new MockMarketStructureEngine(scenario);
    const economicEngine = new MockEconomicIntelligenceEngine(scenario);
    const probabilityEngine = new MockProbabilityEngine(scenario);
    const translator = new MockPlainEnglishTranslator(scenario);
    const generator = new MockReportGenerator(scenario);

    const visionResult = await vision.inspect(meta);
    const structure = await structureEngine.analyze(visionResult);
    const economic = await economicEngine.context(visionResult.pair);
    const probability = await probabilityEngine.evaluate(
      visionResult,
      structure,
      economic
    );
    const plainEnglish = translator.translate(structure, probability);

    return generator.generate({
      vision: visionResult,
      structure,
      economic,
      probability,
      plainEnglish,
    });
  }
}

/** The active Rex engine. Swap this for a real implementation later. */
export const rex: RexEngine = new MockRexEngine();
