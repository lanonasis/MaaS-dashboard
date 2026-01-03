/**
 * React Query cached hook for user profile operations
 * Provides automatic caching and background refetching for profile data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

// Query keys factory for consistent key generation
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
};

/**
 * Fetch profile from Supabase
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Hook for fetching user profile with caching
 */
export function useCachedProfile() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: user?.id ? profileKeys.detail(user.id) : ['disabled'],
    queryFn: async () => {
      if (!user?.id) return null;

      const profile = await fetchProfile(user.id);

      // If no profile exists, return a default profile from user metadata
      if (!profile) {
        return {
          id: user.id,
          email: user.email || null,
          full_name: user.user_metadata?.full_name || null,
          company_name: null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: user.user_metadata?.role || 'user',
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }

      return profile;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - profiles don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for updating user profile with automatic cache invalidation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if profile exists
      const existing = await fetchProfile(user.id);

      if (existing) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data as Profile;
      } else {
        // Insert new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data as Profile;
      }
    },
    onSuccess: (data) => {
      // Update cache with new profile data
      if (user?.id) {
        queryClient.setQueryData(profileKeys.detail(user.id), data);
      }
    },
  });
}

/**
 * Hook to invalidate profile cache (for manual refresh)
 */
export function useRefreshProfile() {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();

  return () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
    }
  };
}
