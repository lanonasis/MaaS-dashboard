/**
 * Dashboard-specific Memory SDK Adapter
 * Browser-safe stub for memory operations
 * 
 * NOTE: The @lanonasis/memory-client is a server-side package using Node.js utilities.
 * This adapter provides browser-compatible stubs that delegate to backend API endpoints.
 */

import { supabase } from '@/integrations/supabase/client';

// Browser-compatible type definitions
export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface MemorySearchResult {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags?: string[];
  similarity?: number;
  created_at: string;
}

export interface CreateMemoryRequest {
  title: string;
  content: string;
  memory_type?: MemoryType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchMemoryRequest {
  query: string;
  limit?: number;
  threshold?: number;
  memory_types?: MemoryType[];
  tags?: string[];
  status?: string;
}

export type MemoryType = 'context' | 'insight' | 'reference' | 'plan';

/**
 * Dashboard Memory Client - Browser stub that delegates to backend API
 */
export class DashboardMemoryClient {
  private apiKey: string | null = null;
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_MEMORY_API_URL || '/api/memory';
  }

  /**
   * Initialize client with current auth session
   */
  private async initializeClient() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    this.apiKey = session.access_token;
  }

  /**
   * Get the initialized client
   */
  private async getClient() {
    if (!this.apiKey) {
      await this.initializeClient();
    }
    return this;
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

    try {
      const response = await fetch(`${this.apiUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: params.query,
          limit: params.limit || 20,
          threshold: params.threshold || 0.7,
          memory_types: params.types,
          tags: params.tags,
          status: 'active'
        })
      });

      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.warn('Memory search failed, returning empty results:', error);
      return [];
    }
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

    try {
      const response = await fetch(`${this.apiUrl}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: memory.title,
          content: memory.content,
          memory_type: memory.type || 'context',
          tags: memory.tags || [],
          metadata: memory.metadata
        })
      });

      if (!response.ok) throw new Error('Create failed');
      return await response.json();
    } catch (error) {
      console.error('Failed to create memory:', error);
      throw error;
    }
  }

  /**
   * Update an existing memory
   */
  async update(id: string, updates: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
    const client = await this.getClient();

    try {
      const response = await fetch(`${this.apiUrl}/memories/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Update failed');
      return await response.json();
    } catch (error) {
      console.error('Failed to update memory:', error);
      throw error;
    }
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    const client = await this.getClient();

    try {
      const response = await fetch(`${this.apiUrl}/memories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error('Delete failed');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  }

  /**
   * Get a specific memory by ID
   */
  async getById(id: string): Promise<MemoryEntry> {
    const client = await this.getClient();

    try {
      const response = await fetch(`${this.apiUrl}/memories/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error('Get failed');
      return await response.json();
    } catch (error) {
      console.error('Failed to get memory:', error);
      throw error;
    }
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

    try {
      const queryParams = new URLSearchParams({
        limit: String(params?.limit || 20),
        offset: String(params?.offset || 0),
        status: 'active'
      });

      if (params?.types?.length) {
        queryParams.append('types', params.types.join(','));
      }
      if (params?.tags?.length) {
        queryParams.append('tags', params.tags.join(','));
      }

      const response = await fetch(`${this.apiUrl}/memories?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error('List failed');
      return await response.json();
    } catch (error) {
      console.warn('Memory list failed, returning empty results:', error);
      return [];
    }
  }

  /**
   * Batch create memories
   */
  async batchCreate(memories: CreateMemoryRequest[]): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    for (const memory of memories) {
      try {
        const result = await this.create(memory);
        results.push(result);
      } catch (error) {
        console.error('Batch create failed for item:', error);
      }
    }
    return results;
  }

  /**
   * Bulk tag memories
   */
  async bulkTag(memoryIds: string[], tags: string[]): Promise<void> {
    for (const id of memoryIds) {
      try {
        const memory = await this.getById(id);
        const updatedTags = [...new Set([...(memory.tags || []), ...tags])];
        await this.update(id, { tags: updatedTags });
      } catch (error) {
        console.error('Bulk tag failed for memory:', id, error);
      }
    }
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    const client = await this.getClient();

    try {
      const response = await fetch(`${this.apiUrl}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error('Stats failed');
      return await response.json();
    } catch (error) {
      console.warn('Failed to get memory stats:', error);
      return { total: 0, tags: [], access_count: 0 };
    }
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
