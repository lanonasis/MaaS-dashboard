/**
 * Tests for useSupabaseAuth hook
 * Tests authentication provider, context, and auth operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupabaseAuthProvider, useSupabaseAuth } from '../useSupabaseAuth';
import type { ReactNode } from 'react';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockFromSelect = vi.fn();
const mockFromInsert = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: any) => mockOnAuthStateChange(callback),
      signInWithPassword: (params: any) => mockSignInWithPassword(params),
      signUp: (params: any) => mockSignUp(params),
      signOut: () => mockSignOut(),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockFromSelect,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: mockFromInsert,
      }),
    })),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock centralAuth
const mockExchangeSupabaseToken = vi.fn((accessToken: string) => Promise.resolve(true));
const mockClearSSOCookies = vi.fn(() => Promise.resolve(true));
vi.mock('@/lib/central-auth', () => ({
  centralAuth: {
    exchangeSupabaseToken: (accessToken: string) => mockExchangeSupabaseToken(accessToken),
    clearSSOCookies: () => mockClearSSOCookies(),
  },
}));

// Mock query-persister
vi.mock('@/lib/query-persister', () => ({
  clearPersistedCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock apiClient for profile creation seeding
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createMemory: vi.fn().mockResolvedValue({}),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = () => {
  return ({ children }: WrapperProps) => (
    <MemoryRouter>
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    </MemoryRouter>
  );
};

describe('useSupabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSupabaseAuth());
      }).toThrow('useSupabaseAuth must be used within a SupabaseAuthProvider');

      consoleSpy.mockRestore();
    });

    it('starts with loading state', async () => {
      // Delay the session fetch to capture loading state
      mockGetSession.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 100))
      );

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it('clears loading state after initialization', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Session Management', () => {
    it('returns from USER_UPDATED synchronously so auth mutations cannot deadlock', async () => {
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();
      let callbackResult: unknown;
      act(() => {
        callbackResult = authStateHandler!('USER_UPDATED', {
          access_token: 'updated-token',
          user: { id: 'user-123', email: 'test@example.com' },
        });
      });

      expect(callbackResult).toBeUndefined();
    });

    it('cancels deferred profile work when sign-out follows sign-in', async () => {
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();
      act(() => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'updated-token',
          user: { id: 'user-123', email: 'test@example.com' },
        });
        authStateHandler!('SIGNED_OUT', null);
        vi.runOnlyPendingTimers();
      });

      expect(mockFromSelect).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it('sets user and session when session exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };
      const mockSession = {
        access_token: 'test-token',
        user: mockUser,
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFromSelect.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('handles session fetch timeout gracefully', async () => {
      // Make session fetch hang forever
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      // Fast forward past the timeout (20 seconds)
      await act(async () => {
        vi.advanceTimersByTime(21000);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Sign In', () => {
    it('calls signInWithPassword with correct parameters', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('shows error toast on sign in failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Authentication failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      });
    });
  });

  describe('Sign Up', () => {
    it('calls signUp with correct parameters including user metadata', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      });
    });

    it('shows success toast on sign up', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', 'New User');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration successful!',
        description: 'Please check your email to confirm your account.',
      });
    });

    it('shows error toast on sign up failure', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Email already exists' },
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.signUp('existing@example.com', 'password123', 'User')
      ).rejects.toThrow();

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration failed',
        description: 'Email already exists',
        variant: 'destructive',
      });
    });
  });

  describe('Sign Out', () => {
    it('calls signOut successfully', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('throws error on sign out failure', async () => {
      mockSignOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.signOut()).rejects.toThrow();
    });
  });

  describe('Context Values', () => {
    it('provides all expected context values', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('isProcessingCallback');
      expect(result.current).toHaveProperty('handleAuthCallback');
    });
  });

  describe('Auth Callback & Redirect', () => {
    it('handles auth callback error via handleAuthCallback', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear existing calls then trigger handleAuthCallback
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Callback failed' },
      });

      await act(async () => {
        await result.current.handleAuthCallback();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/?error=auth_callback_failed');
    });

    it('handles auth callback success and redirects via handleAuthCallback', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: '1' } } },
        error: null,
      });

      await act(async () => {
        await result.current.handleAuthCallback();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('SSO cookie sync', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers({ shouldAdvanceTime: true });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockOnAuthStateChange.mockImplementation((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('syncs SSO cookies on SIGNED_IN with new token (lines 227, 233, 236)', async () => {
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();

      // Mock fetchProfile to resolve
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });

      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'new-token',
          user: { id: 'user-1', email: 'test@example.com' },
        });
        vi.runOnlyPendingTimers();
        // advance past the 0ms deferral timers
      });

      expect(mockExchangeSupabaseToken).toHaveBeenCalledWith('new-token');
    });

    it('shows welcome toast on SIGNED_IN with email (line 257)', async () => {
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();

      // Mock fetchProfile to resolve quickly
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });

      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'tok',
          user: { id: 'user-1', email: 'alice@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome!',
        description: 'You are now signed in as alice@example.com',
      });
    });

    it('clears state and SSO cookies on SIGNED_OUT (lines 272, 276)', async () => {
      // First sign in to establish state
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();

      // Sign in
      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'tok1',
          user: { id: 'user-1', email: 'alice@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      expect(result.current.user).not.toBeNull();

      // Mock fetchProfile
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });

      // Sign out
      await act(async () => {
        authStateHandler!('SIGNED_OUT', null);
        vi.runOnlyPendingTimers();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(mockClearSSOCookies).toHaveBeenCalled();
    });

    it('skips SSO sync when token is unchanged', async () => {
      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();

      // Sign in with token
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });
      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'same-token',
          user: { id: 'user-1', email: 'test@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      expect(mockExchangeSupabaseToken).toHaveBeenCalledWith('same-token');
      const firstCallCount = mockExchangeSupabaseToken.mock.calls.length;

      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'same-token',
          user: { id: 'user-1', email: 'test@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      // exchangeSupabaseToken should have been called only once (no second call)
      expect(mockExchangeSupabaseToken.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('Auth listener errors', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers({ shouldAdvanceTime: true });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('handles onAuthStateChange setup failure with initError (line 308)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockOnAuthStateChange.mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      // When onAuthStateChange throws, setInitError is called and the provider
      // returns early (line 550) with error UI. Since the provider no longer
      // renders SupabaseAuthContext.Provider, useSupabaseAuth() would throw.
      // Instead, render the provider directly and check for error UI.
      const { render, screen } = await import('@testing-library/react');

      render(
        <MemoryRouter>
          <SupabaseAuthProvider>
            <div data-testid="placeholder" />
          </SupabaseAuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        // The error UI should be rendered after initError is set
        expect(screen.getByText('Authentication Error')).toBeDefined();
      }, { timeout: 5000 });

      consoleSpy.mockRestore();
    });

    it('redirects to stored path on SIGNED_IN (line 260-263)', async () => {
      localStorage.setItem('redirectAfterLogin', '/settings');

      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });

      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'tok',
          user: { id: 'user-1', email: 'test@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
      expect(localStorage.getItem('redirectAfterLogin')).toBeNull();

      localStorage.removeItem('redirectAfterLogin');
    });

    it('redirects to /dashboard when no stored path (line 266)', async () => {
      localStorage.removeItem('redirectAfterLogin');

      let authStateHandler: ((event: string, session: any) => unknown) | undefined;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateHandler = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(authStateHandler).toBeDefined();
      mockFromSelect.mockResolvedValue({ data: { id: 'user-1', email: 't@e.com' }, error: null });

      await act(async () => {
        authStateHandler!('SIGNED_IN', {
          access_token: 'tok',
          user: { id: 'user-1', email: 'test@example.com' },
        });
        vi.runOnlyPendingTimers();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('no session: profile fetch and SSO sync not triggered (line 185)', async () => {
      // getSession already returns null session by default in beforeEach

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Profile fetch should not have been called since there's no session
      expect(mockFromSelect).not.toHaveBeenCalled();

      // No SSO sync either
      expect(mockExchangeSupabaseToken).not.toHaveBeenCalled();
    });

    it('fetchProfile handles database error (lines 319, 335, 340)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test' },
      };

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok', user: mockUser } },
        error: null,
      });

      // Return a database error from maybeSingle (not PGRST116)
      mockFromSelect.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'DB failed' },
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Profile should not be set on DB error
      expect(result.current.profile).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
