/**
 * Query Persistence Configuration
 *
 * Persists React Query cache to IndexedDB for instant data on page reload.
 * Selectively excludes sensitive data (API keys, auth tokens) from persistence.
 */

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const IDB_KEY = 'lanonasis-dashboard-query-cache';

/**
 * Query keys that should NOT be persisted (security-sensitive)
 */
const EXCLUDED_QUERY_KEYS = [
  'api-keys',      // API keys - always fetch fresh
  'auth',          // Authentication data
  'session',       // Session tokens
  'profile',       // User profile (may contain sensitive info)
] as const;

/**
 * Check if a query should be persisted
 * Uses exact element matching to avoid false positives
 * (e.g., 'user-api-keys-settings' won't be excluded when checking for 'api-keys')
 */
function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  // Check if any element in the query key matches an excluded key
  return !queryKey.some(
    (key) => typeof key === 'string' && EXCLUDED_QUERY_KEYS.includes(key as typeof EXCLUDED_QUERY_KEYS[number])
  );
}

/**
 * Filter persisted client to remove sensitive queries
 */
function filterPersistedClient(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.filter(query =>
        shouldPersistQuery(query.queryKey)
      ),
    },
  };
}

/**
 * Create an IndexedDB persister for React Query
 *
 * Features:
 * - Persists to IndexedDB for large storage capacity
 * - Filters out sensitive data before persistence
 * - Handles storage quota errors gracefully
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const filteredClient = filterPersistedClient(client);
        await set(IDB_KEY, filteredClient);
      } catch (error) {
        // Handle quota exceeded or other storage errors
        console.warn('[QueryPersister] Failed to persist cache:', error);

        // Try to clear old cache and retry with fresh data
        try {
          await del(IDB_KEY);
        } catch {
          // Ignore cleanup errors
        }
      }
    },

    restoreClient: async () => {
      try {
        return await get<PersistedClient>(IDB_KEY);
      } catch (error) {
        console.warn('[QueryPersister] Failed to restore cache:', error);
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await del(IDB_KEY);
      } catch (error) {
        console.warn('[QueryPersister] Failed to remove cache:', error);
      }
    },
  };
}

/**
 * Cache buster key - increment to invalidate all persisted caches
 * Useful when making breaking changes to data structures
 */
export const CACHE_BUSTER_VERSION = 1;

/**
 * Maximum age for persisted queries (24 hours)
 * Queries older than this will be refetched
 */
export const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;

/**
 * Clear the persisted cache (useful for logout)
 */
export async function clearPersistedCache(): Promise<void> {
  try {
    await del(IDB_KEY);
    console.log('[QueryPersister] Cache cleared');
  } catch (error) {
    console.warn('[QueryPersister] Failed to clear cache:', error);
  }
}
