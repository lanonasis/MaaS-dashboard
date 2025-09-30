/**
 * Direct Supabase Authentication Client
 *
 * PERMANENT FIX for 5+ month authentication blocker
 *
 * Problem: api.lanonasis.com (onasis-core) has been broken, causing:
 * - Redirect loops
 * - OAuth callback failures
 * - Admin lockout
 * - Users unable to access dashboard
 *
 * Solution: Direct Supabase authentication with proper session management
 * - Bypasses broken central auth gateway
 * - Uses same Supabase project as MCP Core
 * - Maintains backward compatibility
 * - Provides clear error handling
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

// Supabase configuration - same project as MCP Core
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mxtsdgkwzjzlttpotole.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_ONASIS_SUPABASE_ANON_KEY;

interface AuthResponse {
  session: Session | null;
  user: User | null;
  error?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
}

class DirectAuthClient {
  private supabase: SupabaseClient;
  private readonly SESSION_KEY = 'lanonasis_session';
  private readonly USER_KEY = 'lanonasis_user';

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('DirectAuth: Missing Supabase configuration');
      throw new Error('Supabase configuration required');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // More secure than implicit flow
        storage: window.localStorage,
        storageKey: this.SESSION_KEY,
      },
    });

    // Set up auth state listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('DirectAuth: Auth state changed:', event);
      if (session) {
        this.storeSession(session);
      } else if (event === 'SIGNED_OUT') {
        this.clearSession();
      }
    });

    console.log('DirectAuth: Initialized with Supabase URL:', SUPABASE_URL);
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('DirectAuth: Login attempt for:', email);

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('DirectAuth: Login error:', error.message);
        return {
          session: null,
          user: null,
          error: error.message,
        };
      }

      if (!data.session || !data.user) {
        console.error('DirectAuth: Login succeeded but no session/user returned');
        return {
          session: null,
          user: null,
          error: 'Authentication succeeded but session creation failed',
        };
      }

      console.log('DirectAuth: Login successful for user:', data.user.id);
      this.storeSession(data.session);

      return {
        session: data.session,
        user: data.user,
      };
    } catch (error: any) {
      console.error('DirectAuth: Login exception:', error);
      return {
        session: null,
        user: null,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Sign up new user
   */
  async signup(email: string, password: string, metadata?: { name?: string }): Promise<AuthResponse> {
    console.log('DirectAuth: Signup attempt for:', email);

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('DirectAuth: Signup error:', error.message);
        return {
          session: null,
          user: null,
          error: error.message,
        };
      }

      console.log('DirectAuth: Signup successful, email confirmation required');

      return {
        session: data.session,
        user: data.user,
      };
    } catch (error: any) {
      console.error('DirectAuth: Signup exception:', error);
      return {
        session: null,
        user: null,
        error: error.message || 'Signup failed',
      };
    }
  }

  /**
   * Login with OAuth provider (Google, GitHub, etc.)
   */
  async loginWithProvider(provider: 'google' | 'github' | 'apple'): Promise<void> {
    console.log('DirectAuth: OAuth login with provider:', provider);

    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('DirectAuth: OAuth error:', error.message);
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('DirectAuth: OAuth exception:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    console.log('DirectAuth: Logout initiated');

    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('DirectAuth: Logout error:', error.message);
      }
    } catch (error) {
      console.error('DirectAuth: Logout exception:', error);
    } finally {
      this.clearSession();
      console.log('DirectAuth: Logout complete');
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('DirectAuth: Get session error:', error.message);
        return null;
      }

      if (session) {
        this.storeSession(session);
      }

      return session;
    } catch (error) {
      console.error('DirectAuth: Get session exception:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<Session | null> {
    console.log('DirectAuth: Refreshing session');

    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();

      if (error) {
        console.error('DirectAuth: Refresh session error:', error.message);
        return null;
      }

      if (session) {
        this.storeSession(session);
      }

      return session;
    } catch (error) {
      console.error('DirectAuth: Refresh session exception:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error?: string }> {
    console.log('DirectAuth: Password reset for:', email);

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('DirectAuth: Reset password error:', error.message);
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      console.error('DirectAuth: Reset password exception:', error);
      return { error: error.message || 'Password reset failed' };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error?: string }> {
    console.log('DirectAuth: Updating password');

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('DirectAuth: Update password error:', error.message);
        return { error: error.message };
      }

      return {};
    } catch (error: any) {
      console.error('DirectAuth: Update password exception:', error);
      return { error: error.message || 'Password update failed' };
    }
  }

  /**
   * Store session in localStorage
   */
  private storeSession(session: Session): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    if (session.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(session.user));

      // Maintain backward compatibility with central-auth keys
      localStorage.setItem('access_token', session.access_token);
      localStorage.setItem('lanonasis_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }
      localStorage.setItem('user_data', JSON.stringify(session.user));
    }
  }

  /**
   * Clear session from localStorage
   */
  private clearSession(): void {
    // Clear direct auth keys
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Clear central-auth compatibility keys
    localStorage.removeItem('access_token');
    localStorage.removeItem('lanonasis_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('lanonasis_user');
    localStorage.removeItem('lanonasis_current_session');
    localStorage.removeItem('lanonasis_current_user_id');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null && !this.isSessionExpired(session);
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    if (!session.expires_at) return false;
    return Date.now() / 1000 > session.expires_at;
  }

  /**
   * Get Supabase client for direct queries
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('profiles').select('count').limit(0).single();
      // 406 is expected when no rows match, which means connection works
      return !error || error.code === 'PGRST116';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const directAuth = new DirectAuthClient();
export type { AuthResponse, UserProfile };