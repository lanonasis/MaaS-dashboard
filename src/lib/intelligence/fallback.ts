/* Async helpers that depend on the Supabase client.

These functions are called from the React hooks as fallbacks when the
Edge Function / SDK client returns no usable data.  Pure helpers used
by this module are imported from `./normalize` and should not be
duplicated here.
*/

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { PatternAnalysis, HealthCheckResult } from "./types";
import {
  normalizeTags,
  normalizePatternAnalysis,
} from "./normalize";

type MemoryEntryRow = Database["public"]["Tables"]["memory_entries"]["Row"];

/* ------------------------------------------------------------------ */
/*  Memory entry fetcher                                               */
/* ------------------------------------------------------------------ */

export const fetchMemoryEntries = async (
  userId: string,
  timeRangeDays?: number,
): Promise<MemoryEntryRow[]> => {
  let query = supabase
    .from("memory_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (timeRangeDays) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);
    query = query.gte("created_at", startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MemoryEntryRow[];
};

/* ------------------------------------------------------------------ */
/*  Fallback analyzers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build a PatternAnalysis entirely from local Supabase data.
 * Called when the Edge Function returns null / empty.
 */
export const buildPatternAnalysis = async (
  userId: string,
  timeRangeDays: number,
): Promise<PatternAnalysis | null> => {
  try {
    const memories = await fetchMemoryEntries(userId, timeRangeDays);
    if (memories.length === 0) {
      return {
        total_memories: 0,
        memories_by_type: {},
        memories_by_day_of_week: {},
        peak_creation_hours: [],
        average_content_length: 0,
        most_common_tags: [],
        creation_velocity: { daily_average: 0, trend: "stable" },
        insights: ["Start creating memories to see pattern analysis"],
      };
    }

    const memoryByType: Record<string, number> = {};
    const memoryByDayOfWeek: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    const tagCounts: Record<string, number> = {};
    let totalContentLength = 0;

    memories.forEach((memory) => {
      const type =
        memory.type ??
        ((memory as { memory_type?: string | null }).memory_type ??
          "context");
      memoryByType[type] = (memoryByType[type] ?? 0) + 1;

      const date = new Date(memory.created_at);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      memoryByDayOfWeek[dayName] = (memoryByDayOfWeek[dayName] ?? 0) + 1;

      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;

      if (memory.content) {
        totalContentLength += memory.content.length;
      }

      const tags = normalizeTags(memory.tags ?? []);
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      });
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => Number.parseInt(hour, 10));

    const mostCommonTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailyAverage = memories.length / timeRangeDays;
    const midpoint = Math.floor(memories.length / 2);
    const recentHalf = memories.slice(0, midpoint);
    const olderHalf = memories.slice(midpoint);
    const recentRate = recentHalf.length / (timeRangeDays / 2);
    const olderRate = olderHalf.length / (timeRangeDays / 2);
    const trend: "increasing" | "stable" | "decreasing" =
      recentRate > olderRate * 1.2
        ? "increasing"
        : recentRate < olderRate * 0.8
          ? "decreasing"
          : "stable";

    const insights: string[] = [];
    if (memories.length > 50) {
      insights.push(`Strong knowledge base with ${memories.length} memories`);
    }
    if (trend === "increasing") {
      insights.push("Your memory creation is trending upward");
    }
    if (mostCommonTags.length > 5) {
      insights.push(
        `Well-organized with ${mostCommonTags.length}+ unique tags`,
      );
    }
    if (Object.keys(memoryByType).length >= 3) {
      insights.push(
        "Diverse memory types indicate comprehensive knowledge capture",
      );
    }

    return {
      total_memories: memories.length,
      memories_by_type: memoryByType,
      memories_by_day_of_week: memoryByDayOfWeek,
      peak_creation_hours: peakHours,
      average_content_length:
        memories.length > 0 ? totalContentLength / memories.length : 0,
      most_common_tags: mostCommonTags,
      creation_velocity: { daily_average: dailyAverage, trend },
      insights,
    };
  } catch (error) {
    console.error("Fallback pattern analysis error:", error);
    return null;
  }
};

/**
 * Re-export so the hook keeps calling normalizePatternAnalysis(...) by name.
 */
export { normalizePatternAnalysis };

/**
 * Map SDK MemoryHealth to the UI-facing HealthCheckResult.
 */
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

/**
 * Re-export from normalize for the hook's mapInsights + mapDuplicates calls.
 */
export { mapInsights, mapDuplicates } from "./normalize";

/**
 * Build a HealthCheckResult entirely from local Supabase data.
 */
export const buildHealthCheck = async (
  _userId: string,
): Promise<HealthCheckResult | null> => {
  try {
    const memories = await fetchMemoryEntries(_userId);
    if (memories.length === 0) {
      return {
        overall_score: 0,
        metrics: {
          embedding_coverage: 0,
          tagging_consistency: 0,
          type_balance: 0,
          freshness: 0,
        },
        recommendations: ["Start creating memories to track health metrics"],
        status: "needs_attention",
      };
    }

    const memoriesWithEmbeddings = memories.filter((memory) =>
      Boolean(memory.embedding),
    ).length;
    const embeddingCoverage =
      (memoriesWithEmbeddings / memories.length) * 100;

    const memoriesWithTags = memories.filter((memory) => {
      const tags = normalizeTags(memory.tags ?? []);
      return tags.length > 0;
    }).length;
    const taggingConsistency = (memoriesWithTags / memories.length) * 100;

    const typeSet = new Set(
      memories.map(
        (memory) =>
          memory.type ??
          (
            memory as { memory_type?: string | null }
          ).memory_type ??
          "context",
      ),
    );
    const typeCount = typeSet.size;
    const typeBalance = Math.min((typeCount / 4) * 100, 100);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMemories = memories.filter(
      (memory) => new Date(memory.created_at) > thirtyDaysAgo,
    ).length;
    const freshness = Math.min(
      (recentMemories / Math.max(memories.length * 0.1, 1)) * 100,
      100,
    );

    const overallScore = Math.round(
      embeddingCoverage * 0.3 +
        taggingConsistency * 0.3 +
        typeBalance * 0.2 +
        freshness * 0.2,
    );

    const recommendations: string[] = [];
    if (embeddingCoverage < 50) {
      recommendations.push(
        "Generate embeddings for more memories to improve search",
      );
    }
    if (taggingConsistency < 60) {
      recommendations.push("Add tags to memories for better organization");
    }
    if (typeBalance < 50) {
      recommendations.push(
        "Use diverse memory types for comprehensive knowledge capture",
      );
    }
    if (freshness < 30) {
      recommendations.push(
        "Keep your memory bank fresh with regular updates",
      );
    }

    return {
      overall_score: overallScore,
      metrics: {
        embedding_coverage: Math.round(embeddingCoverage),
        tagging_consistency: Math.round(taggingConsistency),
        type_balance: Math.round(typeBalance),
        freshness: Math.round(freshness),
      },
      recommendations,
      status:
        overallScore >= 70
          ? "healthy"
          : overallScore >= 40
            ? "needs_attention"
            : "critical",
    };
  } catch (error) {
    console.error("Fallback health check error:", error);
    return null;
  }
};
