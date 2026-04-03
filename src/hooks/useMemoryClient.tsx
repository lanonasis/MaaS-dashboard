/**
 * React hook for using the Dashboard Memory Client
 */

import { useMemo } from 'react';
import { apiClient, type Memory } from '@/lib/api-client';
import { useSupabaseAuth } from './useSupabaseAuth';

export type MemoryType = Memory['type'];
export interface MemorySearchResult extends Memory {
  similarity?: number;
}

export interface CreateMemoryRequest {
  title: string;
  content: string;
  type?: MemoryType;
  memory_type?: MemoryType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface MemorySearchParams {
  query: string;
  limit?: number;
  threshold?: number;
  types?: MemoryType[];
  tags?: string[];
}

interface ListMemoriesParams {
  limit?: number;
  offset?: number;
  types?: MemoryType[];
  tags?: string[];
}

const normalizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const resolveMemoryType = (payload: {
  type?: MemoryType;
  memory_type?: MemoryType;
}) => payload.type ?? payload.memory_type;

const includesAllTags = (memoryTags: unknown, requiredTags?: string[]) => {
  if (!requiredTags?.length) return true;
  const normalized = normalizeTags(memoryTags);
  return requiredTags.every((tag) => normalized.includes(tag));
};

const includesType = (type: MemoryType, allowedTypes?: MemoryType[]) => {
  if (!allowedTypes?.length) return true;
  return allowedTypes.includes(type);
};

export function useMemoryClient() {
  const { user } = useSupabaseAuth();

  // Use the canonical dashboard API client contract when authenticated.
  const memoryClient = useMemo(() => {
    if (!user) return null;
    return apiClient;
  }, [user]);

  const requireClient = () => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient;
  };

  /**
   * Search memories
   */
  const searchMemories = async (params: MemorySearchParams): Promise<MemorySearchResult[]> => {
    const client = requireClient();
    const response = await client.searchMemories({
      query: params.query,
      limit: params.limit,
      similarity_threshold: params.threshold,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const results = (response.data || []).filter(
      (memory) =>
        includesType(memory.type, params.types) &&
        includesAllTags(memory.tags, params.tags)
    );

    return results.map((memory) => ({
      ...memory,
      tags: normalizeTags(memory.tags),
    }));
  };

  /**
   * Create a memory
   */
  const createMemory = async (memory: CreateMemoryRequest): Promise<Memory> => {
    const client = requireClient();
    const response = await client.createMemory({
      title: memory.title,
      content: memory.content,
      type: resolveMemoryType(memory),
      tags: memory.tags,
      metadata: memory.metadata,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create memory');
    }

    return {
      ...response.data,
      tags: normalizeTags(response.data.tags),
    };
  };

  /**
   * Update a memory
   */
  const updateMemory = async (
    id: string,
    updates: Partial<CreateMemoryRequest>
  ): Promise<Memory> => {
    const client = requireClient();
    const { memory_type, ...rest } = updates;
    const response = await client.updateMemory(id, {
      ...rest,
      type: rest.type ?? memory_type,
    });

    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update memory');
    }

    return {
      ...response.data,
      tags: normalizeTags(response.data.tags),
    };
  };

  /**
   * Delete a memory
   */
  const deleteMemory = async (id: string): Promise<void> => {
    const client = requireClient();
    const response = await client.deleteMemory(id);
    if (response.error) {
      throw new Error(response.error);
    }
  };

  /**
   * Get memory by ID
   */
  const getMemory = async (id: string): Promise<Memory> => {
    const client = requireClient();
    const response = await client.getMemory(id);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Memory not found');
    }

    return {
      ...response.data,
      tags: normalizeTags(response.data.tags),
    };
  };

  /**
   * List memories with pagination
   */
  const listMemories = async (params?: ListMemoriesParams): Promise<Memory[]> => {
    const client = requireClient();
    const limit = params?.limit || 20;
    const page = params?.offset !== undefined ? Math.floor(params.offset / limit) + 1 : 1;
    const filteredType = params?.types?.length === 1 ? params.types[0] : undefined;

    const response = await client.getMemories({
      page,
      limit,
      type: filteredType,
      tags: params?.tags,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return (response.data || [])
      .filter((memory) => includesType(memory.type, params?.types))
      .filter((memory) => includesAllTags(memory.tags, params?.tags))
      .map((memory) => ({
        ...memory,
        tags: normalizeTags(memory.tags),
      }));
  };

  /**
   * Bulk tag memories
   */
  const bulkTagMemories = async (memoryIds: string[], tags: string[]): Promise<void> => {
    const normalizedTags = normalizeTags(tags);
    await Promise.all(
      memoryIds.map(async (id) => {
        const memory = await getMemory(id);
        const mergedTags = Array.from(new Set([...memory.tags, ...normalizedTags]));
        await updateMemory(id, { tags: mergedTags });
      })
    );
  };

  /**
   * Get memory statistics
   */
  const getMemoryStats = async () => {
    const client = requireClient();
    const response = await client.getUsageStats();
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || null;
  };

  return {
    memoryClient,
    searchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    getMemory,
    listMemories,
    bulkTagMemories,
    getMemoryStats,
    isReady: !!memoryClient
  };
}
