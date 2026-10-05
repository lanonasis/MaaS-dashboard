/**
 * Unit tests for fallback.ts async helpers.
 *
 * These tests exercise the Supabase-dependent fallback analyzers that run when
 * the Edge Function / SDK client returns no usable data.  They mock the
 * Supabase client via vitest so they run 100 % locally.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMemoryEntries,
  buildPatternAnalysis,
  buildHealthCheck,
  mapHealthResult,
} from "@/lib/intelligence/fallback";
import type { Database } from "@/integrations/supabase/types";

type MemoryEntryRow = Database["public"]["Tables"]["memory_entries"]["Row"];

/* ==================================================================== */
/*  Mock Supabase client                                                  */
/* ==================================================================== */

// Every query-builder method returns the same thenable chain, so the mock does
// not encode one exact call order (it previously broke whenever a filter was
// added). Awaiting the chain resolves to `mockState.rows`; `.is()` calls are
// recorded so tests can assert which filters were applied.
const mockState = vi.hoisted(() => ({
  rows: [] as unknown[],
  isCalls: [] as unknown[][],
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    select: self,
    eq: self,
    order: self,
    gte: self,
    is: (...args: unknown[]) => {
      mockState.isCalls.push(args);
      return chain;
    },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: mockState.rows, error: null }).then(resolve, reject),
  });
  return { supabase: { from: () => chain } };
});

beforeEach(() => {
  mockState.rows = [];
  mockState.isCalls = [];
});

/* ==================================================================== */
/*  Test data helpers                                                     */
/* ==================================================================== */

const createMemory = (overrides: Partial<MemoryEntryRow> = {}): MemoryEntryRow => ({
  id: `mem-${Math.random().toString(36).slice(2, 8)}`,
  user_id: "test-user-123",
  title: "Test Memory",
  content: "This is test content for a memory entry",
  type: "context",
  tags: ["tag1", "tag2"],
  metadata: {},
  embedding: "[0.1, 0.2, 0.3]",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/* ==================================================================== */
/*  fetchMemoryEntries                                                    */
/* ==================================================================== */

describe("fetchMemoryEntries", () => {
  it("returns empty array when no memories found", async () => {
    const result = await fetchMemoryEntries("test-user-123");
    expect(result).toEqual([]);
  });

  it("excludes soft-deleted memories", async () => {
    // memory_entries is a view that exposes soft-deleted rows.
    await fetchMemoryEntries("test-user-123");
    expect(mockState.isCalls).toContainEqual(["deleted_at", null]);
  });
});

/* ==================================================================== */
/*  buildPatternAnalysis                                                  */
/* ==================================================================== */

describe("buildPatternAnalysis", () => {
  it("returns empty pattern when no memories exist", async () => {
    const result = await buildPatternAnalysis("test-user-123", 30);
    expect(result).not.toBeNull();
    expect(result!.total_memories).toBe(0);
    expect(result!.memories_by_type).toEqual({});
    expect(result!.memories_by_day_of_week).toEqual({});
    expect(result!.peak_creation_hours).toEqual([]);
    expect(result!.most_common_tags).toEqual([]);
    expect(result!.insights).toContain(
      "Start creating memories to see pattern analysis",
    );
    expect(result!.creation_velocity).toEqual({
      daily_average: 0,
      trend: "stable",
    });
  });
});

/* ==================================================================== */
/*  buildHealthCheck                                                      */
/* ==================================================================== */

describe("buildHealthCheck", () => {
  it("returns zeroed health check when no memories exist", async () => {
    const result = await buildHealthCheck("test-user-123");
    expect(result).not.toBeNull();
    expect(result!.overall_score).toBe(0);
    expect(result!.status).toBe("needs_attention");
    expect(result!.metrics.embedding_coverage).toBe(0);
    expect(result!.metrics.tagging_consistency).toBe(0);
    expect(result!.metrics.type_balance).toBe(0);
    expect(result!.metrics.freshness).toBe(0);
    expect(result!.recommendations).toContain(
      "Start creating memories to track health metrics",
    );
  });
});


/* ==================================================================== */
/*  Embedding coverage                                                    */
/* ==================================================================== */

describe("embedding coverage", () => {
  it("counts Voyage embeddings, not only the legacy OpenAI column", async () => {
    // A Voyage-embedded corpus: voyage_embedding set, legacy `embedding` null.
    // Reading only `embedding` reported 0% here.
    mockState.rows = [
      createMemory({ embedding: null, voyage_embedding: "[0.1]" } as Partial<MemoryEntryRow>),
      createMemory({ embedding: null, voyage_embedding: "[0.2]" } as Partial<MemoryEntryRow>),
    ];
    const result = await buildHealthCheck("test-user-123");
    expect(result!.metrics.embedding_coverage).toBe(100);
  });

  it("reads embedding_coverage_percentage from the server response", () => {
    // intelligence-health-check emits metrics.embedding_coverage_percentage;
    // before it did, the missing field defaulted to 0.
    const result = mapHealthResult({
      health_score: { overall: 90 },
      metrics: { embedding_coverage_percentage: 100 },
      statistics: { total_memories: 10, memories_with_tags: 9 },
    });
    expect(result.metrics.embedding_coverage).toBe(100);
  });
});
