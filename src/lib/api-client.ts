/**
 * Centralized API client for MaaS Dashboard
 * Handles all communication with Onasis-CORE Gateway
 * Replaces direct Supabase usage with Core API calls
 * SECURITY: Uses secure in-memory token storage
 */

import { secureTokenStorage } from './secure-token-storage';
import { centralAuth } from './central-auth';
import { getAuthGatewayAccessToken } from './token-exchange';
import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_CORE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/v1', '') || 'https://api.lanonasis.com';
const MAAS_API_PREFIX = '/api/v1';

// Log API configuration in development only
if (import.meta.env.DEV) {
  console.log('[API Client] Configuration:', { apiBaseUrl: API_BASE_URL });
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow' | 'note' | 'document';
  tags: string[];
  metadata: Record<string, any>;
  is_private: boolean;
  is_archived: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  plan: 'free' | 'pro' | 'enterprise';
  max_memories: number;
  max_storage_mb: number;
  current_memories_count: number;
  current_storage_mb: number;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  permissions: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

class ApiClient {
  /**
   * Get authentication headers for API requests
   * Priority: API key > Auth-gateway token > Supabase session > Legacy token
   */
  private async getAuthHeaders(apiKey?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Platform': 'dashboard',
      'X-Project-Scope': 'maas'
    };

    // Use API key if provided
    if (apiKey) {
      if (apiKey.startsWith('vx_')) {
        headers['Authorization'] = apiKey;
        headers['X-API-Key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      return headers;
    }

    // Try auth-gateway token (unified token system)
    const authGatewayToken = getAuthGatewayAccessToken();
    if (authGatewayToken) {
      headers['Authorization'] = `Bearer ${authGatewayToken}`;
      return headers;
    }

    // Try Supabase session token - this is the most reliable source
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        return headers;
      }
    } catch (error) {
      console.warn('[API Client] Failed to get Supabase session:', error);
    }

    // Fallback to legacy token storage
    const legacyToken = secureTokenStorage.getAccessToken();
    if (legacyToken) {
      headers['Authorization'] = `Bearer ${legacyToken}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiKey?: string
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${MAAS_API_PREFIX}${endpoint}`;

    // Get auth headers (includes Supabase session check)
    const authHeaders = await this.getAuthHeaders(apiKey);

    const defaultOptions: RequestInit = {
      headers: authHeaders,
      ...options
    };

    // Merge headers properly
    if (options.headers) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        ...options.headers
      };
    }

    try {
      const response = await fetch(url, defaultOptions);

      // Handle authentication errors
      if (response.status === 401) {
        console.warn('[API Client] 401 Unauthorized - attempting token refresh');
        secureTokenStorage.clear();

        // Try to refresh token before redirecting
        try {
          await centralAuth.refreshToken();
          // Retry the request with new token
          return this.makeRequest(endpoint, options, apiKey);
        } catch (refreshError) {
          console.error('[API Client] Token refresh failed:', refreshError);
          // Refresh failed, redirect to login
          const redirectUrl = `${window.location.origin}/auth/callback`;
          const authUrl = new URL(`${API_BASE_URL}/auth/login`);
          authUrl.searchParams.set('platform', 'dashboard');
          authUrl.searchParams.set('redirect_url', redirectUrl);

          window.location.href = authUrl.toString();
          throw new Error('Authentication required - redirecting to login');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const jsonData = await response.json();
      return jsonData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[API Client] Request failed for ${endpoint}:`, error);

      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        throw new Error(`Network error: Unable to reach ${API_BASE_URL}. Check your internet connection and API endpoint configuration.`);
      }

      throw error;
    }
  }

  // Memory Management Methods

  async getMemories(params: {
    page?: number;
    limit?: number;
    type?: string;
    tags?: string[];
    search?: string;
    apiKey?: string;
  } = {}): Promise<ApiResponse<Memory[]>> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.type) searchParams.set('type', params.type);
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/memory${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<Memory[]>(endpoint, {}, params.apiKey);
  }

  async createMemory(memory: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Memory>> {
    // Defensive input sanitization so the MaaS backend only ever sees valid payloads
    const rawTitle = (memory.title ?? '').toString().trim();
    const rawContent = (memory.content ?? '').toString().trim();

    if (!rawContent) {
      // Fail fast on the client instead of sending an invalid request to the backend
      throw new Error('Memory content is required to create a memory.');
    }

    const safeTags = Array.isArray(memory.tags)
      ? memory.tags
          .filter((tag) => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    const payload: Memory = {
      id: '' as any, // id is generated by the backend; this placeholder is ignored server-side
      title: rawTitle || rawContent.slice(0, 80) || 'Untitled',
      content: rawContent,
      type: memory.type || 'context',
      tags: safeTags,
      metadata: memory.metadata ?? {},
      is_private: false,
      is_archived: false,
      access_count: 0,
      last_accessed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.makeRequest<Memory>('/memory', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getMemory(id: string): Promise<ApiResponse<Memory>> {
    return this.makeRequest<Memory>(`/memory/${id}`);
  }

  async updateMemory(id: string, updates: {
    title?: string;
    content?: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Memory>> {
    return this.makeRequest<Memory>(`/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteMemory(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/memory/${id}`, {
      method: 'DELETE'
    });
  }

  async searchMemories(query: {
    query: string;
    limit?: number;
    similarity_threshold?: number;
    apiKey?: string;
  }): Promise<ApiResponse<Memory[]>> {
    const { apiKey, ...searchQuery } = query;
    return this.makeRequest<Memory[]>('/memory/search', {
      method: 'POST',
      body: JSON.stringify(searchQuery)
    }, apiKey);
  }

  // Organization Management Methods

  async getOrganizations(): Promise<ApiResponse<Organization[]>> {
    return this.makeRequest<Organization[]>('/organizations');
  }

  // API Key Management Methods

  async getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    return this.makeRequest<ApiKey[]>('/api-keys');
  }

  async createApiKey(keyData: {
    name: string;
    permissions?: string[];
    expires_at?: string;
  }): Promise<ApiResponse<ApiKey & { secret: string }>> {
    return this.makeRequest<ApiKey & { secret: string }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(keyData)
    });
  }

  async deleteApiKey(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/api-keys/${id}`, {
      method: 'DELETE'
    });
  }

  // Intelligence API Methods (Supabase Edge Functions)
  // These use the Supabase project URL directly with X-API-Key auth

  private async makeIntelligenceRequest<T>(
    functionName: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL=https://<project-ref>.supabase.co
    const url = `${supabaseUrl}/functions/v1/${functionName}`;

    // Get API key for intelligence endpoints
    const apiKey = import.meta.env.VITE_MEMORY_API_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'X-API-Key': apiKey }),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || `Request failed with status ${response.status}` };
      }

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Intelligence API request failed' };
    }
  }

  async intelligenceHealthCheck(): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-health-check', {
      method: 'GET',
    });
  }

  async intelligenceSuggestTags(params: {
    content: string;
    existing_tags?: string[];
    max_suggestions?: number;
  }): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-suggest-tags', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async intelligenceFindRelated(params: {
    memory_id: string;
    limit?: number;
    threshold?: number;
  }): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-find-related', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async intelligenceDetectDuplicates(params: {
    threshold?: number;
    include_archived?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-detect-duplicates', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async intelligenceExtractInsights(params: {
    content?: string;
    memory_ids?: string[];
    insight_types?: string[];
    topic_filter?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-extract-insights', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async intelligenceAnalyzePatterns(params: {
    time_range_days?: number;
    include_content_analysis?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.makeIntelligenceRequest<any>('intelligence-analyze-patterns', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Health and Status

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    service: string;
    version: string;
    timestamp: string;
    capabilities: string[];
  }>> {
    return this.makeRequest<any>('/health');
  }

  // Utility Methods

  async uploadFile(file: File, metadata?: Record<string, any>): Promise<ApiResponse<{
    id: string;
    filename: string;
    size: number;
    url: string;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.makeRequest<any>('/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'x-project-scope': 'maas'
        // Don't set Content-Type for FormData, let browser set it
      }
    });
  }

  // Analytics and Usage

  async getUsageStats(params: {
    start_date?: string;
    end_date?: string;
    metric_type?: string;
  } = {}): Promise<ApiResponse<{
    total_memories: number;
    memories_created: number;
    searches_performed: number;
    api_calls: number;
    storage_used_mb: number;
  }>> {
    const searchParams = new URLSearchParams();

    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);
    if (params.metric_type) searchParams.set('metric_type', params.metric_type);

    const queryString = searchParams.toString();
    const endpoint = `/analytics/usage${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<any>(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { Memory, Organization, ApiKey, ApiResponse };