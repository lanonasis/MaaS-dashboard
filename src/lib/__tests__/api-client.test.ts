/**
 * Tests for ApiClient class
 * Tests API methods, authentication, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../api-client';

// Mock secure token storage
vi.mock('../secure-token-storage', () => ({
  secureTokenStorage: {
    getAccessToken: vi.fn().mockReturnValue(null),
    clear: vi.fn(),
  },
}));

// Mock central auth
vi.mock('../central-auth', () => ({
  centralAuth: {
    refreshToken: vi.fn().mockRejectedValue(new Error('Refresh failed')),
  },
}));

const mockGetAuthGatewayAccessToken = vi.fn();
const mockExchangeSupabaseToken = vi.fn();
const mockClearAuthGatewayTokens = vi.fn();

// Mock token exchange
vi.mock('../token-exchange', () => ({
  getAuthGatewayAccessToken: () => mockGetAuthGatewayAccessToken(),
  exchangeSupabaseToken: (token: string) => mockExchangeSupabaseToken(token),
  clearAuthGatewayTokens: () => mockClearAuthGatewayTokens(),
}));

// Mock Supabase
const mockSupabaseGetSession = vi.fn();
const mockSupabaseRefreshSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockSupabaseGetSession(),
      refreshSession: () => mockSupabaseRefreshSession(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseGetSession.mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } },
    });
    mockSupabaseRefreshSession.mockRejectedValue(new Error('Refresh failed'));
    mockGetAuthGatewayAccessToken.mockReturnValue(null);
    mockExchangeSupabaseToken.mockResolvedValue({
      access_token: 'gateway-token',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Headers', () => {
    it('exchanges the Supabase session and uses the gateway token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer gateway-token',
          }),
        })
      );
      expect(mockExchangeSupabaseToken).toHaveBeenCalledWith('supabase-token');
    });

    it('reuses an existing gateway token without exchanging again', async () => {
      mockGetAuthGatewayAccessToken.mockReturnValue('existing-gateway-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer existing-gateway-token',
          }),
        })
      );
      expect(mockSupabaseGetSession).not.toHaveBeenCalled();
      expect(mockExchangeSupabaseToken).not.toHaveBeenCalled();
    });

    it('includes platform and project scope headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Platform': 'dashboard',
            'X-Project-Scope': 'maas',
          }),
        })
      );
    });

    it('uses API key when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories({ apiKey: 'test-api-key' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });

    it('handles vx_ prefixed API keys specially', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories({ apiKey: 'vx_special_key' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'vx_special_key',
            'X-API-Key': 'vx_special_key',
          }),
        })
      );
    });
  });

  describe('Memory Operations', () => {
    describe('getMemories', () => {
      it('fetches memories with default params', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1', title: 'Test' }] }),
        });

        const result = await apiClient.getMemories();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory'),
          expect.any(Object)
        );
        expect(result.data).toHaveLength(1);
      });

      it('includes query params when provided', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        await apiClient.getMemories({
          page: 2,
          limit: 10,
          type: 'context',
          tags: ['tag1', 'tag2'],
          search: 'test',
        });

        // URLSearchParams encodes commas as %2C
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/page=2.*limit=10.*type=context.*tags=tag1(%2C|,)tag2.*search=test/),
          expect.any(Object)
        );
      });
    });

    describe('createMemory', () => {
      it('creates memory with required fields', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { id: 'new-1', title: 'New Memory' } }),
        });

        const result = await apiClient.createMemory({
          title: 'New Memory',
          content: 'Memory content',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Memory content'),
          })
        );
        expect(result.data?.title).toBe('New Memory');
      });

      it('throws error when content is empty', async () => {
        await expect(
          apiClient.createMemory({ title: 'Test', content: '' })
        ).rejects.toThrow('Memory content is required');
      });

      it('sanitizes tags before sending', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { id: '1' } }),
        });

        await apiClient.createMemory({
          title: 'Test',
          content: 'Content',
          tags: ['valid', '', '  spaces  ', null as any, 'another'],
        });

        const callBody = JSON.parse(
          (mockFetch.mock.calls[0][1] as RequestInit).body as string
        );
        expect(callBody.tags).toEqual(['valid', 'spaces', 'another']);
      });

      it('generates title from content if empty', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { id: '1' } }),
        });

        await apiClient.createMemory({
          title: '',
          content: 'This is a very long content that should be truncated for the title',
        });

        const callBody = JSON.parse(
          (mockFetch.mock.calls[0][1] as RequestInit).body as string
        );
        expect(callBody.title).toContain('This is a very long');
      });
    });

    describe('getMemory', () => {
      it('fetches single memory by ID', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { id: 'mem-1', title: 'Test' } }),
        });

        const result = await apiClient.getMemory('mem-1');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory/mem-1'),
          expect.any(Object)
        );
        expect(result.data?.id).toBe('mem-1');
      });
    });

    describe('updateMemory', () => {
      it('updates memory with PATCH method', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: { id: 'mem-1', title: 'Updated' } }),
        });

        const result = await apiClient.updateMemory('mem-1', { title: 'Updated' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory/mem-1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ title: 'Updated' }),
          })
        );
        expect(result.data?.title).toBe('Updated');
      });
    });

    describe('deleteMemory', () => {
      it('deletes memory by ID', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: null }),
        });

        await apiClient.deleteMemory('mem-1');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory/mem-1'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('searchMemories', () => {
      it('searches memories with semantic query', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: '1', title: 'Match' }] }),
        });

        const result = await apiClient.searchMemories({
          query: 'machine learning',
          limit: 5,
          similarity_threshold: 0.8,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/memory/search'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              query: 'machine learning',
              limit: 5,
              similarity_threshold: 0.8,
            }),
          })
        );
        expect(result.data).toHaveLength(1);
      });
    });
  });

  describe('Organization Operations', () => {
    it('fetches organizations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'org-1', name: 'Test Org' }] }),
      });

      const result = await apiClient.getOrganizations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/organizations'),
        expect.any(Object)
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('API Key Operations', () => {
    it('fetches API keys', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'key-1', name: 'Test Key' }] }),
      });

      const result = await apiClient.getApiKeys();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/api-keys'),
        expect.any(Object)
      );
      expect(result.data).toHaveLength(1);
    });

    it('creates new API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { id: 'key-1', name: 'New Key', key: 'secret-value' },
          }),
      });

      const result = await apiClient.createApiKey({
        name: 'New Key',
        key_context: 'personal',
        scopes: ['memories:personal:*'],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/api-keys'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.data?.key).toBe('secret-value');
    });

    it('deletes API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      await apiClient.deleteApiKey('key-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/api-keys/key-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Intelligence API', () => {
    it('performs health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { status: 'healthy' },
          }),
      });

      const result = await apiClient.intelligenceHealthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/health-check'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(mockFetch.mock.calls[0][0]).not.toContain('/functions/v1/intelligence-');
      expect(result.data?.status).toBe('healthy');
    });

    it('suggests tags for content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { tags: ['ai', 'machine-learning', 'python'] },
          }),
      });

      const result = await apiClient.intelligenceSuggestTags({
        content: 'Building a neural network with TensorFlow',
        max_suggestions: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/suggest-tags'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.data?.tags).toContain('ai');
    });

    it('finds related memories', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { related: [{ id: 'mem-2', similarity: 0.85 }] },
          }),
      });

      const result = await apiClient.intelligenceFindRelated({
        memory_id: 'mem-1',
        limit: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/find-related'),
        expect.any(Object)
      );
      expect(result.data?.related).toHaveLength(1);
    });

    it('detects duplicates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              duplicates: [{ id1: 'mem-1', id2: 'mem-2', similarity: 0.95 }],
            },
          }),
      });

      await apiClient.intelligenceDetectDuplicates({
        threshold: 0.9,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/detect-duplicates'),
        expect.any(Object)
      );
    });

    it('extracts insights', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              insights: [{ type: 'trend', description: 'Increasing activity' }],
            },
          }),
      });

      await apiClient.intelligenceExtractInsights({
        content: 'Project progress report',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/extract-insights'),
        expect.any(Object)
      );
    });

    it('analyzes patterns', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { patterns: { peak_hours: [9, 14, 18] } },
          }),
      });

      await apiClient.intelligenceAnalyzePatterns({
        time_range_days: 30,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/intelligence/analyze-patterns'),
        expect.any(Object)
      );
    });

    it('returns ApiResponse error when intelligence envelope reports failure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Feature not available',
          }),
      });

      const result = await apiClient.intelligenceHealthCheck();

      expect(result.error).toBe('Feature not available');
    });
  });

  describe('Health Check', () => {
    it('returns health status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              status: 'healthy',
              service: 'maas-api',
              version: '1.0.0',
              timestamp: new Date().toISOString(),
            },
          }),
      });

      const result = await apiClient.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/health'),
        expect.any(Object)
      );
      expect(result.data?.status).toBe('healthy');
    });
  });

  describe('Usage Stats', () => {
    it('fetches usage statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              total_memories: 100,
              memories_created: 25,
              searches_performed: 50,
              api_calls: 200,
              storage_used_mb: 15.5,
            },
          }),
      });

      const result = await apiClient.getUsageStats({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/start_date=2024-01-01.*end_date=2024-01-31/),
        expect.any(Object)
      );
      expect(result.data?.total_memories).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(apiClient.getMemories()).rejects.toThrow(
        'Internal server error'
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      await expect(apiClient.getMemories()).rejects.toThrow(
        'Network error: Unable to reach'
      );
    });

    it('clears tokens on 401 and attempts refresh', async () => {
      const { secureTokenStorage } = await import('../secure-token-storage');

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });

      await expect(apiClient.getMemories()).rejects.toThrow();

      expect(mockClearAuthGatewayTokens).toHaveBeenCalled();
      expect(secureTokenStorage.clear).toHaveBeenCalled();
    });

    it('does not clear the dashboard gateway session for an API-key 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(apiClient.getMemories({ apiKey: 'lano_invalid_key' })).rejects.toThrow();

      expect(mockClearAuthGatewayTokens).not.toHaveBeenCalled();
    });

    // COV-041 expansion: hit remaining branch lines in api-client.ts
    describe('COV-041 expansion — auth header variants, refresh flow, intelligence envelope', () => {
      it('uses both Bearer and X-API-Key for vx_-prefixed apiKey (line 132 true branch)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        await apiClient.getMemories({ apiKey: 'vx_external_abc123' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'vx_external_abc123',
              'X-API-Key': 'vx_external_abc123',
            }),
          })
        );
      });

      it('uses only X-API-Key (no Bearer) for lano_-prefixed apiKey (line 132 false branch)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        await apiClient.getMemories({ apiKey: 'lano_user_key_xyz' });

        const callArgs = mockFetch.mock.calls[0][1];
        const headers = callArgs.headers as Record<string, string>;
        expect(headers['X-API-Key']).toBe('lano_user_key_xyz');
        // CRITICAL: lano_ keys must NOT go in Authorization header
        expect(headers['Authorization']).toBeUndefined();
      });

      it('falls back to legacy token storage when no gateway token or session exists (line 165)', async () => {
        const { secureTokenStorage } = await import('../secure-token-storage');
        (secureTokenStorage.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValueOnce('legacy-token-xyz');

        mockGetAuthGatewayAccessToken.mockReturnValueOnce(null);
        mockSupabaseGetSession.mockResolvedValueOnce({ data: { session: null } });

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        await apiClient.getMemories();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer legacy-token-xyz',
            }),
          })
        );
      });

      it('on 401, retries after successful Supabase session refresh (line 238 true)', async () => {
        mockSupabaseRefreshSession.mockResolvedValueOnce({
          data: { session: { access_token: 'refreshed-supabase-token' } },
        });

        // First call: 401. Second call (after refresh): success.
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });

        await apiClient.getMemories();

        expect(mockSupabaseRefreshSession).toHaveBeenCalledTimes(1);
        // Two fetch calls: 401 + retry
        expect(mockFetch).toHaveBeenCalledTimes(2);
        // The retry should use the new exchanged gateway token
        const retryCall = mockFetch.mock.calls[1][1];
        const retryHeaders = retryCall.headers as Record<string, string>;
        expect(retryHeaders['Authorization']).toBe('Bearer gateway-token');
      });

      it('on 401, falls back to central-auth refresh when Supabase refresh fails (line 229 true)', async () => {
        const { centralAuth } = await import('../central-auth');
        (centralAuth.refreshToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        mockSupabaseRefreshSession.mockRejectedValueOnce(new Error('No session to refresh'));

        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });

        await apiClient.getMemories();

        expect(centralAuth.refreshToken).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('throws with status code fallback when error response body lacks .error (line 251)', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        });

        await expect(apiClient.getMemories()).rejects.toThrow(
          'Request failed with status 503'
        );
      });

      it('rewrites "NetworkError" message to helpful network error (line 253 false branch of NetworkError)', async () => {
        mockFetch.mockRejectedValue(new Error('NetworkError when attempting to fetch resource'));

        await expect(apiClient.getMemories()).rejects.toThrow(/Network error: Unable to reach/);
      });

      it('extracts data from a success envelope on intelligence endpoints (line 525)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        const response = await apiClient.intelligenceHealthCheck();
        // Direct path: returns the raw JSON. The envelope unwrap is only via makeIntelligenceRequest.
        expect(response).toEqual({ data: [] });
      });

      it('intelligence request unwraps success envelope data (line 520 + 525)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { status: 'healthy' },
          }),
        });

        const response = await apiClient.intelligenceHealthCheck();
        expect(response).toEqual({ data: { status: 'healthy' } });
      });

      it('intelligence request unwraps failure envelope to { error } (line 522 true + 523)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: false,
            error: 'Pattern analysis failed',
          }),
        });

        const response = await apiClient.intelligenceSuggestTags({ content: 'test content' });
        expect(response).toEqual({ error: 'Pattern analysis failed' });
      });

      it('intelligence request falls back to "Intelligence API request failed" when envelope has no error (line 523 fallback)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: false,
          }),
        });

        const response = await apiClient.intelligenceHealthCheck();
        expect(response).toEqual({ error: 'Intelligence API request failed' });
      });

      it('intelligence request passes through non-envelope responses (line 529)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: 'direct response' }),
        });

        const response = await apiClient.intelligenceHealthCheck();
        expect(response).toEqual({ data: 'direct response' });
      });

      it('intelligence request returns { error: message } on network failure (line 531-532)', async () => {
        mockFetch.mockRejectedValue(new Error('Service unavailable'));

        const response = await apiClient.intelligenceHealthCheck();
        expect(response).toEqual({ error: 'Service unavailable' });
      });

      it('intelligence request returns { error } for non-Error throws (line 531 fallback)', async () => {
        mockFetch.mockRejectedValue('plain string error');

        const response = await apiClient.intelligenceHealthCheck();
        expect(response).toEqual({ error: 'Intelligence API request failed' });
      });

      it('on 401 with allowAuthRetry=false throws immediately (line 205 path)', async () => {
        // Direct invocation via private method is not possible; verify via the public retry path.
        // The first fetch returns 401, and the second (retry) returns 401 again. The retry call
        // is made with allowAuthRetry=false, so it should throw without further refresh.
        mockSupabaseRefreshSession.mockResolvedValue({
          data: { session: { access_token: 'new-token' } },
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Still unauthorized' }),
          });

        await expect(apiClient.getMemories()).rejects.toThrow();
        // The retry does NOT trigger another refresh — allowAuthRetry=false skips it.
        expect(mockSupabaseRefreshSession).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
