import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ReactNode } from "react";

const {
  mockHealthCheck,
  mockGetCurrentSession,
  mockLogin,
  mockLogout,
  mockHandleCallback,
  mockClearSSOCookies,
  mockExchangeSupabaseToken,
} = vi.hoisted(() => ({
  mockHealthCheck: vi.fn(),
  mockGetCurrentSession: vi.fn(),
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockHandleCallback: vi.fn(),
  mockClearSSOCookies: vi.fn().mockResolvedValue(undefined),
  mockExchangeSupabaseToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/central-auth", () => {
  return {
    centralAuth: {
      healthCheck: mockHealthCheck,
      getCurrentSession: mockGetCurrentSession,
      login: mockLogin,
      logout: mockLogout,
      handleCallback: mockHandleCallback,
      clearSSOCookies: mockClearSSOCookies,
      exchangeSupabaseToken: mockExchangeSupabaseToken,
    },
  };
});

// Mock secure token storage
vi.mock("@/lib/secure-token-storage", () => ({
  secureTokenStorage: {
    migrateFromLocalStorage: vi.fn(),
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

const { mockProfileResponse, mockSupabaseFrom, mockSupabaseAuth } = vi.hoisted(
  () => ({
    mockProfileResponse: {
      data: null as unknown,
      error: null as unknown,
    },
    mockSupabaseFrom: vi.fn(),
    mockSupabaseAuth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  })
);

vi.mock("@/integrations/supabase/client", () => {
  mockSupabaseFrom.mockImplementation(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: vi.fn(() => Promise.resolve(mockProfileResponse)),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    };
    return builder;
  });

  return {
    supabase: {
      auth: mockSupabaseAuth,
      from: mockSupabaseFrom,
    },
  };
});

// Mock router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }: { children: ReactNode }) => children,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Import the actual module
import { CentralAuthProvider, useCentralAuth } from "../useCentralAuth";
import { BrowserRouter } from "react-router-dom";

const createWrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <CentralAuthProvider>{children}</CentralAuthProvider>
  </BrowserRouter>
);

describe("useCentralAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_USE_CENTRAL_AUTH = "true";
    process.env.VITE_USE_FALLBACK_AUTH = "true";
    mockProfileResponse.data = null;
    mockProfileResponse.error = null;
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
  });

  describe("Initialization", () => {
    it("should initialize with central auth when healthy", async () => {
      const mockSession = {
        access_token: "token-123",
        user: {
          id: "user-123",
          email: "test@example.com",
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

    it("should fallback to Supabase when central auth is unhealthy", async () => {
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

    it("should handle initialization errors gracefully", async () => {
      mockHealthCheck.mockRejectedValue(new Error("Network error"));
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

  describe("Login", () => {
    it("should sign in with Supabase when no central session", async () => {
      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("should surface sign-in errors via toast", async () => {
      const error = new Error("Invalid credentials");
      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error,
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "wrongpassword",
      });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error signing in",
          description: "Invalid credentials",
          variant: "destructive",
        })
      );
    });
  });

  describe("Logout", () => {
    it("should logout and clear session", async () => {
      const mockSession = {
        access_token: "token-123",
        user: { id: "user-123", email: "test@example.com" },
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

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockLogout).toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.session).toBeNull();
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe("Session Management", () => {
    it("should fetch user profile on login", async () => {
      const mockSession = {
        access_token: "token-123",
        user: { id: "user-123", email: "test@example.com" },
      };

      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        company_name: null,
        avatar_url: null,
        role: "user",
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(mockSession);
      mockProfileResponse.data = mockProfile;

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });
    });
  });

  describe("Auth Callback", () => {
    it("should handle OAuth callback", async () => {
      const mockSession = {
        access_token: "token-123",
        user: { id: "user-123", email: "test@example.com" },
      };
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        company_name: null,
        avatar_url: null,
        role: "user",
      };

      mockHealthCheck.mockResolvedValue(true);
      mockGetCurrentSession.mockResolvedValue(null);
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockProfileResponse.data = mockProfile;

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAuthCallback();
      });

      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
      expect(result.current.session).toEqual(mockSession);
    });
  });
});
