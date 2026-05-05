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
      maybeSingle: vi.fn(() => Promise.resolve({ ...mockProfileResponse })),
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
    it("should initialize with direct-auth (Supabase) session", async () => {
      // The hook uses direct-auth (Supabase) as the auth owner model per Task #128.
      // central-auth.healthCheck/getCurrentSession are NOT called on init;
      // central-auth is only used for best-effort SSO cookie sync (exchangeSupabaseToken).
      const mockSession = {
        access_token: "token-123",
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Supabase session is loaded via direct-auth
      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
      // central-auth is NOT called on init (healthCheck/getCurrentSession are bridge-only)
      expect(mockHealthCheck).not.toHaveBeenCalled();
      expect(mockGetCurrentSession).not.toHaveBeenCalled();
      // session is set from Supabase
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      // isUsingCentralAuth is always false (direct-auth is the owner model)
      expect(result.current.isUsingCentralAuth).toBe(false);
    });

    it("should handle no session gracefully", async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it("should handle initialization errors gracefully", async () => {
      mockSupabaseAuth.getSession.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe("Login", () => {
    it("should sign in with Supabase credentials", async () => {
      // signIn always uses direct-auth (Supabase) per Task #128 owner model
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });

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
      // central-auth.login is never used (direct-auth is the owner model)
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("should surface sign-in errors via toast", async () => {
      const error = new Error("Invalid credentials");
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
      // signOut clears SSO cookies via centralAuth.clearSSOCookies() then calls supabase.auth.signOut()
      // central-auth.logout() is NOT called (that method is for full central-auth logout flows)
      const mockSession = {
        access_token: "token-123",
        user: { id: "user-123", email: "test@example.com" },
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useCentralAuth(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      // clearSSOCookies is called (best-effort cross-subdomain logout)
      expect(mockClearSSOCookies).toHaveBeenCalled();
      // central-auth.logout() is NOT called
      expect(mockLogout).not.toHaveBeenCalled();
      // Supabase signOut is called
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.session).toBeNull();
        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
      });
    });
  });

  describe("Session Management", () => {
    it("should fetch user profile on login", async () => {
      // Profile is fetched via Supabase after session is established (direct-auth owner model)
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

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockProfileResponse.data = mockProfile;
      mockProfileResponse.error = null;

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
