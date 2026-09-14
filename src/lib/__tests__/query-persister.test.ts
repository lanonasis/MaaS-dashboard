/**
 * Tests for query-persister module
 *
 * Covers:
 * - shouldPersistQuery logic (excluded-key matcher at line 31) via filterPersistedClient
 * - clearPersistedCache function (lines 111-118)
 * - IDB quota error path in persistClient (lines 64-73)
 * - restoreClient error handling (lines 80-83)
 * - removeClient error handling (lines 89-91)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createIDBPersister,
  clearPersistedCache,
  CACHE_BUSTER_VERSION,
  MAX_CACHE_AGE,
} from '../query-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

// ---------------------------------------------------------------------------
// Mock idb-keyval
// ---------------------------------------------------------------------------
const idbKeyvalStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbKeyvalStore.get(key) as unknown),
  set: vi.fn(async (key: string, value: unknown) => {
    idbKeyvalStore.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    idbKeyvalStore.delete(key);
  }),
}));

// Helper to create a minimal persisted client for testing
function makeClient(queries: { queryKey: string[]; state: Record<string, unknown> }[]): PersistedClient {
  return {
    clientState: {
      queries: queries.map((q) => ({
        queryKey: q.queryKey,
        queryHash: JSON.stringify(q.queryKey),
        state: q.state as any,
      })),
      mutations: [],
    },
    timestamp: Date.now(),
    buster: 'test',
  };
}

// ---------------------------------------------------------------------------
// filterPersistedClient — exercises shouldPersistQuery (line 31)
// ---------------------------------------------------------------------------
describe('filterPersistedClient (exercises shouldPersistQuery)', () => {
  it('keeps non-excluded queries', async () => {
    const persister = createIDBPersister();
    const client = makeClient([
      { queryKey: ['users'], state: { data: { name: 'Alice' } } },
    ]);

    await persister.persistClient(client);
    const restored = await persister.restoreClient();
    expect(restored).toBeDefined();
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0].queryKey).toEqual(['users']);
  });
});

// ---------------------------------------------------------------------------
// createIDBPersister — round-trip + filtering
// ---------------------------------------------------------------------------
describe('createIDBPersister', () => {
  beforeEach(() => {
    idbKeyvalStore.clear();
    vi.clearAllMocks();
  });

  it('persists and restores a client', async () => {
    const persister = createIDBPersister();
    const client = makeClient([
      { queryKey: ['users'], state: { data: { name: 'Alice' } } },
    ]);

    await persister.persistClient(client);
    const restored = await persister.restoreClient();
    expect(restored).toBeDefined();
    expect(restored?.timestamp).toBe(client.timestamp);
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0].queryKey).toEqual(['users']);
  });

  it('filters out excluded keys before persisting', async () => {
    const persister = createIDBPersister();
    const client = makeClient([
      { queryKey: ['users'], state: { data: { name: 'Alice' } } },
      { queryKey: ['api-keys'], state: { data: ['secret-key'] } },
      { queryKey: ['auth'], state: { data: { token: 'abc' } } },
    ]);

    await persister.persistClient(client);
    const restored = await persister.restoreClient();
    expect(restored).toBeDefined();
    // Only the non-excluded query should remain
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0].queryKey).toEqual(['users']);
  });

  it('filters out all four excluded key types', async () => {
    const persister = createIDBPersister();
    const client = makeClient([
      { queryKey: ['api-keys'], state: { data: 'k' } },
      { queryKey: ['auth'], state: { data: 'a' } },
      { queryKey: ['session'], state: { data: 's' } },
      { queryKey: ['profile'], state: { data: 'p' } },
    ]);

    await persister.persistClient(client);
    const restored = await persister.restoreClient();
    expect(restored?.clientState.queries).toHaveLength(0);
  });

  it('handles IDB quota error gracefully during persist', async () => {
    const idbKeyval = await import('idb-keyval');
    const mockSet = vi.mocked(idbKeyval.set);
    mockSet.mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const persister = createIDBPersister();
    const client = makeClient([{ queryKey: ['users'], state: { data: 'x' } }]);

    await persister.persistClient(client);

    // Should have called del to try clearing old cache
    const mockDel = vi.mocked(idbKeyval.del);
    expect(mockDel).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('handles errors during restore gracefully', async () => {
    const idbKeyval = await import('idb-keyval');
    const mockGet = vi.mocked(idbKeyval.get);
    mockGet.mockRejectedValueOnce(new Error('IDB error'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const persister = createIDBPersister();
    const result = await persister.restoreClient();
    expect(result).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('removeClient deletes the IDB key', async () => {
    const persister = createIDBPersister();
    await persister.removeClient();
    const idbKeyval = await import('idb-keyval');
    const mockDel = vi.mocked(idbKeyval.del);
    expect(mockDel).toHaveBeenCalledTimes(1);
  });

  it('removeClient handles errors gracefully', async () => {
    const idbKeyval = await import('idb-keyval');
    const mockDel = vi.mocked(idbKeyval.del);
    mockDel.mockRejectedValueOnce(new Error('del failed'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const persister = createIDBPersister();
    await persister.removeClient();
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// clearPersistedCache
// ---------------------------------------------------------------------------
describe('clearPersistedCache', () => {
  beforeEach(() => {
    idbKeyvalStore.clear();
    vi.clearAllMocks();
  });

  it('deletes the cache key from IDB', async () => {
    idbKeyvalStore.set('lanonasis-dashboard-query-cache', { fake: true });
    await clearPersistedCache();
    expect(idbKeyvalStore.has('lanonasis-dashboard-query-cache')).toBe(false);
    const idbKeyval = await import('idb-keyval');
    const mockDel = vi.mocked(idbKeyval.del);
    expect(mockDel).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully', async () => {
    const idbKeyval = await import('idb-keyval');
    const mockDel = vi.mocked(idbKeyval.del);
    mockDel.mockRejectedValueOnce(new Error('Clear failed'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await clearPersistedCache();
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
describe('exports', () => {
  it('exposes CACHE_BUSTER_VERSION', () => {
    expect(CACHE_BUSTER_VERSION).toBe(1);
  });

  it('exposes MAX_CACHE_AGE', () => {
    expect(MAX_CACHE_AGE).toBe(24 * 60 * 60 * 1000);
  });
});
