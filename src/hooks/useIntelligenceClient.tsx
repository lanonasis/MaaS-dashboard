/**
 * React hook for using the Intelligence API
 * Provides AI-powered memory analysis, tagging, and insights
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useToast } from './use-toast';

// Types for Intelligence API responses
export interface HealthScore {
  overall: number;
  breakdown: {
    tagging: number;
    completeness: number;
    diversity: number;
    recency: number;
    organization: number;
  };
}

export interface HealthCheckResult {
  status: string;
  health_score: HealthScore;
  statistics: {
    total_memories: number;
    active_memories: number;
    archived_memories: number;
    memories_with_tags: number;
    unique_tags: number;
    memory_types: number;
    stale_memories_90d: number;
    recent_memories_30d: number;
  };
  issues: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affected_count: number;
    recommendation: string;
  }>;
  recommendations: string[];
  generated_at: string;
}

export interface TagSuggestion {
  suggestions: string[];
  existing_tags: string[];
  from_user_vocabulary: number;
}

export interface RelatedMemory {
  id: string;
  title: string;
  content: string;
  similarity: number;
  tags: string[];
}

export interface DuplicateGroup {
  primary_id: string;
  primary_title: string;
  similarity_score: number;
  duplicates: Array<{
    id: string;
    title: string;
    similarity: number;
    created_at: string;
  }>;
}

export interface PatternAnalysis {
  total_memories: number;
  time_range_days: number;
  memories_by_type: Record<string, number>;
  memories_by_day_of_week: Record<string, number>;
  peak_creation_hours: number[];
  top_tags: Array<{ tag: string; count: number }>;
  average_content_length: number;
  most_accessed: Array<{ id: string; title: string; access_count: number }>;
  insights: string[];
  generated_at: string;
}

export interface Insight {
  type: string;
  content: string;
  confidence: number;
  related_memory_ids?: string[];
}

export function useIntelligenceClient() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get memory health check with AI recommendations
   */
  const getHealthCheck = useCallback(async (): Promise<HealthCheckResult | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceHealthCheck();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || null;
    } catch (err: any) {
      const message = err.message || 'Failed to get health check';
      setError(message);
      toast({
        title: 'Intelligence API Error',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  /**
   * Get AI-powered tag suggestions for content
   */
  const suggestTags = useCallback(async (
    content: string,
    existingTags?: string[],
    maxSuggestions?: number
  ): Promise<TagSuggestion | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceSuggestTags({
        content,
        existing_tags: existingTags,
        max_suggestions: maxSuggestions
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || null;
    } catch (err: any) {
      const message = err.message || 'Failed to suggest tags';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Find semantically related memories
   */
  const findRelated = useCallback(async (
    memoryId: string,
    limit?: number,
    threshold?: number
  ): Promise<RelatedMemory[]> => {
    if (!user) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceFindRelated({
        memory_id: memoryId,
        limit,
        threshold
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.related_memories || [];
    } catch (err: any) {
      const message = err.message || 'Failed to find related memories';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Detect duplicate or near-duplicate memories
   */
  const detectDuplicates = useCallback(async (
    threshold?: number,
    includeArchived?: boolean
  ): Promise<DuplicateGroup[]> => {
    if (!user) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceDetectDuplicates({
        threshold,
        include_archived: includeArchived
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.duplicate_groups || [];
    } catch (err: any) {
      const message = err.message || 'Failed to detect duplicates';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Extract insights from content or memories
   */
  const extractInsights = useCallback(async (params: {
    content?: string;
    memoryIds?: string[];
    insightTypes?: ('themes' | 'connections' | 'gaps' | 'actions' | 'summary')[];
    topicFilter?: string;
  }): Promise<Insight[]> => {
    if (!user) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceExtractInsights({
        content: params.content,
        memory_ids: params.memoryIds,
        insight_types: params.insightTypes,
        topic_filter: params.topicFilter
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.insights || [];
    } catch (err: any) {
      const message = err.message || 'Failed to extract insights';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Analyze patterns in memory usage
   */
  const analyzePatterns = useCallback(async (
    timeRangeDays?: number,
    includeContentAnalysis?: boolean
  ): Promise<PatternAnalysis | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.intelligenceAnalyzePatterns({
        time_range_days: timeRangeDays,
        include_content_analysis: includeContentAnalysis
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || null;
    } catch (err: any) {
      const message = err.message || 'Failed to analyze patterns';
      setError(message);
      toast({
        title: 'Pattern Analysis Error',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    // Methods
    getHealthCheck,
    suggestTags,
    findRelated,
    detectDuplicates,
    extractInsights,
    analyzePatterns,

    // State
    isLoading,
    error,
    isReady: !!user
  };
}
