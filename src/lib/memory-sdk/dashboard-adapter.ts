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

  constructor() { }

  /**
   * Normalize a raw memory payload from the API into a safe MemoryEntry
   *
   * This mirrors the mobile SDK fix:
   * - Unwraps { data: {...}, message: string } envelopes
   * - Ensures tags is always a string[]
   * - Ensures content/title are non-null strings
   * - Ensures createdAt/updatedAt fields exist (camelCase + snake_case)
   */
  private normalizeMemory(raw: any): MemoryEntry {
    if (!raw) {
      const now = new Date().toISOString();
      return {
        // @ts-expect-error: allow partial object to avoid runtime crashes
        id: '',
        content: '',
        memory_type: 'context',
        tags: [],
        metadata: {},
        created_at: now,
        updated_at: now,
      } as MemoryEntry;
    }

    // Handle envelope shapes like { data: {...}, message: '...' }
    const envelope = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? raw.data
      : raw;

    const base: any = { ...envelope };

    // Normalize tags -> always string[]
    if (!Array.isArray(base.tags)) {
      base.tags = [];
    } else {
      base.tags = base.tags
        .filter((tag: any) => typeof tag === 'string')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    }

    // Normalize content/title
    base.content = (base.content ?? '').toString();
    if (!base.title || typeof base.title !== 'string' || !base.title.trim()) {
      base.title = base.content ? base.content.slice(0, 80) : 'Untitled';
    }

    // Normalize timestamps (support camelCase & snake_case)
    const now = new Date().toISOString();
    const created =
      base.createdAt ||
      base.created_at ||
      base.timestamp ||
      now;

    const updated =
      base.updatedAt ||
      base.updated_at ||
      created;

    base.createdAt = created;
    base.updatedAt = updated;

    if (base.created_at === undefined) {
      base.created_at = created;
    }
    if (base.updated_at === undefined) {
      base.updated_at = updated;
    }

    return base as MemoryEntry;
  }

  /**
   * Initialize client with current auth session
   */
  private async initializeClient() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    // Memory client expects base URL without /api suffix (it adds /api/v1 itself)
    // Default to mcp.lanonasis.com if no env var is set
    const apiUrl = import.meta.env.VITE_MEMORY_API_URL || import.meta.env.VITE_MCP_URL || 'https://mcp.lanonasis.com';

    const baseConfig = {
      apiUrl,
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

  try {
    const response: any = await client.searchMemories(searchParams);

    // Support multiple response shapes:
    // - { data: MemorySearchResult[] }
    // - { data: { results: MemorySearchResult[] } }
    // - { data: { data: MemorySearchResult[] } }
    const rawData = response?.data;
    let list: any[] = [];

    if (Array.isArray(rawData)) {
      list = rawData;
    } else if (Array.isArray(rawData?.results)) {
      list = rawData.results;
    } else if (Array.isArray(rawData?.data)) {
      list = rawData.data;
    }

    return list.map((m: any) => this.normalizeMemory(m) as unknown as MemorySearchResult);
  } catch (error: any) {
    throw error;
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

  const rawTitle = (memory.title ?? '').toString().trim();
  const rawContent = (memory.content ?? '').toString().trim();

  if (!rawContent) {
    // Fail fast with a clear message instead of a backend 400
    throw new Error('Memory content is required to create a memory entry.');
  }

  const safeTags = Array.isArray(memory.tags)
    ? memory.tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    : [];

  const createParams: CreateMemoryRequest = {
    title: rawTitle || rawContent.slice(0, 80) || 'Untitled',
    content: rawContent,
    memory_type: memory.type || 'context',
    tags: safeTags,
    metadata: memory.metadata ?? {},
  };

  const response: any = await client.createMemory(createParams);
  return this.normalizeMemory(response?.data ?? response);
}

/**
 * Update an existing memory
 */
async update(id: string, updates: Partial<CreateMemoryRequest>): Promise<MemoryEntry> {
  const client = await this.getClient();

  // Ensure we never send problematic values for tags/content
  const sanitizedUpdates: any = { ...updates };

  if (sanitizedUpdates.content !== undefined) {
    sanitizedUpdates.content = sanitizedUpdates.content?.toString().trim();
  }

  if (sanitizedUpdates.tags !== undefined) {
    sanitizedUpdates.tags = Array.isArray(sanitizedUpdates.tags)
      ? sanitizedUpdates.tags
          .filter((tag: any) => typeof tag === 'string')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
      : [];
  }

  const response: any = await client.updateMemory(id, sanitizedUpdates);
  return this.normalizeMemory(response?.data ?? response);
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
  const response: any = await client.getMemory(id);
  return this.normalizeMemory(response?.data ?? response);
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
  const limit = params?.limit || 20;
  const page =
    params?.offset !== undefined ? Math.floor(params.offset / limit) + 1 : 1;

  const response: any = await client.listMemories({
    limit,
    page,
    memory_type: params?.types?.[0],
    tags: params?.tags,
    status: 'active'
  });

  const rawData = response?.data;
  let list: any[] = [];

  if (Array.isArray(rawData)) {
    list = rawData;
  } else if (Array.isArray(rawData?.data)) {
    list = rawData.data;
  }

  return list.map((m: any) => this.normalizeMemory(m));
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
    if (typeof client.getMemoryStats !== 'function') {
      return null;
    }
    const response = await client.getMemoryStats();
    return response.data || null;
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
