import { useState, useEffect, useMemo, createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

interface MemoryEntry {
  id: string;
  user_id: string;
  title?: string;
  content?: string;
  type?: string;
  tags?: string[];
  embedding?: number[];
  created_at: string;
  updated_at?: string;
}

export interface PatternAnalysis {
  total_memories: number;
  memories_by_type: Record<string, number>;
  memories_by_day_of_week: Record<string, number>;
  peak_creation_hours: number[];
  average_content_length: number;
  most_common_tags: Array<{ tag: string; count: number }>;
  creation_velocity: {
    daily_average: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  insights: string[];
}

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
  analyzePatterns: (timeRangeDays?: number) => Promise<PatternAnalysis | null>;
  getHealthCheck: () => Promise<HealthCheckResult | null>;
  extractInsights: (topic?: string) => Promise<InsightResult[]>;
  detectDuplicates: (threshold?: number) => Promise<DuplicatePair[]>;
}

const MemoryIntelligenceContext = createContext<MemoryIntelligenceContextValue | null>(null);

interface MemoryIntelligenceProviderProps {
  children: ReactNode;
}

export function MemoryIntelligenceProvider({ children }: MemoryIntelligenceProviderProps) {
  const { user } = useSupabaseAuth();
  const userId = user?.id || null;

  const analyzePatterns = async (timeRangeDays = 30): Promise<PatternAnalysis | null> => {
    if (!userId) return null;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRangeDays);

      const { data, error } = await (supabase as any)
        .from('memory_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const memories = (data || []) as MemoryEntry[];
      
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

      memories.forEach((m: MemoryEntry) => {
        const type = m.type || 'unknown';
        memoryByType[type] = (memoryByType[type] || 0) + 1;

        const date = new Date(m.created_at);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        memoryByDayOfWeek[dayName] = (memoryByDayOfWeek[dayName] || 0) + 1;

        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;

        if (m.content) {
          totalContentLength += m.content.length;
        }

        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const peakHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

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
      console.error('Pattern analysis error:', error);
      return null;
    }
  };

  const getHealthCheck = async (): Promise<HealthCheckResult | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('memory_entries')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      const memories = (data || []) as MemoryEntry[];
      
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

      const memoriesWithEmbeddings = memories.filter((m: MemoryEntry) => m.embedding).length;
      const embeddingCoverage = (memoriesWithEmbeddings / memories.length) * 100;

      const memoriesWithTags = memories.filter((m: MemoryEntry) => m.tags && Array.isArray(m.tags) && m.tags.length > 0).length;
      const taggingConsistency = (memoriesWithTags / memories.length) * 100;

      const types = new Set(memories.map((m: MemoryEntry) => m.type || 'unknown'));
      const typeBalance = Math.min((types.size / 4) * 100, 100);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      const recentMemories = memories.filter((m: MemoryEntry) => new Date(m.created_at) > thirtyDaysAgo).length;
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

      const status: 'healthy' | 'needs_attention' | 'critical' =
        overallScore >= 70 ? 'healthy' :
        overallScore >= 40 ? 'needs_attention' : 'critical';

      return {
        overall_score: overallScore,
        metrics: {
          embedding_coverage: Math.round(embeddingCoverage),
          tagging_consistency: Math.round(taggingConsistency),
          type_balance: Math.round(typeBalance),
          freshness: Math.round(freshness)
        },
        recommendations,
        status
      };
    } catch (error) {
      console.error('Health check error:', error);
      return null;
    }
  };

  const extractInsights = async (topic?: string): Promise<InsightResult[]> => {
    if (!userId) return [];

    try {
      let query = (supabase as any)
        .from('memory_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (topic) {
        query = query.ilike('content', `%${topic}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const memories = (data || []) as MemoryEntry[];
      if (memories.length === 0) return [];

      const insights: InsightResult[] = [];

      const tagCounts: Record<string, number> = {};
      memories.forEach((m: MemoryEntry) => {
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (topTags.length > 0) {
        insights.push({
          category: 'pattern',
          title: 'Primary Focus Areas',
          description: `Your most common topics are: ${topTags.map(([tag]) => tag).join(', ')}`,
          confidence: 0.85,
          supporting_memories: memories.slice(0, 5).map((m: MemoryEntry) => m.id)
        });
      }

      const recentMemories = memories.slice(0, 10);
      if (recentMemories.length >= 5) {
        insights.push({
          category: 'learning',
          title: 'Recent Knowledge Growth',
          description: `You've captured ${recentMemories.length} new memories recently, building your knowledge base`,
          confidence: 0.9,
          supporting_memories: recentMemories.map((m: MemoryEntry) => m.id)
        });
      }

      const typeCounts: Record<string, number> = {};
      memories.forEach((m: MemoryEntry) => {
        const type = m.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const dominantType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];
      if (dominantType && dominantType[1] > memories.length * 0.5) {
        insights.push({
          category: 'opportunity',
          title: 'Diversification Opportunity',
          description: `${Math.round((dominantType[1] / memories.length) * 100)}% of memories are "${dominantType[0]}" type. Consider using other types for better organization.`,
          confidence: 0.75,
          supporting_memories: []
        });
      }

      return insights;
    } catch (error) {
      console.error('Extract insights error:', error);
      return [];
    }
  };

  const detectDuplicates = async (threshold = 0.9): Promise<DuplicatePair[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await (supabase as any)
        .from('memory_entries')
        .select('id, title, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const memories = (data || []) as MemoryEntry[];
      if (memories.length < 2) return [];

      const duplicates: DuplicatePair[] = [];
      const titleMap = new Map<string, MemoryEntry[]>();

      memories.forEach((m: MemoryEntry) => {
        if (!m.title) return;
        const normalizedTitle = m.title.toLowerCase().trim();
        const existing = titleMap.get(normalizedTitle);
        if (existing) {
          existing.push(m);
        } else {
          titleMap.set(normalizedTitle, [m]);
        }
      });

      titleMap.forEach((mems) => {
        if (mems.length > 1) {
          for (let i = 0; i < mems.length - 1; i++) {
            duplicates.push({
              memory_1: {
                id: mems[i].id,
                title: mems[i].title || 'Untitled',
                created_at: mems[i].created_at
              },
              memory_2: {
                id: mems[i + 1].id,
                title: mems[i + 1].title || 'Untitled',
                created_at: mems[i + 1].created_at
              },
              similarity_score: 1.0,
              recommendation: 'keep_newer'
            });
          }
        }
      });

      return duplicates.slice(0, 10);
    } catch (error) {
      console.error('Duplicate detection error:', error);
      return [];
    }
  };

  const value = useMemo(() => ({
    userId,
    isReady: !!userId,
    analyzePatterns,
    getHealthCheck,
    extractInsights,
    detectDuplicates
  }), [userId]);

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
  const { userId, analyzePatterns } = useMemoryIntelligence();
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!userId) return;
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
    if (userId) {
      refetch();
    }
  }, [userId, timeRangeDays]);

  return { data, isLoading, error, refetch };
}

export function useHealthCheck() {
  const { userId, getHealthCheck } = useMemoryIntelligence();
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!userId) return;
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
    if (userId) {
      refetch();
    }
  }, [userId]);

  return { data, isLoading, error, refetch };
}

export function useInsightExtraction(topic?: string) {
  const { userId, extractInsights } = useMemoryIntelligence();
  const [data, setData] = useState<InsightResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!userId) return;
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
    if (userId) {
      refetch();
    }
  }, [userId, topic]);

  return { data, isLoading, error, refetch };
}

export function useDuplicateDetection(threshold = 0.9) {
  const { userId, detectDuplicates } = useMemoryIntelligence();
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!userId) return;
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
    if (userId) {
      refetch();
    }
  }, [userId, threshold]);

  return { data, isLoading, error, refetch };
}
