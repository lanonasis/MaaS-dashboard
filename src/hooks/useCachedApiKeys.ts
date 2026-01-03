/**
 * React Query cached hook for API key operations
 * Provides automatic caching and mutation handling for API keys
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { apiClient } from '@/lib/api-client';

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

interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  expires_at?: string;
}

// Query keys factory
export const apiKeyKeys = {
  all: ['api-keys'] as const,
  list: () => [...apiKeyKeys.all, 'list'] as const,
  detail: (id: string) => [...apiKeyKeys.all, 'detail', id] as const,
};

/**
 * Hook for fetching API keys list with caching
 */
export function useCachedApiKeys() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: apiKeyKeys.list(),
    queryFn: async () => {
      const response = await apiClient.getApiKeys();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - API keys change more frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true, // Important for security-sensitive data
  });
}

/**
 * Hook for creating API keys with automatic cache invalidation
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyData: CreateApiKeyRequest) => {
      const response = await apiClient.createApiKey(keyData);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate API keys list to refetch
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.list() });
    },
  });
}

/**
 * Hook for revoking API keys with automatic cache invalidation
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiClient.revokeApiKey(keyId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate API keys list to refetch
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.list() });
    },
  });
}

/**
 * Hook to refresh API keys cache (for manual refresh)
 */
export function useRefreshApiKeys() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: apiKeyKeys.list() });
  };
}

/**
 * Get active API keys count from cache
 */
export function useActiveApiKeysCount() {
  const { data: apiKeys } = useCachedApiKeys();

  return apiKeys?.filter(key => key.is_active).length || 0;
}
