import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  PatternAnalysis as SdkPatternAnalysis,
  DuplicatesResult,
  InsightsResult,
  MemoryHealth
} from '@lanonasis/mem-intel-sdk';
import { useSupabaseAuth } from './useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ApiKeyRow = Database['public']['Tables']['api_keys']['Row'];
type MemoryEntryRow = Database['public']['Tables']['memory_entries']['Row'];

const DEFAULT_INTEL_API_URL = 'https://api.lanonasis.com/api/v1';

const API_KEY_ENV_VARS = [
  'VITE_MEM_INTEL_API_KEY',
  'VITE_MEMORY_INTEL_API_KEY',
  'VITE_MEM_INTEL_SDK_KEY',
  'VITE_MEMORY_INTELLIGENCE_API_KEY'
] as const;

const API_URL_ENV_VARS = [
  'VITE_MEM_INTEL_API_URL',
  'VITE_MEMORY_INTEL_API_URL',
  'VITE_MEM_INTEL_SDK_URL',
  'VITE_MEMORY_INTELLIGENCE_API_URL',
  'VITE_MEM_INTEL_URL',
  'VITE_MEMORY_INTEL_URL'
] as const;

const MEM_INTEL_SERVICE_ALIASES = new Set([
  'memory-intel',
  'mem-intel',
  'memory_intel',
  'memory-intelligence',
  'memory_intelligence',
  'intelligence',
  'memory'
]);

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

const normalizeApiUrl = (value: string) => value.replace(/\/$/, '');

const isUsableKey = (value?: string | null) => Boolean(value && value.startsWith('lano_'));

const getServiceRank = (service?: string | null) => {
  if (!service) return 2;
  const normalized = service.toLowerCase().trim();
  if (!normalized) return 2;
  const tokens = normalized.split(/[\s,]+/).filter(Boolean);
  if (tokens.some((token) => MEM_INTEL_SERVICE_ALIASES.has(token))) return 0;
  if (tokens.includes('all')) return 1;
  return 3;
};

const selectApiKey = (keys: ApiKeyRow[]) => {
  const now = Date.now();
  const candidates = keys.filter((key) => {
    if (!isUsableKey(key.key)) return false;
    if (key.is_active === false) return false;
    if (key.expires_at && new Date(key.expires_at).getTime() < now) return false;
    return true;
  });

  candidates.sort((a, b) => {
    const rankDiff = getServiceRank(a.service) - getServiceRank(b.service);
    if (rankDiff !== 0) return rankDiff;
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });

  return candidates[0]?.key ?? null;
};

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
  status: 'healthy' | 'needs_attention' | 'critical';
}

export interface InsightResult {
  category: 'pattern' | 'learning' | 'opportunity' | 'risk' | 'action_item';
  title: string;
  description: string;
  confidence: number;
  supporting_memories: string[];
}

export interface DuplicatePair {
  memory_1: { id: string; title: string; created_at: string };
  memory_2: { id: string; title: string; created_at: string };
  similarity_score: number;
  recommendation: 'keep_newer' | 'keep_older' | 'merge' | 'review_manually';
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

const MemoryIntelligenceContext = createContext<MemoryIntelligenceContextValue | null>(null);

interface MemoryIntelligenceProviderProps {
  children: ReactNode;
}

const mapHealthResult = (health: MemoryHealth): HealthCheckResult => {
  const embeddingCoverage = Math.round(health.metrics.embedding_coverage_percentage || 0);
  const taggingConsistency = Math.round(health.metrics.tagging_percentage || 0);
  const typeCount = Object.keys(health.metrics.memories_by_type || {}).length;
  const typeBalance = Math.round(Math.min((typeCount / 4) * 100, 100));
  const overallScore = Math.round(health.health_score || 0);

  return {
    overall_score: overallScore,
    metrics: {
      embedding_coverage: embeddingCoverage,
      tagging_consistency: taggingConsistency,
      type_balance: typeBalance,
      freshness: 0
    },
    recommendations: health.recommendations || [],
    status: overallScore >= 70 ? 'healthy' : overallScore >= 40 ? 'needs_attention' : 'critical'
  };
};

const mapInsights = (result: InsightsResult | null): InsightResult[] => {
  if (!result?.insights) return [];
  return result.insights.map((insight) => ({
    category: insight.category,
    title: insight.title,
    description: insight.description,
    confidence: insight.confidence,
    supporting_memories: insight.supporting_memories
  }));
};

const mapDuplicates = (result: DuplicatesResult | null): DuplicatePair[] => {
  if (!result?.duplicate_pairs) return [];
  return result.duplicate_pairs.map((pair) => ({
    memory_1: pair.memory_1,
    memory_2: pair.memory_2,
    similarity_score: pair.similarity_score,
    recommendation: pair.recommendation
  }));
};

const getMemoryType = (entry: MemoryEntryRow) =>
  entry.type || (entry as { memory_type?: string | null }).memory_type || 'context';

const normalizeTags = (tags: MemoryEntryRow['tags']) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const fetchMemoryEntries = async (userId: string, timeRangeDays?: number) => {
  let query = supabase
    .from('memory_entries')
    .select('id, title, content, type, memory_type, tags, created_at, embedding')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (timeRangeDays) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MemoryEntryRow[];
};

const buildPatternAnalysis = async (userId: string, timeRangeDays: number): Promise<PatternAnalysis | null> => {
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
        creation_velocity: { daily_average: 0, trend: 'stable' },
        insights: ['Start creating memories to see pattern analysis']
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
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
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
    const trend: 'increasing' | 'stable' | 'decreasing' =
      recentRate > olderRate * 1.2 ? 'increasing' :
      recentRate < olderRate * 0.8 ? 'decreasing' : 'stable';

    const insights: string[] = [];
    if (memories.length > 50) {
      insights.push(`Strong knowledge base with ${memories.length} memories`);
    }
    if (trend === 'increasing') {
      insights.push('Your memory creation is trending upward');
    }
    if (mostCommonTags.length > 5) {
      insights.push(`Well-organized with ${mostCommonTags.length}+ unique tags`);
    }
    if (Object.keys(memoryByType).length >= 3) {
      insights.push('Diverse memory types indicate comprehensive knowledge capture');
    }

    return {
      total_memories: memories.length,
      memories_by_type: memoryByType,
      memories_by_day_of_week: memoryByDayOfWeek,
      peak_creation_hours: peakHours,
      average_content_length: memories.length > 0 ? totalContentLength / memories.length : 0,
      most_common_tags: mostCommonTags,
      creation_velocity: { daily_average: dailyAverage, trend },
      insights
    };
  } catch (error) {
    console.error('Fallback pattern analysis error:', error);
    return null;
  }
};

const buildHealthCheck = async (userId: string): Promise<HealthCheckResult | null> => {
  try {
    const memories = await fetchMemoryEntries(userId);
    if (memories.length === 0) {
      return {
        overall_score: 0,
        metrics: {
          embedding_coverage: 0,
          tagging_consistency: 0,
          type_balance: 0,
          freshness: 0
        },
        recommendations: ['Start creating memories to track health metrics'],
        status: 'needs_attention'
      };
    }

    const memoriesWithEmbeddings = memories.filter((memory) => Boolean(memory.embedding)).length;
    const embeddingCoverage = (memoriesWithEmbeddings / memories.length) * 100;

    const memoriesWithTags = memories.filter((memory) => normalizeTags(memory.tags).length > 0).length;
    const taggingConsistency = (memoriesWithTags / memories.length) * 100;

    const typeCount = new Set(memories.map((memory) => getMemoryType(memory))).size;
    const typeBalance = Math.min((typeCount / 4) * 100, 100);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMemories = memories.filter((memory) => new Date(memory.created_at) > thirtyDaysAgo).length;
    const freshness = Math.min((recentMemories / Math.max(memories.length * 0.1, 1)) * 100, 100);

    const overallScore = Math.round(
      (embeddingCoverage * 0.3) +
      (taggingConsistency * 0.3) +
      (typeBalance * 0.2) +
      (freshness * 0.2)
    );

    const recommendations: string[] = [];
    if (embeddingCoverage < 50) {
      recommendations.push('Generate embeddings for more memories to improve search');
    }
    if (taggingConsistency < 60) {
      recommendations.push('Add tags to memories for better organization');
    }
    if (typeBalance < 50) {
      recommendations.push('Use diverse memory types for comprehensive knowledge capture');
    }
    if (freshness < 30) {
      recommendations.push('Keep your memory bank fresh with regular updates');
    }

    return {
      overall_score: overallScore,
      metrics: {
        embedding_coverage: Math.round(embeddingCoverage),
        tagging_consistency: Math.round(taggingConsistency),
        type_balance: Math.round(typeBalance),
        freshness: Math.round(freshness)
      },
      recommendations,
      status: overallScore >= 70 ? 'healthy' : overallScore >= 40 ? 'needs_attention' : 'critical'
    };
  } catch (error) {
    console.error('Fallback health check error:', error);
    return null;
  }
};

export function MemoryIntelligenceProvider({ children }: MemoryIntelligenceProviderProps) {
  const { user, session, isLoading: isAuthLoading } = useSupabaseAuth();
  const userId = user?.id || null;
  const authToken = session?.access_token || null;
  const [apiKey, setApiKey] = useState<string | null>(ENV_API_KEY);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  useEffect(() => {
    if (ENV_API_KEY) {
      setApiKey(ENV_API_KEY);
      setIsLookupLoading(false);
      return;
    }

    if (!userId) {
      setApiKey(null);
      setIsLookupLoading(false);
      return;
    }

    let isMounted = true;
    setIsLookupLoading(true);

    const loadKey = async () => {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('key, service, created_at, is_active, expires_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const selectedKey = selectApiKey(data || []);
        if (isMounted) {
          setApiKey(selectedKey);
        }
      } catch (error) {
        console.warn('Memory intelligence API key lookup failed:', error);
        if (isMounted) {
          setApiKey(null);
        }
      } finally {
        if (isMounted) {
          setIsLookupLoading(false);
        }
      }
    };

    loadKey();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const apiUrl = useMemo(() => normalizeApiUrl(ENV_API_URL), []);
  const isKeyLoading = isAuthLoading || isLookupLoading;
  const canAuth = Boolean(authToken || isUsableKey(apiKey));

  const request = async <T,>(endpoint: string, payload: Record<string, unknown>) => {
    if (!userId || !canAuth) return null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (isUsableKey(apiKey)) {
      headers['X-API-Key'] = apiKey as string;
    }

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Memory intelligence request failed:', response.status, errorBody);
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Memory intelligence request error:', error);
      return null;
    }
  };

  const analyzePatterns = async (timeRangeDays = 30): Promise<PatternAnalysis | null> => {
    if (!userId) return null;

    const result = await request<PatternAnalysis>('/intelligence/analyze-patterns', {
      userId,
      timeRangeDays,
      responseFormat: 'json'
    });

    if (result && result.total_memories > 0) {
      return result;
    }

    const fallback = await buildPatternAnalysis(userId, timeRangeDays);
    return fallback ?? result;
  };

  const getHealthCheck = async (): Promise<HealthCheckResult | null> => {
    if (!userId) return null;

    const result = await request<MemoryHealth>('/intelligence/health-check', {
      userId,
      responseFormat: 'json'
    });

    if (result && result.metrics?.total_memories > 0) {
      return mapHealthResult(result);
    }

    const fallback = await buildHealthCheck(userId);
    return fallback ?? (result ? mapHealthResult(result) : null);
  };

  const extractInsights = async (topic?: string): Promise<InsightResult[]> => {
    const result = await request<InsightsResult>('/intelligence/extract-insights', {
      userId,
      topic,
      responseFormat: 'json'
    });

    return mapInsights(result);
  };

  const detectDuplicates = async (threshold = 0.9): Promise<DuplicatePair[]> => {
    const result = await request<DuplicatesResult>('/intelligence/detect-duplicates', {
      userId,
      similarityThreshold: threshold,
      maxPairs: 10,
      responseFormat: 'json'
    });

    return mapDuplicates(result);
  };

  const value = useMemo(
    () => ({
      userId,
      isReady: Boolean(userId && canAuth),
      isKeyLoading,
      analyzePatterns,
      getHealthCheck,
      extractInsights,
      detectDuplicates
    }),
    [userId, canAuth, isKeyLoading]
  );

  return (
    <MemoryIntelligenceContext.Provider value={value}>
      {children}
    </MemoryIntelligenceContext.Provider>
  );
}

export function useMemoryIntelligence() {
  const context = useContext(MemoryIntelligenceContext);
  if (!context) {
    throw new Error('useMemoryIntelligence must be used within MemoryIntelligenceProvider');
  }
  return context;
}

export function usePatternAnalysis(timeRangeDays = 30) {
  const { userId, isReady, isKeyLoading, analyzePatterns } = useMemoryIntelligence();
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzePatterns(timeRangeDays);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, timeRangeDays]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useHealthCheck() {
  const { userId, isReady, isKeyLoading, getHealthCheck } = useMemoryIntelligence();
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHealthCheck();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useInsightExtraction(topic?: string) {
  const { userId, isReady, isKeyLoading, extractInsights } = useMemoryIntelligence();
  const [data, setData] = useState<InsightResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await extractInsights(topic);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, topic]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}

export function useDuplicateDetection(threshold = 0.9) {
  const { userId, isReady, isKeyLoading, detectDuplicates } = useMemoryIntelligence();
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await detectDuplicates(threshold);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, threshold]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
