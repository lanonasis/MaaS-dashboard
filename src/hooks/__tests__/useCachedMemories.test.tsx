/**
 * Tests for useCachedMemories hook
 * Tests React Query integration for memory operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCachedMemories,
  useCachedMemorySearch,
  useCachedMemory,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
  memoryKeys,
} from '../useCachedMemories';

// Mock useSupabaseAuth
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: { access_token: 'test-token' },
    isLoading: false,
  }),
}));

// Mock API client
const mockSearchMemories = vi.fn();
const mockGetMemory = vi.fn();
const mockCreateMemory = vi.fn();
const mockUpdateMemory = vi.fn();
const mockDeleteMemory = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    searchMemories: (params: any) => mockSearchMemories(params),
    getMemory: (id: string) => mockGetMemory(id),
    createMemory: (memory: any) => mockCreateMemory(memory),
    updateMemory: (id: string, updates: any) => mockUpdateMemory(id, updates),
    deleteMemory: (id: string) => mockDeleteMemory(id),
  },
}));

interface WrapperProps {
  children: ReactNode;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCachedMemories', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  describe('memoryKeys factory', () => {
    it('generates correct query keys', () => {
      expect(memoryKeys.all).toEqual(['memories']);
      expect(memoryKeys.lists()).toEqual(['memories', 'list']);
      expect(memoryKeys.list({ limit: 10 })).toEqual(['memories', 'list', { limit: 10 }]);
      expect(memoryKeys.search({ query: 'test', limit: 5 })).toEqual([
        'memories',
        'search',
        { query: 'test', limit: 5 },
      ]);
      expect(memoryKeys.details()).toEqual(['memories', 'detail']);
      expect(memoryKeys.detail('mem-1')).toEqual(['memories', 'detail', 'mem-1']);
    });
  });

  describe('useCachedMemories hook', () => {
    it('fetches memories successfully', async () => {
      const mockMemories = [
        { id: 'mem-1', title: 'Memory 1', content: 'Content 1' },
        { id: 'mem-2', title: 'Memory 2', content: 'Content 2' },
      ];

      mockSearchMemories.mockResolvedValue({
        data: mockMemories,
        pagination: { total: 2, page: 1 },
      });

      const { result } = renderHook(() => useCachedMemories({ limit: 20 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        memories: mockMemories,
        pagination: { total: 2, page: 1 },
      });
      expect(mockSearchMemories).toHaveBeenCalledWith({
        query: '*',
        limit: 20,
      });
    });

    it('handles API errors', async () => {
      mockSearchMemories.mockResolvedValue({
        error: 'Failed to fetch memories',
      });

      const { result } = renderHook(() => useCachedMemories(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch memories');
    });

    it('returns empty array when no data', async () => {
      mockSearchMemories.mockResolvedValue({
        data: null,
        pagination: null,
      });

      const { result } = renderHook(() => useCachedMemories(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.memories).toEqual([]);
    });
  });

  describe('useCachedMemorySearch hook', () => {
    it('searches memories with query', async () => {
      const mockResults = [{ id: 'mem-1', title: 'Matching Memory' }];

      mockSearchMemories.mockResolvedValue({
        data: mockResults,
      });

      const { result } = renderHook(
        () => useCachedMemorySearch({ query: 'matching', limit: 10 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.memories).toEqual(mockResults);
      expect(mockSearchMemories).toHaveBeenCalledWith({
        query: 'matching',
        limit: 10,
        similarity_threshold: 0.7,
      });
    });

    it('does not fetch when query is null', async () => {
      const { result } = renderHook(() => useCachedMemorySearch(null), {
        wrapper: createWrapper(queryClient),
      });

      // Query should not be enabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSearchMemories).not.toHaveBeenCalled();
    });

    it('uses custom similarity threshold', async () => {
      mockSearchMemories.mockResolvedValue({ data: [] });

      renderHook(
        () => useCachedMemorySearch({ query: 'test', similarity_threshold: 0.9 }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(mockSearchMemories).toHaveBeenCalledWith({
          query: 'test',
          limit: 10,
          similarity_threshold: 0.9,
        });
      });
    });
  });

  describe('useCachedMemory hook', () => {
    it('fetches single memory by ID', async () => {
      const mockMemory = { id: 'mem-1', title: 'Test Memory', content: 'Content' };

      mockGetMemory.mockResolvedValue({ data: mockMemory });

      const { result } = renderHook(() => useCachedMemory('mem-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMemory);
      expect(mockGetMemory).toHaveBeenCalledWith('mem-1');
    });

    it('does not fetch when ID is null', async () => {
      const { result } = renderHook(() => useCachedMemory(null), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetMemory).not.toHaveBeenCalled();
    });

    it('handles fetch error', async () => {
      mockGetMemory.mockResolvedValue({ error: 'Memory not found' });

      const { result } = renderHook(() => useCachedMemory('invalid-id'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Memory not found');
    });
  });

  describe('useCreateMemory hook', () => {
    it('creates memory successfully', async () => {
      const newMemory = {
        title: 'New Memory',
        content: 'New Content',
        type: 'context' as const,
        tags: ['test'],
      };

      const createdMemory = { id: 'mem-new', ...newMemory };
      mockCreateMemory.mockResolvedValue({ data: createdMemory });

      const { result } = renderHook(() => useCreateMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync(newMemory);

      expect(mockCreateMemory).toHaveBeenCalledWith(newMemory);
    });

    it('handles creation error', async () => {
      mockCreateMemory.mockResolvedValue({ error: 'Failed to create' });

      const { result } = renderHook(() => useCreateMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({ title: 'Test', content: 'Test' })
      ).rejects.toThrow('Failed to create');
    });
  });

  describe('useUpdateMemory hook', () => {
    it('updates memory successfully', async () => {
      const updates = { title: 'Updated Title' };
      const updatedMemory = { id: 'mem-1', ...updates };

      mockUpdateMemory.mockResolvedValue({ data: updatedMemory });

      const { result } = renderHook(() => useUpdateMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({ id: 'mem-1', updates });

      expect(mockUpdateMemory).toHaveBeenCalledWith('mem-1', updates);
    });

    it('handles update error', async () => {
      mockUpdateMemory.mockResolvedValue({ error: 'Update failed' });

      const { result } = renderHook(() => useUpdateMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(
        result.current.mutateAsync({ id: 'mem-1', updates: { title: 'New' } })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useDeleteMemory hook', () => {
    it('deletes memory successfully', async () => {
      mockDeleteMemory.mockResolvedValue({ data: null });

      const { result } = renderHook(() => useDeleteMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync('mem-1');

      expect(mockDeleteMemory).toHaveBeenCalledWith('mem-1');
    });

    it('handles delete error', async () => {
      mockDeleteMemory.mockResolvedValue({ error: 'Delete failed' });

      const { result } = renderHook(() => useDeleteMemory(), {
        wrapper: createWrapper(queryClient),
      });

      await expect(result.current.mutateAsync('mem-1')).rejects.toThrow(
        'Delete failed'
      );
    });
  });
});
