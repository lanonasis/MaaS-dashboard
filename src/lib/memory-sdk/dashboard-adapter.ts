/**
 * Dashboard-specific Memory SDK Adapter
 * Integrates the memory-client SDK with the dashboard's Supabase auth and config
 */

import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import type {
  MemoryEntry,
  CreateMemoryRequest,
  SearchMemoryRequest,
  MemorySearchResult,
  MemoryType
} from '@lanonasis/memory-client';
import { supabase } from '@/integrations/supabase/client';

/**
 * Dashboard Memory Client - Automatically handles auth
 */
export class DashboardMemoryClient {
  private client: MemoryClient | null = null;

  constructor() {}

  /**
   * Initialize client with current auth session
   */
  private async initializeClient() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    const baseConfig = {
      apiUrl: import.meta.env.VITE_MEMORY_API_URL || '/api/memory',
      apiKey: session.access_token,
      timeout: 30000
    };

    this.client = createMemoryClient(baseConfig);
  }

  /**
   * Get the initialized client
   */
  private async getClient() {
    if (!this.client) {
      await this.initializeClient();
    }
    return this.client;
  }

  /**
   * Search memories with semantic similarity
   */
  async search(params: {
    query: string;
    limit?: number;
    threshold?: number;
    types?: MemoryType[];
    tags?: string[];
  }): Promise<MemorySearchResult[]> {
    const client = await this.getClient();

    const searchParams: SearchMemoryRequest = {
      query: params.query,
      limit: params.limit || 20,
      threshold: params.threshold || 0.7,
      memory_types: params.types,
      tags: params.tags,
      status: 'active'
    };

    const response = await client.searchMemories(searchParams);
    return response.data || [];
  }

  /**
   * Create a new memory
   */
  async create(memory: {
    title: string;
    content: string;
    type?: MemoryType;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<MemoryEntry> {
    const client = await this.getClient();

    const createParams: CreateMemoryRequest = {
      title: memory.title,
      content: memory.content,
      memory_type: memory.type || 'context',
      tags: memory.tags || [],
      metadata: memory.metadata
    };

    const response = await client.createMemory(createParams);
    return response.data!;
  }

  /**
   * Update an existing memory
   */
  async update(id: string, updates: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
    const client = await this.getClient();
    const response = await client.updateMemory(id, updates);
    return response.data!;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    const client = await this.getClient();
    await client.deleteMemory(id);
  }

  /**
   * Get a specific memory by ID
   */
  async getById(id: string): Promise<MemoryEntry> {
    const client = await this.getClient();
    const response = await client.getMemory(id);
    return response.data!;
  }

  /**
   * List all memories with pagination
   */
  async list(params?: {
    limit?: number;
    offset?: number;
    types?: MemoryType[];
    tags?: string[];
  }): Promise<MemoryEntry[]> {
    const client = await this.getClient();
    const response = await client.listMemories({
      limit: params?.limit || 20,
      offset: params?.offset || 0,
      memory_types: params?.types,
      tags: params?.tags,
      status: 'active'
    });
    return response.data || [];
  }

  /**
   * Batch create memories
   */
  async batchCreate(memories: CreateMemoryRequest[]): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    for (const memory of memories) {
      const result = await this.create(memory);
      results.push(result);
    }
    return results;
  }

  /**
   * Bulk tag memories
   */
  async bulkTag(memoryIds: string[], tags: string[]): Promise<void> {
    const client = await this.getClient();
    for (const id of memoryIds) {
      const memory = await this.getById(id);
      const updatedTags = [...new Set([...(memory.tags || []), ...tags])];
      await this.update(id, { tags: updatedTags });
    }
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    const client = await this.getClient();
    const response = await client.getUserStats();
    return response.data;
  }
}

/**
 * Create a dashboard memory client instance
 */
export function createDashboardMemoryClient() {
  return new DashboardMemoryClient();
}

/**
 * Singleton instance for convenience
 */
let dashboardMemoryClient: DashboardMemoryClient | null = null;

export function getDashboardMemoryClient() {
  if (!dashboardMemoryClient) {
    dashboardMemoryClient = createDashboardMemoryClient();
  }
  return dashboardMemoryClient;
}
