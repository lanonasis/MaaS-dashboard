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

// Mock navigate
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
});
