/**
 * React Query cached hook for memory operations
 * Provides automatic caching, deduplication, and background refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { apiClient } from '@/lib/api-client';
import type { MemoryType } from '@lanonasis/memory-client';

interface Memory {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  metadata: Record<string, any>;
  is_private: boolean;
  is_archived: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryListParams {
  limit?: number;
  offset?: number;
  types?: MemoryType[];
  tags?: string[];
}

interface MemorySearchParams {
  query: string;
  limit?: number;
  similarity_threshold?: number;
}

// Query keys factory for consistent key generation
export const memoryKeys = {
  all: ['memories'] as const,
  lists: () => [...memoryKeys.all, 'list'] as const,
  list: (params: MemoryListParams) => [...memoryKeys.lists(), params] as const,
  search: (params: MemorySearchParams) => [...memoryKeys.all, 'search', params] as const,
  details: () => [...memoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...memoryKeys.details(), id] as const,
};

/**
 * Hook for fetching paginated memory list with caching
 */
export function useCachedMemories(params: MemoryListParams = {}) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: memoryKeys.list(params),
    queryFn: async () => {
      const response = await apiClient.searchMemories({
        query: '*', // Wildcard to list all
        limit: params.limit || 20,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return {
        memories: response.data || [],
        pagination: response.pagination,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime in v4)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for semantic memory search with caching
 */
export function useCachedMemorySearch(params: MemorySearchParams | null) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: params ? memoryKeys.search(params) : ['disabled'],
    queryFn: async () => {
      if (!params) return { memories: [] };
      const response = await apiClient.searchMemories({
        query: params.query,
        limit: params.limit || 10,
        similarity_threshold: params.similarity_threshold || 0.7,
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return { memories: response.data || [] };
    },
    enabled: !!user?.id && !!params?.query,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching a single memory by ID
 */
export function useCachedMemory(id: string | null) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: id ? memoryKeys.detail(id) : ['disabled'],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.getMemory(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!user?.id && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook for creating memories with automatic cache invalidation
 */
export function useCreateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memory: {
      title: string;
      content: string;
      type?: MemoryType;
      tags?: string[];
      metadata?: Record<string, any>;
    }) => {
      const response = await apiClient.createMemory(memory);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all memory lists to refetch
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Hook for updating memories with automatic cache invalidation
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Memory>;
    }) => {
      const response = await apiClient.updateMemory(id, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data, { id }) => {
      // Update the specific memory in cache
      queryClient.setQueryData(memoryKeys.detail(id), data);
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Hook for deleting memories with automatic cache invalidation
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.deleteMemory(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: memoryKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists() });
    },
  });
}

/**
 * Utility to prefetch memories (for route prefetching)
 */
export function usePrefetchMemories() {
  const queryClient = useQueryClient();

  return async (params: MemoryListParams = {}) => {
    await queryClient.prefetchQuery({
      queryKey: memoryKeys.list(params),
      queryFn: async () => {
        const response = await apiClient.searchMemories({
          query: '*',
          limit: params.limit || 20,
        });
        return { memories: response.data || [], pagination: response.pagination };
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}
