/**
 * Central Auth Hook Tests
 * 
 * Tests the useCentralAuth hook including:
 * - Initialization and health checks
 * - Session management
 * - Login/logout flows
 * - Profile fetching
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import { CentralAuthProvider, useCentralAuth } from '../useCentralAuth';

// Mock central auth client
const mockHealthCheck = vi.fn();
const mockGetCurrentSession = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockHandleCallback = vi.fn();

vi.mock('@/lib/central-auth', () => ({
  centralAuth: {
    healthCheck: mockHealthCheck,
    getCurrentSession: mockGetCurrentSession,
    login: mockLogin,
    logout: mockLogout,
    handleCallback: mockHandleCallback,
  },
}));

// Mock secure token storage
vi.mock('@/lib/secure-token-storage', () => ({
  secureTokenStorage: {
    migrateFromLocalStorage: vi.fn(),
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

// Mock Supabase fallback
const mockSupabaseAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockSupabaseAuth,
  },
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <CentralAuthProvider>{children}</CentralAuthProvider>
  </BrowserRouter>
);

describe('useCentralAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_USE_CENTRAL_AUTH = 'true';
    process.env.VITE_USE_FALLBACK_AUTH = 'true';
  });

  describe('Initialization', () => {
    it('should initialize with central auth when healthy', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(mockGetCurrentSession).toHaveBeenCalled();
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
    });

    it('should fallback to Supabase when central auth is unhealthy', async () => {
      mockHealthCheck.mockResolvedValue(false);
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockHealthCheck.mockRejectedValue(new Error('Network error'));
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fallback to Supabase
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    });
  });

  describe('Login', () => {
    it('should login with email and password', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);
      mockLogin.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login('test@example.com', 'password123');

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.session).toEqual(mockSession);
    });

    it('should handle login errors', async () => {
      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Logout', () => {
    it('should logout and clear session', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(mockSession);
      mockLogout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.logout();

      expect(mockLogout).toHaveBeenCalled();
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should fetch user profile on login', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(mockSession);

      // Mock profile fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.profile).toBeDefined();
      });
    });
  });

  describe('Auth Callback', () => {
    it('should handle OAuth callback', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);
      mockHandleCallback.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.handleAuthCallback();

      expect(mockHandleCallback).toHaveBeenCalled();
      expect(result.current.session).toEqual(mockSession);
    });
  });
});
