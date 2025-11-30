/**
 * Centralized API client for MaaS Dashboard
 * Handles all communication with Onasis-CORE Gateway
 * Replaces direct Supabase usage with Core API calls
 * SECURITY: Uses secure in-memory token storage
 */

import { secureTokenStorage } from './secure-token-storage';
import { centralAuth } from './central-auth';
import { getAuthGatewayAccessToken } from './token-exchange';

const API_BASE_URL = import.meta.env.VITE_CORE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/v1', '') || 'https://api.lanonasis.com';
const MAAS_API_PREFIX = '/api/v1';

// #region agent log - Log API URL configuration
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:11',message:'API_BASE_URL configured',data:{apiBaseUrl:API_BASE_URL,envVar:import.meta.env.VITE_CORE_API_BASE_URL,hasEnvVar:!!import.meta.env.VITE_CORE_API_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
}
// #endregion

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
  private getAuthHeaders(apiKey?: string): Record<string, string> {
    // Priority order for authentication:
    // 1. API key if provided
    // 2. Auth-gateway token (from token exchange)
    // 3. Fallback to secure token storage (legacy)
    const authGatewayToken = getAuthGatewayAccessToken();
    const legacyToken = secureTokenStorage.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Platform': 'dashboard',
      'X-Project-Scope': 'maas'
    };

    // Use API key if provided, otherwise use Bearer token
    if (apiKey) {
      // For API keys starting with 'vx_', use as direct authorization
      if (apiKey.startsWith('vx_')) {
        headers['Authorization'] = apiKey;
        headers['X-API-Key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else if (authGatewayToken) {
      // Use auth-gateway token (unified token system)
      headers['Authorization'] = `Bearer ${authGatewayToken}`;
      console.log('[API Client] Using auth-gateway token for API call');
    } else if (legacyToken) {
      // Fallback to legacy token storage
      headers['Authorization'] = `Bearer ${legacyToken}`;
      console.log('[API Client] Using legacy token for API call');
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    apiKey?: string
  ): Promise<ApiResponse<T>> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:93',message:'makeRequest called',data:{endpoint,apiBaseUrl:API_BASE_URL,hasApiKey:!!apiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const url = `${API_BASE_URL}${MAAS_API_PREFIX}${endpoint}`;
    
    // #region agent log
    const logEndpoint = 'http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd';
    const logError = (location: string, message: string, data: any) => {
      try {
        fetch(logEndpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            location,
            message,
            data,
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'api-fix',
            hypothesisId: 'C'
          })
        }).catch(() => {
          try {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
            logs.push({location, message, data, timestamp: Date.now()});
            if (logs.length > 100) logs.shift();
            localStorage.setItem('debug_logs', JSON.stringify(logs));
          } catch(e) {}
        });
      } catch(e) {}
    };
    // #endregion
    
    const defaultOptions: RequestInit = {
      // Don't use credentials: 'include' to avoid CORS issues with wildcard origins
      // The API gateway should handle CORS properly without credentials
      headers: this.getAuthHeaders(apiKey),
      ...options
    };

    // Merge headers properly
    if (options.headers) {
      defaultOptions.headers = {
        ...defaultOptions.headers,
        ...options.headers
      };
    }

    logError('api-client:makeRequest:start', 'Making API request', {
      url,
      endpoint,
      method: options.method || 'GET',
      hasApiKey: !!apiKey,
      hasToken: !!secureTokenStorage.getAccessToken(),
      headers: Object.keys(defaultOptions.headers as Record<string, string> || {})
    });

    try {
      const response = await fetch(url, defaultOptions);
      
      logError('api-client:makeRequest:response', 'API response received', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Handle authentication errors by redirecting to central auth
      if (response.status === 401) {
        logError('api-client:makeRequest:401', 'Unauthorized - attempting refresh', {url});
        // Clear secure tokens
        secureTokenStorage.clear();
        
        // Try to refresh token before redirecting
        try {
          await centralAuth.refreshToken();
          logError('api-client:makeRequest:refreshSuccess', 'Token refreshed, retrying', {url});
          // Retry the request with new token
          return this.makeRequest(endpoint, options, apiKey);
        } catch (refreshError) {
          logError('api-client:makeRequest:refreshFailed', 'Token refresh failed', {
            url,
            error: refreshError instanceof Error ? refreshError.message : String(refreshError)
          });
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
        logError('api-client:makeRequest:notOk', 'Response not OK', {
          url,
          status: response.status,
          errorData
        });
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const jsonData = await response.json();
      logError('api-client:makeRequest:success', 'Request successful', {
        url,
        hasData: !!jsonData.data,
        hasError: !!jsonData.error
      });
      return jsonData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      logError('api-client:makeRequest:error', 'Request failed', {
        url,
        endpoint,
        errorName,
        errorMessage,
        errorStack: error instanceof Error ? error.stack?.substring(0, 200) : undefined,
        isNetworkError: errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch'),
        isCorsError: errorMessage.includes('CORS') || errorMessage.includes('cors'),
        isTimeout: errorMessage.includes('timeout') || errorMessage.includes('aborted')
      });
      
      console.error(`API request failed for ${endpoint}:`, error);
      
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
    return this.makeRequest<Memory>('/memory', {
      method: 'POST',
      body: JSON.stringify(memory)
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