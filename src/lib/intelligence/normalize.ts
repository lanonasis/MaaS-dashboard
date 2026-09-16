/* Pure (synchronous) helpers for Memory Intelligence data shaping.

These functions are 100% synchronous — no side effects, no React — and are
imported by both the remaining useMemoryIntelligence.tsx logic and unit tests.
*/

import type {
  HealthCheckResult,
  InsightResult,
  DuplicatePair,
  PatternAnalysisRendered,
  PatternAnalysisWire,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Type coercion & tag helpers                                         */
/* ------------------------------------------------------------------ */

export const getMemoryType = (
  entry: Record<string, unknown>,
): string =>
  (entry.type as string) ??
  ((entry as { memory_type?: string | null }).memory_type ?? "context");

export const normalizeTags = (tags: unknown[]): string[] => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

export const asArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export const asRecord = (value: unknown): Record<string, number> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {};

/* ------------------------------------------------------------------ */
/*  SDK result mappers — turn API shapes into UI-facing types           */
/* ------------------------------------------------------------------ */

export const mapHealthResult = (
  health: Record<string, unknown>,
): HealthCheckResult => {
  const healthAny = health as {
    health_score?: number | { overall?: number };
    metrics?: {
      total_memories?: number;
      embedding_coverage_percentage?: number;
      tagging_percentage?: number;
      memories_by_type?: Record<string, number>;
      memories_with_tags?: number;
    };
    statistics?: {
      total_memories?: number;
      memories_with_tags?: number;
      memory_types?: number;
      recent_memories_30d?: number;
    };
    recommendations?: string[];
  };

  const metrics = healthAny.metrics;
  const statistics = healthAny.statistics;

  const embeddingCoverage = Math.round(
    metrics?.embedding_coverage_percentage ?? 0,
  );
  const taggingConsistency = Math.round(
    metrics?.tagging_percentage ??
      (statistics?.total_memories
        ? (statistics.memories_with_tags ?? 0) /
          statistics.total_memories *
          100
        : 0),
  );
  const typeCount =
    metrics?.memories_by_type
      ? Object.keys(metrics.memories_by_type).length
      : statistics?.memory_types ?? 0;
  const typeBalance = Math.round(Math.min((typeCount / 4) * 100, 100));
  const freshness =
    statistics?.total_memories && statistics.recent_memories_30d
      ? Math.round(
          Math.min(
            (statistics.recent_memories_30d / statistics.total_memories) * 100,
            100,
          ),
        )
      : 0;
  const healthScore =
    typeof healthAny.health_score === "number"
      ? healthAny.health_score
      : (healthAny.health_score as { overall?: number })?.overall;
  const overallScore = Math.round(healthScore ?? 0);

  return {
    overall_score: overallScore,
    metrics: {
      embedding_coverage: embeddingCoverage,
      tagging_consistency: taggingConsistency,
      type_balance: typeBalance,
      freshness,
    },
    recommendations: healthAny.recommendations ?? [],
    status:
      overallScore >= 70
        ? "healthy"
        : overallScore >= 40
          ? "needs_attention"
          : "critical",
  };
};

export const mapInsights = (
  result: Record<string, unknown> | null,
): InsightResult[] => {
  if (!result?.insights) return [];
  return (result.insights as Array<Record<string, unknown>>).map(
    (insight) => ({
      category: insight.category as InsightResult["category"],
      title: insight.title as string,
      description: insight.description as string,
      confidence: insight.confidence as number,
      supporting_memories: insight.supporting_memories as string[],
    }),
  );
};

export const mapDuplicates = (
  result: Record<string, unknown> | null,
): DuplicatePair[] => {
  if (!result) return [];

  if (Array.isArray(result.duplicate_pairs)) {
    return (result.duplicate_pairs as DuplicatePair[]).map((pair) => ({
      memory_1: pair.memory_1,
      memory_2: pair.memory_2,
      similarity_score: pair.similarity_score,
      recommendation: pair.recommendation ?? "review_manually",
    }));
  }

  if (Array.isArray(result.duplicate_groups)) {
    return (result.duplicate_groups as Array<Record<string, unknown>>).flatMap(
      (group) =>
        (group.duplicates as Array<Record<string, unknown>>).map((dup) => ({
          memory_1: {
            id: group.primary_id as string,
            title: group.primary_title as string,
            created_at: (dup.created_at as string) ?? "",
          },
          memory_2: {
            id: dup.id as string,
            title: dup.title as string,
            created_at: (dup.created_at as string) ?? "",
          },
          similarity_score:
            ((group.similarity_score as number) ??
              (dup.similarity as number)) ??
            0,
          recommendation: "review_manually",
        })),
    );
  }

  return [];
};

/* ------------------------------------------------------------------ */
/*  Wire-to-UI normalizer                                              */
/* ------------------------------------------------------------------ */

/**
 * Reconcile the Edge Function payload with the `PatternAnalysis` shape the UI renders.
 *
 * Maps `top_tags` -> `most_common_tags` and guarantees every array/record/nested
 * field is present, so components can read `.length` and `.trend` without
 * optional chaining at each of the ~10 call sites.
 */
export const normalizePatternAnalysis = (
  raw: PatternAnalysisWire | null | undefined,
): PatternAnalysisRendered | null => {
  if (!raw || typeof raw !== "object") return null;

  const velocity =
    (raw.creation_velocity as Record<string, unknown>) ?? undefined;
  const trend = (velocity?.trend as string | undefined) ?? undefined;

  return {
    ...raw,
    total_memories:
      typeof raw.total_memories === "number" ? raw.total_memories : 0,
    average_content_length:
      typeof raw.average_content_length === "number"
        ? raw.average_content_length
        : 0,
    memories_by_type: asRecord(raw.memories_by_type),
    memories_by_day_of_week: asRecord(raw.memories_by_day_of_week),
    peak_creation_hours: asArray<number>(raw.peak_creation_hours),
    most_common_tags: asArray<{ tag: string; count: number }>(
      raw.most_common_tags ?? raw.top_tags,
    ),
    creation_velocity: {
      daily_average:
        typeof velocity?.daily_average === "number"
          ? (velocity.daily_average as number)
          : 0,
      trend:
        trend === "increasing" ||
        trend === "decreasing" ||
        trend === "stable"
          ? (trend as "increasing" | "stable" | "decreasing")
          : "stable",
    },
    insights: asArray<string>(raw.insights),
  } as PatternAnalysisRendered;
};
