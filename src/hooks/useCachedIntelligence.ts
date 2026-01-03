/**
 * React Query cached hooks for Intelligence SDK operations
 * Wraps the Memory Intelligence SDK with React Query for caching
 * SDK works locally with cached memories AND can use online API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  useMemoryIntelligence,
  type HealthCheckResult,
  type PatternAnalysis,
  type DuplicatePair,
  type InsightResult
} from '@/hooks/useMemoryIntelligence';

// Query keys factory
export const intelligenceKeys = {
  all: ['intelligence'] as const,
  healthCheck: () => [...intelligenceKeys.all, 'health-check'] as const,
  patterns: (timeRangeDays?: number) => [...intelligenceKeys.all, 'patterns', timeRangeDays] as const,
  duplicates: (threshold?: number) => [...intelligenceKeys.all, 'duplicates', threshold] as const,
  insights: (topic?: string) => [...intelligenceKeys.all, 'insights', topic] as const,
};

// Re-export types for convenience
export type { HealthCheckResult, PatternAnalysis, DuplicatePair, InsightResult };

/**
 * Hook for fetching memory health check with caching
 * Uses SDK with local fallback processing
 */
export function useCachedHealthCheck() {
  const { user } = useSupabaseAuth();
  const { getHealthCheck, isReady, isKeyLoading } = useMemoryIntelligence();

  return useQuery({
    queryKey: intelligenceKeys.healthCheck(),
    queryFn: async () => {
      const result = await getHealthCheck();
      if (!result) {
        throw new Error('Failed to get health check');
      }
      return result;
    },
    enabled: !!user?.id && isReady && !isKeyLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes - health check data doesn't change rapidly
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once since we have local fallback
  });
}

/**
 * Hook for fetching pattern analysis with caching
 * Uses SDK with local fallback processing
 */
export function useCachedPatternAnalysis(timeRangeDays: number = 30) {
  const { user } = useSupabaseAuth();
  const { analyzePatterns, isReady, isKeyLoading } = useMemoryIntelligence();

  return useQuery({
    queryKey: intelligenceKeys.patterns(timeRangeDays),
    queryFn: async () => {
      const result = await analyzePatterns(timeRangeDays);
      if (!result) {
        throw new Error('Failed to analyze patterns');
      }
      return result;
    },
    enabled: !!user?.id && isReady && !isKeyLoading,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour - pattern analysis can be cached longer
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook for detecting duplicates with caching
 * Uses SDK with local fallback processing
 */
export function useCachedDuplicates(threshold: number = 0.9) {
  const { user } = useSupabaseAuth();
  const { detectDuplicates, isReady, isKeyLoading } = useMemoryIntelligence();

  return useQuery({
    queryKey: intelligenceKeys.duplicates(threshold),
    queryFn: async () => {
      return await detectDuplicates(threshold);
    },
    enabled: !!user?.id && isReady && !isKeyLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook for extracting insights with caching
 * Uses SDK with local fallback processing
 */
export function useCachedInsights(topic?: string) {
  const { user } = useSupabaseAuth();
  const { extractInsights, isReady, isKeyLoading } = useMemoryIntelligence();

  return useQuery({
    queryKey: intelligenceKeys.insights(topic),
    queryFn: async () => {
      return await extractInsights(topic);
    },
    enabled: !!user?.id && isReady && !isKeyLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook to invalidate all intelligence caches
 */
export function useRefreshIntelligence() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: intelligenceKeys.all });
  };
}

/**
 * Hook to prefetch intelligence data
 * Useful for preloading data before user navigates to intelligence panel
 */
export function usePrefetchIntelligence() {
  const queryClient = useQueryClient();
  const { getHealthCheck, analyzePatterns, isReady } = useMemoryIntelligence();

  return async () => {
    if (!isReady) return;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: intelligenceKeys.healthCheck(),
        queryFn: getHealthCheck,
        staleTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: intelligenceKeys.patterns(30),
        queryFn: () => analyzePatterns(30),
        staleTime: 15 * 60 * 1000,
      }),
    ]);
  };
}
