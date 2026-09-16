/**
 * Unit tests for normalize.ts pure helpers.

These functions were extracted from useMemoryIntelligence.tsx and are now
100% synchronous — no React, no SDK, no Supabase — so they are trivially
testable from a plain node context.
*/

import { describe, it, expect } from "vitest";
import {
  normalizePatternAnalysis,
  mapHealthResult,
  mapInsights,
  mapDuplicates,
  getMemoryType,
  normalizeTags,
  asArray,
  asRecord,
} from "@/lib/intelligence/normalize";

/* ==================================================================== */
/*  getMemoryType                                                         */
/* ==================================================================== */

describe("getMemoryType", () => {
  it("returns entry.type when present", () => {
    expect(getMemoryType({ type: "project" })).toBe("project");
  });

  it("falls back to memory_type when type is missing", () => {
    expect(getMemoryType({ memory_type: "note" })).toBe("note");
  });

  it("falls back to 'context' when neither is present", () => {
    expect(getMemoryType({})).toBe("context");
  });

  it("prefers type over memory_type when both are present", () => {
    expect(getMemoryType({ type: "context", memory_type: "note" })).toBe(
      "context",
    );
  });

  it("handles null memory_type", () => {
    expect(getMemoryType({ memory_type: null })).toBe("context");
  });
});

/* ==================================================================== */
/*  normalizeTags                                                         */
/* ==================================================================== */

describe("normalizeTags", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizeTags("not-array" as unknown as unknown[])).toEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(normalizeTags(null as unknown as string[])).toEqual([]);
  });

  it("filters out non-string items", () => {
    expect(normalizeTags(["a", 42, null, "b"] as unknown as string[])).toEqual([
      "a",
      "b",
    ]);
  });

  it("trims whitespace", () => {
    expect(normalizeTags([" hello ", " world", "foo"])).toEqual([
      "hello",
      "world",
      "foo",
    ]);
  });

  it("filters out empty strings after trim", () => {
    expect(normalizeTags(["a", "   ", "b", ""])).toEqual(["a", "b"]);
  });
});

/* ==================================================================== */
/*  asArray / asRecord                                                    */
/* ==================================================================== */

describe("asArray", () => {
  it("returns the value when it is an array", () => {
    expect(asArray<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("returns empty array for non-array input", () => {
    expect(asArray<number>(42)).toEqual([]);
    expect(asArray<string>(null as unknown as string[])).toEqual([]);
  });
});

describe("asRecord", () => {
  it("returns the value when it is a plain object (not array)", () => {
    expect(asRecord({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("returns empty object for array", () => {
    expect(asRecord([1, 2, 3])).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(asRecord(null)).toEqual({});
    expect(asRecord(42)).toEqual({});
  });
});

/* ==================================================================== */
/*  normalizePatternAnalysis — the big one: wire-to-UI reconciliation     */
/* ==================================================================== */

describe("normalizePatternAnalysis", () => {
  it("returns null for null input", () => {
    expect(normalizePatternAnalysis(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizePatternAnalysis(undefined)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(normalizePatternAnalysis("string" as unknown as object)).toBeNull();
    expect(normalizePatternAnalysis(42 as unknown as object)).toBeNull();
  });

  it("passes through a fully-formed Edge Function payload", () => {
    const raw = {
      total_memories: 42,
      time_range_days: 30,
      average_content_length: 512,
      memories_by_type: { context: 30, project: 12 },
      memories_by_day_of_week: { Monday: 10, Tuesday: 32 },
      peak_creation_hours: [9, 14],
      top_tags: [{ tag: "infra", count: 12 }, { tag: "auth", count: 5 }],
      most_accessed: [],
      creation_velocity: { daily_average: 1.4, trend: "increasing" },
      generated_at: "2026-09-06T00:00:00.000Z",
    };
    const result = normalizePatternAnalysis(raw);
    expect(result).not.toBeNull();
    expect(result!.total_memories).toBe(42);
    expect(result!.most_common_tags).toEqual([
      { tag: "infra", count: 12 },
      { tag: "auth", count: 5 },
    ]);
    expect(result!.memories_by_type).toEqual({ context: 30, project: 12 });
    expect(result!.memories_by_day_of_week).toEqual({
      Monday: 10,
      Tuesday: 32,
    });
    expect(result!.peak_creation_hours).toEqual([9, 14]);
    expect(result!.creation_velocity).toEqual({
      daily_average: 1.4,
      trend: "increasing",
    });
    expect(result!.insights).toEqual([]);
  });

  it("defaults numeric fields to 0 when missing", () => {
    const result = normalizePatternAnalysis({} as unknown as object);
    expect(result).not.toBeNull();
    expect(result!.total_memories).toBe(0);
    expect(result!.average_content_length).toBe(0);
    expect(result!.creation_velocity.daily_average).toBe(0);
  });

  it("defaults array fields to [] when missing", () => {
    const result = normalizePatternAnalysis({} as unknown as object);
    expect(result!.most_common_tags).toEqual([]);
    expect(result!.insights).toEqual([]);
    expect(result!.peak_creation_hours).toEqual([]);
  });

  it("defaults record fields to {} when missing", () => {
    const result = normalizePatternAnalysis({} as unknown as object);
    expect(result!.memories_by_type).toEqual({});
    expect(result!.memories_by_day_of_week).toEqual({});
  });

  it("defaults trend to 'stable' when invalid", () => {
    const result = normalizePatternAnalysis({
      creation_velocity: { trend: "wacky" as any },
    } as unknown as object);
    expect(result!.creation_velocity.trend).toBe("stable");
  });

  it("defaults trend to 'stable' when missing", () => {
    const result = normalizePatternAnalysis({
      creation_velocity: {},
    } as unknown as object);
    expect(result!.creation_velocity.trend).toBe("stable");
  });

  it("defaults daily_average to 0 when missing", () => {
    const result = normalizePatternAnalysis({
      creation_velocity: { trend: "increasing" },
    } as unknown as object);
    expect(result!.creation_velocity.daily_average).toBe(0);
  });

  it("prefers most_common_tags over top_tags when both are present", () => {
    const result = normalizePatternAnalysis({
      top_tags: [{ tag: "a", count: 1 }],
      most_common_tags: [{ tag: "b", count: 2 }],
    } as unknown as object);
    expect(result!.most_common_tags).toEqual([{ tag: "b", count: 2 }]);
  });

  it("uses top_tags when most_common_tags is absent", () => {
    const result = normalizePatternAnalysis({
      top_tags: [{ tag: "infra", count: 12 }],
    } as unknown as object);
    expect(result!.most_common_tags).toEqual([{ tag: "infra", count: 12 }]);
  });

  it("passes through numeric coercion — coerces non-number total_memories to 0", () => {
    const result = normalizePatternAnalysis({
      total_memories: "forty-two" as unknown as number,
    } as unknown as object);
    expect(result!.total_memories).toBe(0);
  });

  it("preserves wire-only fields (top_tags, time_range_days, generated_at)", () => {
    const result = normalizePatternAnalysis({
      top_tags: [{ tag: "x", count: 1 }],
      time_range_days: 14,
      generated_at: "2026-01-01T00:00:00.000Z",
    } as unknown as object);
    expect((result as any).top_tags).toEqual([{ tag: "x", count: 1 }]);
    expect((result as any).time_range_days).toBe(14);
    expect((result as any).generated_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("preserves top_tags field when present", () => {
    const result = normalizePatternAnalysis({
      top_tags: [{ tag: "infra", count: 12 }],
    } as unknown as object);
    expect((result as any).top_tags).toEqual([{ tag: "infra", count: 12 }]);
  });
});

/* ==================================================================== */
/*  mapHealthResult — SDK MemoryHealth → UI HealthCheckResult             */
/* ==================================================================== */

describe("mapHealthResult", () => {
  it("maps full health payload", () => {
    const health = {
      health_score: 82,
      metrics: {
        embedding_coverage_percentage: 90,
        tagging_percentage: 75,
        memories_by_type: { context: 30, project: 20, note: 10 },
      },
      statistics: {
        total_memories: 60,
        memories_with_tags: 50,
        memory_types: 3,
        recent_memories_30d: 25,
      },
      recommendations: ["Add more embeddings"],
    };
    const result = mapHealthResult(health);
    expect(result.overall_score).toBe(82);
    expect(result.metrics.embedding_coverage).toBe(90);
    expect(result.metrics.tagging_consistency).toBe(75);
    expect(result.metrics.type_balance).toBe(Math.round((3 / 4) * 100));
    expect(result.metrics.freshness).toBe(
      Math.round(Math.min((25 / 60) * 100, 100)),
    );
    expect(result.status).toBe("healthy");
    expect(result.recommendations).toEqual(["Add more embeddings"]);
  });

  it("falls back to statistics for tagging when metrics.tagging_percentage is absent", () => {
    const health = {
      metrics: {
        memories_by_type: { context: 30 },
      },
      statistics: {
        total_memories: 100,
        memories_with_tags: 60,
        memory_types: 2,
        recent_memories_30d: 10,
      },
    };
    const result = mapHealthResult(health);
    expect(result.metrics.tagging_consistency).toBe(60); // 60/100 * 100
  });

  it("defaults to 0 when no metrics or statistics", () => {
    const result = mapHealthResult({});
    expect(result.metrics.embedding_coverage).toBe(0);
    expect(result.metrics.tagging_consistency).toBe(0);
    expect(result.metrics.type_balance).toBe(0);
    expect(result.metrics.freshness).toBe(0);
    expect(result.overall_score).toBe(0);
    expect(result.status).toBe("critical");
    expect(result.recommendations).toEqual([]);
  });

  it("defaults to 0 when health is null-like", () => {
    const result = mapHealthResult({ health_score: null });
    expect(result.overall_score).toBe(0);
  });

  it("handles health_score as { overall: 55 }", () => {
    const result = mapHealthResult({
      health_score: { overall: 55 },
    } as unknown as Record<string, unknown>);
    expect(result.overall_score).toBe(55);
  });

  it("classifies status correctly — healthy ≥ 70", () => {
    const result = mapHealthResult({ health_score: 70 });
    expect(result.status).toBe("healthy");
  });

  it("classifies status correctly — needs_attention ≥ 40 and < 70", () => {
    const result = mapHealthResult({ health_score: 69 });
    expect(result.status).toBe("needs_attention");
  });

  it("classifies status correctly — critical < 40", () => {
    const result = mapHealthResult({ health_score: 39 });
    expect(result.status).toBe("critical");
  });

  it("caps type_balance at 100", () => {
    const health = {
      metrics: {
        memories_by_type: { a: 1, b: 2, c: 3, d: 4, e: 5 },
      },
      statistics: { total_memories: 15, memory_types: 5 },
    };
    const result = mapHealthResult(health);
    expect(result.metrics.type_balance).toBe(100); // min(5/4*100, 100) = 100
  });

  it("caps freshness at 100", () => {
    const health = {
      statistics: {
        total_memories: 10,
        recent_memories_30d: 100,
      },
    };
    const result = mapHealthResult(health);
    expect(result.metrics.freshness).toBe(100);
  });
});

/* ==================================================================== */
/*  mapInsights — SDK InsightsResult → UI InsightResult[]                 */
/* ==================================================================== */

describe("mapInsights", () => {
  it("returns empty array for null input", () => {
    expect(mapInsights(null)).toEqual([]);
  });

  it("returns empty array when insights is missing", () => {
    expect(mapInsights({})).toEqual([]);
  });

  it("returns empty array when insights is null", () => {
    expect(mapInsights({ insights: null })).toEqual([]);
  });

  it("maps insight fields correctly", () => {
    const result = mapInsights({
      insights: [
        {
          category: "pattern",
          title: "Trend up",
          description: "Memories increasing",
          confidence: 0.85,
          supporting_memories: ["mem-1", "mem-2"],
        },
      ],
    });
    expect(result).toEqual([
      {
        category: "pattern",
        title: "Trend up",
        description: "Memories increasing",
        confidence: 0.85,
        supporting_memories: ["mem-1", "mem-2"],
      },
    ]);
  });

  it("maps multiple insights", () => {
    const result = mapInsights({
      insights: [
        {
          category: "learning",
          title: "A",
          description: "D",
          confidence: 0.5,
          supporting_memories: [],
        },
        {
          category: "risk",
          title: "B",
          description: "E",
          confidence: 0.9,
          supporting_memories: ["mem-1"],
        },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("learning");
    expect(result[1].category).toBe("risk");
  });
});

/* ==================================================================== */
/*  mapDuplicates — SDK DuplicatesResult → UI DuplicatePair[]             */
/* ==================================================================== */

describe("mapDuplicates", () => {
  it("returns empty array for null input", () => {
    expect(mapDuplicates(null)).toEqual([]);
  });

  it("maps flat duplicate_pairs", () => {
    const result = mapDuplicates({
      duplicate_pairs: [
        {
          memory_1: { id: "1", title: "First", created_at: "2024-01-01" },
          memory_2: { id: "2", title: "Second", created_at: "2024-01-02" },
          similarity_score: 0.92,
          recommendation: "merge",
        },
      ],
    });
    expect(result).toEqual([
      {
        memory_1: { id: "1", title: "First", created_at: "2024-01-01" },
        memory_2: { id: "2", title: "Second", created_at: "2024-01-02" },
        similarity_score: 0.92,
        recommendation: "merge",
      },
    ]);
  });

  it("defaults recommendation to 'review_manually' when absent", () => {
    const result = mapDuplicates({
      duplicate_pairs: [
        {
          memory_1: { id: "1", title: "First", created_at: "" },
          memory_2: { id: "2", title: "Second", created_at: "" },
          similarity_score: 0.8,
        } as any,
      ],
    });
    expect(result[0].recommendation).toBe("review_manually");
  });

  it("maps duplicate_groups to pairs", () => {
    const result = mapDuplicates({
      duplicate_groups: [
        {
          primary_id: "primary",
          primary_title: "Original",
          similarity_score: 0.95,
          duplicates: [
            { id: "dup-1", title: "Copy 1", created_at: "2024-02-01", similarity: 0.95 },
            { id: "dup-2", title: "Copy 2", created_at: "2024-02-02", similarity: 0.91 },
          ],
        },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0].memory_1.id).toBe("primary");
    expect(result[0].memory_2.id).toBe("dup-1");
    expect(result[1].memory_2.id).toBe("dup-2");
    expect(result[0].recommendation).toBe("review_manually");
  });

  it("falls back similarity_score from dup.similarity when group.similarity_score is absent", () => {
    const result = mapDuplicates({
      duplicate_groups: [
        {
          primary_id: "p",
          primary_title: "P",
          duplicates: [
            { id: "d", title: "D", similarity: 0.88 },
          ],
        } as any,
      ],
    });
    expect(result[0].similarity_score).toBe(0.88);
  });

  it("returns empty array for unknown shape", () => {
    expect(mapDuplicates({ random_field: 42 })).toEqual([]);
  });
});

/* ==================================================================== */
/*  Boundary: normalized output is always safe to read                    */
/* ==================================================================== */

describe("normalizePatternAnalysis — safety contract", () => {
  it("always returns an object with creation_velocity.trend when not null", () => {
    const result = normalizePatternAnalysis({} as unknown as object);
    expect(result).not.toBeNull();
    // This is the exact production guard — reading .length must not throw.
    expect(() => result!.creation_velocity.trend.length).not.toThrow();
    expect(() => result!.creation_velocity.daily_average).not.toThrow();
    expect(() => result!.most_common_tags.length).not.toThrow();
    expect(() => result!.insights.length).not.toThrow();
    expect(() => result!.peak_creation_hours.length).not.toThrow();
    expect(() => result!.memories_by_type.x).not.toThrow();
    expect(() => result!.memories_by_day_of_week.x).not.toThrow();
  });

  it("defaults empty-object input to sane values", () => {
    const result = normalizePatternAnalysis({} as unknown as object);
    expect(result!.total_memories).toBe(0);
    expect(result!.average_content_length).toBe(0);
    expect(result!.most_common_tags).toEqual([]);
    expect(result!.peak_creation_hours).toEqual([]);
    expect(result!.insights).toEqual([]);
    expect(result!.memories_by_type).toEqual({});
    expect(result!.memories_by_day_of_week).toEqual({});
    expect(result!.creation_velocity).toEqual({
      daily_average: 0,
      trend: "stable",
    });
  });
});
