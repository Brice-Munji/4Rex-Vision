/**
 * Rex Intelligence Engine — module interfaces.
 *
 * The pipeline is composed of six independently replaceable engines. Today they
 * are backed by deterministic mock implementations; tomorrow each can be swapped
 * for a real model (vision LLM, structure detector, economic feed, probability
 * model, translator, generator) without touching the presentation layer.
 *
 *   Vision → Market Structure → Economic Intelligence → Probability
 *          → Plain English Translator → Report Generator
 */

import type {
  RexReport,
  UploadMeta,
  UploadValidation,
  TrendSection,
  BiasSection,
  ConfidenceMetric,
  EconomicEventItem,
  PriceLevel,
  EvidenceItem,
  PlainEnglishItem,
  Timeframe,
} from "./types";

export interface VisionResult {
  pair: string;
  timeframe: Timeframe;
  validation: UploadValidation;
  rawObservations: string[];
}

export interface StructureResult {
  trend: TrendSection;
  priceLevels: PriceLevel[];
  evidence: EvidenceItem[];
}

export interface EconomicResult {
  events: EconomicEventItem[];
}

export interface ProbabilityResult {
  bias: BiasSection;
  confidence: ConfidenceMetric[];
  overallConfidence: number;
}

/** Reads a chart image and extracts what is visible. */
export interface VisionEngine {
  readonly name: string;
  inspect(meta: UploadMeta): Promise<VisionResult>;
}

/** Derives trend, structure, price levels and evidence from vision output. */
export interface MarketStructureEngine {
  readonly name: string;
  analyze(vision: VisionResult): Promise<StructureResult>;
}

/** Provides upcoming economic context for the detected pair. */
export interface EconomicIntelligenceEngine {
  readonly name: string;
  context(pair: string): Promise<EconomicResult>;
}

/** Turns structure + economic context into probabilities and confidence. */
export interface ProbabilityEngine {
  readonly name: string;
  evaluate(
    vision: VisionResult,
    structure: StructureResult,
    economic: EconomicResult
  ): Promise<ProbabilityResult>;
}

/** Translates technical conclusions into beginner-friendly language. */
export interface PlainEnglishTranslator {
  readonly name: string;
  translate(
    structure: StructureResult,
    probability: ProbabilityResult
  ): PlainEnglishItem[];
}

/** Assembles the final structured report from every engine's output. */
export interface ReportGenerator {
  readonly name: string;
  generate(input: {
    vision: VisionResult;
    structure: StructureResult;
    economic: EconomicResult;
    probability: ProbabilityResult;
    plainEnglish: PlainEnglishItem[];
  }): RexReport;
}

/** The full pipeline surface consumed by the UI. */
export interface RexEngine {
  readonly version: string;
  validateUpload(meta: UploadMeta): UploadValidation;
  analyze(meta: UploadMeta): Promise<RexReport>;
}
