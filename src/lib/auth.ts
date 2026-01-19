/**
 * Unified Authentication Module - SSO First
 *
 * Priority:
 * 1. Check auth-gateway SSO cookies (lanonasis_session, lanonasis_user)
 * 2. Fallback to direct Supabase auth if SSO unavailable
 *
 * This enables seamless cross-subdomain authentication.
 */

import { hasAuthCookies, parseUserCookie, hasSessionCookie, COOKIE_NAMES } from '@lanonasis/shared-auth';
import { directAuth, type AuthResponse, type UserProfile } from './direct-auth';
import type { Session, User } from '@supabase/supabase-js';

// Re-export types for backward compatibility
export type { AuthResponse, UserProfile, Session, User };

// Auth gateway URL
const AUTH_GATEWAY_URL = import.meta.env.VITE_AUTH_GATEWAY_URL || 'https://auth.lanonasis.com';

/**
 * Check if user is authenticated via auth-gateway SSO cookies
 */
export function isAuthenticatedViaSSO(): boolean {
  return hasAuthCookies();
}

/**
 * Get user from SSO cookies (set by auth-gateway)
 */
export function getSSOUser(): UserProfile | null {
  const ssoUser = parseUserCookie();
  if (!ssoUser) return null;

  return {
    id: ssoUser.id,
    email: ssoUser.email,
    role: ssoUser.role,
    name: ssoUser.name,
    avatar_url: ssoUser.avatar_url,
    created_at: new Date().toISOString(), // SSO cookie doesn't include this
  };
}

/**
 * Login - redirects to auth-gateway
 * All logins should go through the central auth-gateway
 */
export function redirectToLogin(returnTo?: string): void {
  const loginUrl = new URL('/web/login', AUTH_GATEWAY_URL);
  loginUrl.searchParams.set('return_to', returnTo || window.location.href);
  window.location.href = loginUrl.toString();
}

/**
 * Logout - redirects to auth-gateway logout
 */
export function redirectToLogout(returnTo?: string): void {
  const logoutUrl = new URL('/web/logout', AUTH_GATEWAY_URL);
  if (returnTo) {
    logoutUrl.searchParams.set('return_to', returnTo);
  }
  window.location.href = logoutUrl.toString();
}

/**
 * Login with email and password
 * Uses auth-gateway or fallback to direct Supabase
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  // For now, redirect to auth-gateway for login
  // Auth-gateway handles login and sets cookies
  redirectToLogin();
  return { session: null, user: null, error: 'Redirecting to auth-gateway...' };
}

/**
 * Sign up new user - redirects to auth-gateway signup
 */
export async function signup(email: string, password: string, name?: string): Promise<AuthResponse> {
  const signupUrl = new URL('/web/signup', AUTH_GATEWAY_URL);
  signupUrl.searchParams.set('return_to', window.location.href);
  window.location.href = signupUrl.toString();
  return { session: null, user: null, error: 'Redirecting to auth-gateway...' };
}

/**
 * Login with OAuth provider - redirects to auth-gateway OAuth
 */
export async function loginWithProvider(provider: 'google' | 'github' | 'apple'): Promise<void> {
  const oauthUrl = new URL('/oauth/authorize', AUTH_GATEWAY_URL);
  oauthUrl.searchParams.set('provider', provider);
  oauthUrl.searchParams.set('redirect_uri', window.location.origin + '/auth/callback');
  window.location.href = oauthUrl.toString();
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  // First logout from direct auth (clears local state)
  try {
    await directAuth.logout();
  } catch (e) {
    // Ignore errors, continue with gateway logout
  }
  // Then redirect to auth-gateway logout (clears SSO cookies)
  redirectToLogout(window.location.origin);
}

/**
 * Get current session
 * Checks SSO first, then falls back to direct Supabase
 */
export async function getCurrentSession(): Promise<Session | null> {
  // If SSO authenticated, we don't have a Supabase session object
  // But we know the user is authenticated
  if (isAuthenticatedViaSSO()) {
    // Return a mock session that indicates authenticated
    // The actual JWT is in the HttpOnly cookie
    return null; // Components should use isAuthenticated() instead
  }

  // Fallback to direct Supabase session
  return await directAuth.getCurrentSession();
}

/**
 * Get current user
 * Checks SSO first, then falls back to direct Supabase
 */
export async function getCurrentUser(): Promise<User | null> {
  // Check SSO first
  const ssoUser = getSSOUser();
  if (ssoUser) {
    // Return SSO user as a User-like object
    return {
      id: ssoUser.id,
      email: ssoUser.email,
      role: ssoUser.role || 'user',
      user_metadata: { name: ssoUser.name, avatar_url: ssoUser.avatar_url },
      app_metadata: {},
      aud: 'authenticated',
      created_at: ssoUser.created_at,
    } as unknown as User;
  }

  // Fallback to direct Supabase
  return await directAuth.getCurrentUser();
}

/**
 * Check if user is authenticated
 * Checks SSO first, then falls back to direct Supabase
 */
export async function isAuthenticated(): Promise<boolean> {
  // Check SSO first
  if (isAuthenticatedViaSSO()) {
    return true;
  }

  // Fallback to direct Supabase
  return await directAuth.isAuthenticated();
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<Session | null> {
  // SSO sessions are managed by auth-gateway
  // Direct sessions can be refreshed
  return await directAuth.refreshSession();
}

/**
 * Reset password - redirects to auth-gateway
 */
export async function resetPassword(email: string): Promise<{ error?: string }> {
  const resetUrl = new URL('/web/forgot-password', AUTH_GATEWAY_URL);
  resetUrl.searchParams.set('email', email);
  window.location.href = resetUrl.toString();
  return {};
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
  // Check if SSO cookies are present
  if (hasSessionCookie()) {
    return true;
  }
  // Fallback to direct auth health check
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

// Export SSO utilities
export { isAuthenticatedViaSSO, getSSOUser, redirectToLogin, redirectToLogout };

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
  isAuthenticatedViaSSO,
  getSSOUser,
  redirectToLogin,
  redirectToLogout,
};
