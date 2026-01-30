/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  MemoryIntelligenceProvider as SdkMemoryIntelligenceProvider,
  useMemoryIntelligence as useSdkMemoryIntelligence,
} from "@lanonasis/mem-intel-sdk/react";
import type {
  PatternAnalysis as SdkPatternAnalysis,
  DuplicatesResult,
  InsightsResult,
  MemoryHealth,
} from "@lanonasis/mem-intel-sdk";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MemoryEntryRow = Database["public"]["Tables"]["memory_entries"]["Row"];

const DEFAULT_INTEL_API_URL = "https://api.lanonasis.com/api/v1";

const API_KEY_ENV_VARS = [
  "VITE_MEM_INTEL_API_KEY",
  "VITE_MEMORY_INTEL_API_KEY",
  "VITE_MEM_INTEL_SDK_KEY",
  "VITE_MEMORY_INTELLIGENCE_API_KEY",
] as const;

const API_URL_ENV_VARS = [
  "VITE_MEM_INTEL_API_URL",
  "VITE_MEMORY_INTEL_API_URL",
  "VITE_MEM_INTEL_SDK_URL",
  "VITE_MEMORY_INTELLIGENCE_API_URL",
  "VITE_MEM_INTEL_URL",
  "VITE_MEMORY_INTEL_URL",
] as const;

const getEnvValue = (keys: readonly string[]) => {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const key of keys) {
    const value = env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const ENV_API_KEY = getEnvValue(API_KEY_ENV_VARS);
const ENV_API_URL = getEnvValue(API_URL_ENV_VARS) || DEFAULT_INTEL_API_URL;

const normalizeApiUrl = (value: string) => value.replace(/\/$/, "");

const isUsableKey = (value?: string | null) =>
  Boolean(value && value.startsWith("lano_"));

export interface PatternAnalysis extends SdkPatternAnalysis {}

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

interface MemoryIntelligenceContextValue {
  userId: string | null;
  isReady: boolean;
  isKeyLoading: boolean;
  analyzePatterns: (timeRangeDays?: number) => Promise<PatternAnalysis | null>;
  getHealthCheck: () => Promise<HealthCheckResult | null>;
  extractInsights: (topic?: string) => Promise<InsightResult[]>;
  detectDuplicates: (threshold?: number) => Promise<DuplicatePair[]>;
}

const MemoryIntelligenceContext =
  createContext<MemoryIntelligenceContextValue | null>(null);

interface MemoryIntelligenceProviderProps {
  children: ReactNode;
}

const mapHealthResult = (health: MemoryHealth): HealthCheckResult => {
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
        ? (statistics.memories_with_tags || 0) /
            statistics.total_memories *
            100
        : 0),
  );
  const typeCount =
    metrics?.memories_by_type
      ? Object.keys(metrics.memories_by_type).length
      : statistics?.memory_types || 0;
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
      : healthAny.health_score?.overall;
  const overallScore = Math.round(healthScore ?? 0);

  return {
    overall_score: overallScore,
    metrics: {
      embedding_coverage: embeddingCoverage,
      tagging_consistency: taggingConsistency,
      type_balance: typeBalance,
      freshness,
    },
    recommendations: healthAny.recommendations || [],
    status:
      overallScore >= 70
        ? "healthy"
        : overallScore >= 40
          ? "needs_attention"
          : "critical",
  };
};

const mapInsights = (result: InsightsResult | null): InsightResult[] => {
  if (!result?.insights) return [];
  return result.insights.map((insight) => ({
    category: insight.category,
    title: insight.title,
    description: insight.description,
    confidence: insight.confidence,
    supporting_memories: insight.supporting_memories,
  }));
};

const mapDuplicates = (result: DuplicatesResult | null): DuplicatePair[] => {
  if (!result) return [];
  const resultAny = result as {
    duplicate_pairs?: DuplicatePair[];
    duplicate_groups?: Array<{
      primary_id: string;
      primary_title: string;
      similarity_score?: number;
      duplicates: Array<{
        id: string;
        title: string;
        created_at?: string;
        similarity?: number;
      }>;
    }>;
  };

  if (Array.isArray(resultAny.duplicate_pairs)) {
    return resultAny.duplicate_pairs.map((pair) => ({
      memory_1: pair.memory_1,
      memory_2: pair.memory_2,
      similarity_score: pair.similarity_score,
      recommendation: pair.recommendation ?? "review_manually",
    }));
  }

  if (Array.isArray(resultAny.duplicate_groups)) {
    return resultAny.duplicate_groups.flatMap((group) =>
      group.duplicates.map((dup) => ({
        memory_1: {
          id: group.primary_id,
          title: group.primary_title,
          created_at: dup.created_at || "",
        },
        memory_2: {
          id: dup.id,
          title: dup.title,
          created_at: dup.created_at || "",
        },
        similarity_score: group.similarity_score ?? dup.similarity ?? 0,
        recommendation: "review_manually",
      })),
    );
  }

  return [];
};

const getMemoryType = (entry: MemoryEntryRow) =>
  entry.type ||
  (entry as { memory_type?: string | null }).memory_type ||
  "context";

const normalizeTags = (tags: MemoryEntryRow["tags"]) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const fetchMemoryEntries = async (userId: string, timeRangeDays?: number) => {
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
  return (data || []) as MemoryEntryRow[];
};

const buildPatternAnalysis = async (
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
      const type = getMemoryType(memory);
      memoryByType[type] = (memoryByType[type] || 0) + 1;

      const date = new Date(memory.created_at);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      memoryByDayOfWeek[dayName] = (memoryByDayOfWeek[dayName] || 0) + 1;

      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      if (memory.content) {
        totalContentLength += memory.content.length;
      }

      const tags = normalizeTags(memory.tags);
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
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

const buildHealthCheck = async (
  userId: string,
): Promise<HealthCheckResult | null> => {
  try {
    const memories = await fetchMemoryEntries(userId);
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
    const embeddingCoverage = (memoriesWithEmbeddings / memories.length) * 100;

    const memoriesWithTags = memories.filter(
      (memory) => normalizeTags(memory.tags).length > 0,
    ).length;
    const taggingConsistency = (memoriesWithTags / memories.length) * 100;

    const typeCount = new Set(memories.map((memory) => getMemoryType(memory)))
      .size;
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
      recommendations.push("Keep your memory bank fresh with regular updates");
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

interface MemoryIntelligenceProviderInnerProps {
  children: ReactNode;
  userId: string | null;
  canAuth: boolean;
  isKeyLoading: boolean;
}

const getHealthTotalMemories = (health: MemoryHealth | null) => {
  if (!health) return null;
  const healthAny = health as {
    metrics?: { total_memories?: number };
    statistics?: { total_memories?: number };
  };
  return (
    healthAny.metrics?.total_memories ??
    healthAny.statistics?.total_memories ??
    null
  );
};

function MemoryIntelligenceProviderInner({
  children,
  userId,
  canAuth,
  isKeyLoading,
}: MemoryIntelligenceProviderInnerProps) {
  const client = useSdkMemoryIntelligence();
  const isReady = Boolean(userId && canAuth);

  const analyzePatterns = useCallback(
    async (timeRangeDays = 30): Promise<PatternAnalysis | null> => {
      if (!userId || !canAuth) return null;

      let apiResult: PatternAnalysis | null = null;
      try {
        const response = await client.analyzePatterns({
          userId,
          timeRangeDays,
          responseFormat: "json",
        });
        apiResult = response.data ?? null;
      } catch (error) {
        console.error("Memory intelligence pattern analysis error:", error);
      }

      if (apiResult && apiResult.total_memories > 0) {
        return apiResult;
      }

      const fallback = await buildPatternAnalysis(userId, timeRangeDays);
      return fallback ?? apiResult;
    },
    [client, userId, canAuth],
  );

  const getHealthCheck =
    useCallback(async (): Promise<HealthCheckResult | null> => {
      if (!userId || !canAuth) return null;

      let apiResult: MemoryHealth | null = null;
      try {
        const response = await client.healthCheck({
          userId,
          responseFormat: "json",
        });
        apiResult = response.data ?? null;
      } catch (error) {
        console.error("Memory intelligence health check error:", error);
      }

      const totalMemories = getHealthTotalMemories(apiResult);
      if (apiResult && totalMemories && totalMemories > 0) {
        return mapHealthResult(apiResult);
      }

      const fallback = await buildHealthCheck(userId);
      return fallback ?? (apiResult ? mapHealthResult(apiResult) : null);
    }, [client, userId, canAuth]);

  const extractInsights = useCallback(
    async (topic?: string): Promise<InsightResult[]> => {
      if (!userId || !canAuth) return [];

      try {
        const response = await client.extractInsights({
          userId,
          topic,
          responseFormat: "json",
        });
        return mapInsights(response.data ?? null);
      } catch (error) {
        console.error("Memory intelligence insight extraction error:", error);
        return [];
      }
    },
    [client, userId, canAuth],
  );

  const detectDuplicates = useCallback(
    async (threshold = 0.9): Promise<DuplicatePair[]> => {
      if (!userId || !canAuth) return [];

      try {
        const response = await client.detectDuplicates({
          userId,
          similarityThreshold: threshold,
          maxPairs: 10,
          responseFormat: "json",
        });
        return mapDuplicates(response.data ?? null);
      } catch (error) {
        console.error("Memory intelligence duplicate detection error:", error);
        return [];
      }
    },
    [client, userId, canAuth],
  );

  const value = useMemo(
    () => ({
      userId,
      isReady,
      isKeyLoading,
      analyzePatterns,
      getHealthCheck,
      extractInsights,
      detectDuplicates,
    }),
    [
      userId,
      isReady,
      isKeyLoading,
      analyzePatterns,
      getHealthCheck,
      extractInsights,
      detectDuplicates,
    ],
  );

  return (
    <MemoryIntelligenceContext.Provider value={value}>
      {children}
    </MemoryIntelligenceContext.Provider>
  );
}

export function MemoryIntelligenceProvider({
  children,
}: MemoryIntelligenceProviderProps) {
  const { user, session, isLoading: isAuthLoading } = useSupabaseAuth();
  const userId = user?.id || null;
  const authToken = session?.access_token || null;
  const apiKey = isUsableKey(ENV_API_KEY) ? ENV_API_KEY : null;
  const apiUrl = useMemo(() => normalizeApiUrl(ENV_API_URL), []);
  const canAuth = Boolean(authToken || apiKey);
  const sdkConfig = useMemo(
    () => ({
      apiUrl,
      apiKey: authToken ? undefined : apiKey ?? undefined,
      authToken: authToken ?? undefined,
      authType: authToken ? "bearer" : apiKey ? "apiKey" : "bearer",
      allowMissingAuth: true,
      responseFormat: "json",
    }),
    [apiUrl, authToken, apiKey],
  );

  return (
    <SdkMemoryIntelligenceProvider config={sdkConfig}>
      <MemoryIntelligenceProviderInner
        userId={userId}
        canAuth={canAuth}
        isKeyLoading={isAuthLoading}
      >
        {children}
      </MemoryIntelligenceProviderInner>
    </SdkMemoryIntelligenceProvider>
  );
}

export function useMemoryIntelligence() {
  const context = useContext(MemoryIntelligenceContext);
  if (!context) {
    throw new Error(
      "useMemoryIntelligence must be used within MemoryIntelligenceProvider",
    );
  }
  return context;
}

export function usePatternAnalysis(timeRangeDays = 30) {
  const { userId, isReady, isKeyLoading, analyzePatterns } =
    useMemoryIntelligence();
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzePatterns(timeRangeDays);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, analyzePatterns, timeRangeDays]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, timeRangeDays, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useHealthCheck() {
  const { userId, isReady, isKeyLoading, getHealthCheck } =
    useMemoryIntelligence();
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHealthCheck();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, getHealthCheck]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useInsightExtraction(topic?: string) {
  const { userId, isReady, isKeyLoading, extractInsights } =
    useMemoryIntelligence();
  const [data, setData] = useState<InsightResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await extractInsights(topic);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, extractInsights, topic]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, topic, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useDuplicateDetection(threshold = 0.9) {
  const { userId, isReady, isKeyLoading, detectDuplicates } =
    useMemoryIntelligence();
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await detectDuplicates(threshold);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, detectDuplicates, threshold]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, threshold, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
