/**
 * React hook for using the Dashboard Memory Client
 */

import { useMemo } from 'react';
import { createDashboardMemoryClient } from '@/lib/memory-sdk/dashboard-adapter';
import { useSupabaseAuth } from './useSupabaseAuth';
import type { MemoryType, CreateMemoryRequest, MemorySearchResult } from '@lanonasis/memory-client';

export function useMemoryClient() {
  const { user } = useSupabaseAuth();

  // Create client instance (memoized)
  const memoryClient = useMemo(() => {
    if (!user) return null;
    return createDashboardMemoryClient();
  }, [user]);

  /**
   * Search memories
   */
  const searchMemories = async (params: {
    query: string;
    limit?: number;
    threshold?: number;
    types?: MemoryType[];
    tags?: string[];
  }): Promise<MemorySearchResult[]> => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.search(params);
  };

  /**
   * Create a memory
   */
  const createMemory = async (memory: {
    title: string;
    content: string;
    type?: MemoryType;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.create(memory);
  };

  /**
   * Update a memory
   */
  const updateMemory = async (id: string, updates: Partial<CreateMemoryRequest>) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.update(id, updates);
  };

  /**
   * Delete a memory
   */
  const deleteMemory = async (id: string) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.delete(id);
  };

  /**
   * Get memory by ID
   */
  const getMemory = async (id: string) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.getById(id);
  };

  /**
   * List memories with pagination
   */
  const listMemories = async (params?: {
    limit?: number;
    offset?: number;
    types?: MemoryType[];
    tags?: string[];
  }) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.list(params);
  };

  /**
   * Bulk tag memories
   */
  const bulkTagMemories = async (memoryIds: string[], tags: string[]) => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.bulkTag(memoryIds, tags);
  };

  /**
   * Get memory statistics
   */
  const getMemoryStats = async () => {
    if (!memoryClient) {
      throw new Error('User not authenticated');
    }
    return memoryClient.getStats();
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
