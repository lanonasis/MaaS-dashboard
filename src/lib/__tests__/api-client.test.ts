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

// Mock token exchange
vi.mock('../token-exchange', () => ({
  getAuthGatewayAccessToken: vi.fn().mockReturnValue(null),
}));

// Mock Supabase
const mockSupabaseGetSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockSupabaseGetSession(),
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Headers', () => {
    it('uses Supabase session token when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getMemories();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer supabase-token',
          }),
        })
      );
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
            Authorization: 'Bearer test-api-key',
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
            data: { id: 'key-1', name: 'New Key', secret: 'secret-value' },
          }),
      });

      const result = await apiClient.createApiKey({
        name: 'New Key',
        permissions: ['read', 'write'],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/api-keys'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.data?.secret).toBe('secret-value');
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
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const result = await apiClient.intelligenceHealthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-health-check'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.data?.status).toBe('healthy');
    });

    it('suggests tags for content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ tags: ['ai', 'machine-learning', 'python'] }),
      });

      const result = await apiClient.intelligenceSuggestTags({
        content: 'Building a neural network with TensorFlow',
        max_suggestions: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-suggest-tags'),
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
          Promise.resolve({ related: [{ id: 'mem-2', similarity: 0.85 }] }),
      });

      const result = await apiClient.intelligenceFindRelated({
        memory_id: 'mem-1',
        limit: 5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-find-related'),
        expect.any(Object)
      );
      expect(result.data?.related).toHaveLength(1);
    });

    it('detects duplicates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            duplicates: [{ id1: 'mem-1', id2: 'mem-2', similarity: 0.95 }],
          }),
      });

      const result = await apiClient.intelligenceDetectDuplicates({
        threshold: 0.9,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-detect-duplicates'),
        expect.any(Object)
      );
    });

    it('extracts insights', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            insights: [{ type: 'trend', description: 'Increasing activity' }],
          }),
      });

      const result = await apiClient.intelligenceExtractInsights({
        content: 'Project progress report',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-extract-insights'),
        expect.any(Object)
      );
    });

    it('analyzes patterns', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            patterns: { peak_hours: [9, 14, 18] },
          }),
      });

      const result = await apiClient.intelligenceAnalyzePatterns({
        time_range_days: 30,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/intelligence-analyze-patterns'),
        expect.any(Object)
      );
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

      expect(secureTokenStorage.clear).toHaveBeenCalled();
    });
  });
});
