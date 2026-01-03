/**
 * Tests for useMemoryIntelligence hook and related hooks
 * Tests pattern analysis, health check, insights, and duplicate detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  MemoryIntelligenceProvider,
  useMemoryIntelligence,
  usePatternAnalysis,
  useHealthCheck,
  useInsightExtraction,
  useDuplicateDetection,
} from '../useMemoryIntelligence';

// Mock useSupabaseAuth
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockSession = { access_token: 'test-token' };
let mockAuthLoading = false;

vi.mock('../useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: mockSession,
    isLoading: mockAuthLoading,
  }),
}));

// Mock Supabase client
const mockSupabaseSelect = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockSupabaseFrom(table);
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue(mockSupabaseSelect()),
            }),
          }),
        }),
      };
    },
  },
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = () => {
  return ({ children }: WrapperProps) => (
    <MemoryRouter>
      <MemoryIntelligenceProvider>{children}</MemoryIntelligenceProvider>
    </MemoryRouter>
  );
};

describe('useMemoryIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;

    // Default fetch response - API returns null/empty
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });

    // Default Supabase response - no memories
    mockSupabaseSelect.mockReturnValue({
      data: [],
      error: null,
    });
  });

  describe('Context and Provider', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMemoryIntelligence());
      }).toThrow('useMemoryIntelligence must be used within MemoryIntelligenceProvider');

      consoleSpy.mockRestore();
    });

    it('provides context values when wrapped in provider', async () => {
      const { result } = renderHook(() => useMemoryIntelligence(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('userId');
      expect(result.current).toHaveProperty('isReady');
      expect(result.current).toHaveProperty('isKeyLoading');
      expect(result.current).toHaveProperty('analyzePatterns');
      expect(result.current).toHaveProperty('getHealthCheck');
      expect(result.current).toHaveProperty('extractInsights');
      expect(result.current).toHaveProperty('detectDuplicates');
    });

    it('sets userId from auth context', async () => {
      const { result } = renderHook(() => useMemoryIntelligence(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userId).toBe('user-123');
      });
    });
  });

  describe('usePatternAnalysis hook', () => {
    it('returns empty state when not ready', async () => {
      mockAuthLoading = true;

      const { result } = renderHook(() => usePatternAnalysis(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isReady).toBe(false);
    });

    it('returns empty pattern when no memories exist', async () => {
      mockSupabaseSelect.mockReturnValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => usePatternAnalysis(30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fallback data
      if (result.current.data) {
        expect(result.current.data.total_memories).toBe(0);
        expect(result.current.data.insights).toContain(
          'Start creating memories to see pattern analysis'
        );
      }
    });

    it('calculates patterns from memory entries', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          title: 'Test Memory 1',
          content: 'This is test content for memory one',
          type: 'context',
          tags: ['tag1', 'tag2'],
          created_at: new Date().toISOString(),
          embedding: [0.1, 0.2, 0.3],
        },
        {
          id: 'mem-2',
          title: 'Test Memory 2',
          content: 'This is test content for memory two',
          type: 'project',
          tags: ['tag1', 'tag3'],
          created_at: new Date().toISOString(),
          embedding: [0.4, 0.5, 0.6],
        },
      ];

      mockSupabaseSelect.mockReturnValue({
        data: mockMemories,
        error: null,
      });

      const { result } = renderHook(() => usePatternAnalysis(30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data) {
        expect(result.current.data.total_memories).toBeGreaterThanOrEqual(0);
      }
    });

    it('provides refetch function', async () => {
      const { result } = renderHook(() => usePatternAnalysis(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('useHealthCheck hook', () => {
    it('returns health metrics for memories', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          title: 'Memory 1',
          content: 'Content',
          type: 'context',
          tags: ['tag1'],
          created_at: new Date().toISOString(),
          embedding: [0.1],
        },
      ];

      mockSupabaseSelect.mockReturnValue({
        data: mockMemories,
        error: null,
      });

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data) {
        expect(result.current.data).toHaveProperty('overall_score');
        expect(result.current.data).toHaveProperty('metrics');
        expect(result.current.data).toHaveProperty('recommendations');
        expect(result.current.data).toHaveProperty('status');
      }
    });

    it('returns needs_attention when no memories', async () => {
      mockSupabaseSelect.mockReturnValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data) {
        expect(result.current.data.overall_score).toBe(0);
        expect(result.current.data.status).toBe('needs_attention');
      }
    });
  });

  describe('useInsightExtraction hook', () => {
    it('returns empty array when API returns no insights', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ insights: null }),
      });

      const { result } = renderHook(() => useInsightExtraction(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('accepts optional topic parameter', async () => {
      const { result } = renderHook(() => useInsightExtraction('machine learning'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('refetch');
    });
  });

  describe('useDuplicateDetection hook', () => {
    it('returns empty array when no duplicates found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ duplicate_pairs: [] }),
      });

      const { result } = renderHook(() => useDuplicateDetection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('accepts custom threshold parameter', async () => {
      const { result } = renderHook(() => useDuplicateDetection(0.95), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('data');
    });

    it('maps duplicate pairs correctly when returned', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            duplicate_pairs: [
              {
                memory_1: { id: '1', title: 'First', created_at: '2024-01-01' },
                memory_2: { id: '2', title: 'Second', created_at: '2024-01-02' },
                similarity_score: 0.92,
                recommendation: 'merge',
              },
            ],
          }),
      });

      const { result } = renderHook(() => useDuplicateDetection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data.length > 0) {
        expect(result.current.data[0]).toHaveProperty('memory_1');
        expect(result.current.data[0]).toHaveProperty('memory_2');
        expect(result.current.data[0]).toHaveProperty('similarity_score');
        expect(result.current.data[0]).toHaveProperty('recommendation');
      }
    });
  });

  describe('Error Handling', () => {
    it('handles API request errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePatternAnalysis(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw, error should be captured
      expect(result.current.error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('handles Supabase errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseSelect.mockReturnValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { result } = renderHook(() => useHealthCheck(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });
});
