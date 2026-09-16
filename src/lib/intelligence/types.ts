/* Pure type definitions for Memory Intelligence helpers.

All public interfaces live here so normalize.ts and fallback.ts can import
them without pulling in the React hook or SDK dependency.
*/

/* Render-facing shapes — match the public API contract */

export interface HealthCheckResult {
  overall_score: number;
  metrics: {
    embedding_coverage: number;
    tagging_consistency: number;
    type_balance: number;
    freshness: number;
  };
  recommendations: string[];
  status: "healthy" | "needs_attention" | "critical";
}

export interface InsightResult {
  category: "pattern" | "learning" | "opportunity" | "risk" | "action_item";
  title: string;
  description: string;
  confidence: number;
  supporting_memories: string[];
}

export interface DuplicatePair {
  memory_1: { id: string; title: string; created_at: string };
  memory_2: { id: string; title: string; created_at: string };
  similarity_score: number;
  recommendation: "keep_newer" | "keep_older" | "merge" | "review_manually";
}

/**
 * UI-facing pattern analysis shape.
 *
 * Intentionally NOT `extends SdkPatternAnalysis`. The published SDK type
 * describes the Edge Function's wire format (`top_tags`, plus
 * `time_range_days` / `most_accessed` / `generated_at`), whereas the UI
 * reads `most_common_tags` and `creation_velocity`. Inheriting the wire
 * type made the compiler assert fields the server never sends, which is how
 * `most_common_tags.length` shipped and threw.
 */
export interface PatternAnalysisRendered {
  total_memories: number;
  memories_by_type: Record<string, number>;
  memories_by_day_of_week: Record<string, number>;
  peak_creation_hours: number[];
  average_content_length: number;
  most_common_tags: Array<{ tag: string; count: number }>;
  creation_velocity: {
    daily_average: number;
    trend: "increasing" | "stable" | "decreasing";
  };
  insights: string[];
}

/**
 * Wire shape returned by the `intelligence-analyze-patterns` Edge Function.
 *
 * This deliberately does NOT reuse `PatternAnalysisRendered`: the Edge
 * Function emits `top_tags`, while the SDK type (and every consumer in this
 * app) expects `most_common_tags`. Declaring the response as
 * `PatternAnalysisRendered` is what let a payload missing
 * `most_common_tags` reach the render and throw.
 */
export type PatternAnalysisWire = Partial<
  Omit<PatternAnalysisRendered, "most_common_tags">
> & {
  top_tags?: Array<{ tag: string; count: number }>;
  most_common_tags?: Array<{ tag: string; count: number }>;
};

/**
 * Full PatternAnalysis used by the hook and components.
 * Extends the wire union so callers get the UI-facing guarantee while the
 * normalizer can still widen during reconciliation.
 */
export interface PatternAnalysis extends PatternAnalysisRendered {
  top_tags?: Array<{ tag: string; count: number }>;
}
