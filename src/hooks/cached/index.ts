/**
 * Cached React Query hooks
 * Re-exports all cached data hooks for easy importing
 */

// Memory operations
export {
  useCachedMemories,
  useCachedMemorySearch,
  useCachedMemory,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
  usePrefetchMemories,
  memoryKeys,
} from '../useCachedMemories';

// Profile operations
export {
  useCachedProfile,
  useUpdateProfile,
  useRefreshProfile,
  profileKeys,
} from '../useCachedProfile';

// API Keys operations
export {
  useCachedApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useRefreshApiKeys,
  useActiveApiKeysCount,
  apiKeyKeys,
} from '../useCachedApiKeys';

// Intelligence operations (uses Memory Intelligence SDK with local fallback)
export {
  useCachedHealthCheck,
  useCachedPatternAnalysis,
  useCachedDuplicates,
  useCachedInsights,
  useRefreshIntelligence,
  usePrefetchIntelligence,
  intelligenceKeys,
} from '../useCachedIntelligence';

// Re-export types
export type {
  HealthCheckResult,
  PatternAnalysis,
  DuplicatePair,
  InsightResult,
} from '../useCachedIntelligence';
