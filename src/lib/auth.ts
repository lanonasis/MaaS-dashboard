/**
 * Unified Authentication Module
 *
 * Automatically uses direct Supabase auth (bypassing broken api.lanonasis.com)
 * while maintaining backward compatibility with central-auth interface.
 *
 * This is the PERMANENT FIX for the 5+ month authentication blocker.
 */

import { directAuth, type AuthResponse, type UserProfile } from './direct-auth';
import type { Session, User } from '@supabase/supabase-js';

// Re-export types for backward compatibility
export type { AuthResponse, UserProfile, Session, User };

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  console.log('Auth: Login via direct Supabase auth');
  return await directAuth.login(email, password);
}

/**
 * Sign up new user
 */
export async function signup(email: string, password: string, name?: string): Promise<AuthResponse> {
  console.log('Auth: Signup via direct Supabase auth');
  return await directAuth.signup(email, password, name ? { name } : undefined);
}

/**
 * Login with OAuth provider
 */
export async function loginWithProvider(provider: 'google' | 'github' | 'apple'): Promise<void> {
  console.log('Auth: OAuth login via direct Supabase auth');
  await directAuth.loginWithProvider(provider);
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  console.log('Auth: Logout via direct Supabase auth');
  await directAuth.logout();
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  return await directAuth.getCurrentSession();
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  return await directAuth.getCurrentUser();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  return await directAuth.isAuthenticated();
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<Session | null> {
  return await directAuth.refreshSession();
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<{ error?: string }> {
  return await directAuth.resetPassword(email);
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ error?: string }> {
  return await directAuth.updatePassword(newPassword);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  return await directAuth.healthCheck();
}

/**
 * Get Supabase client for direct queries
 */
export function getSupabaseClient() {
  return directAuth.getClient();
}

// Export singleton for advanced usage
export { directAuth };

// Default export for convenience
export default {
  login,
  signup,
  loginWithProvider,
  logout,
  getCurrentSession,
  getCurrentUser,
  isAuthenticated,
  refreshSession,
  resetPassword,
  updatePassword,
  healthCheck,
  getSupabaseClient,
};