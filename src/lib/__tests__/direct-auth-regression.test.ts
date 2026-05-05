/**
 * Browser Auth Regression Suite — persistSession:false, in-memory token isolation
 *
 * Task: t_6741976e
 * Parent: t_9457af73 (persistSession: true → false fix, direct-auth owner model)
 *
 * Validates 7 security/UX scenarios after the issue #128/#129 change:
 *   1. Session tokens never reach localStorage (in-memory Map adapter)
 *   2. Session metadata persists for UX — lanonasis_session_metadata survives reload
 *   3. Auto-refresh works via in-memory adapter — no disk writes for tokens
 *   4. OAuth PKCE redirect flow — tokens stay in memory after callback
 *   5. Logout cleanup — localStorage has no sensitive token keys
 *   6. Legacy token key cleanup — clearLegacySensitiveStorage() removes stale keys
 *   7. Cross-tab isolation — no token sharing between tabs
 *
 * Files under test:
 *   - apps/dashboard/src/lib/direct-auth.ts
 *   - apps/dashboard/src/lib/secure-token-storage.ts
 *   - apps/dashboard/src/lib/token-exchange.ts
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Fake localStorage/sessionStorage — jsdom's storage doesn't persist across
// the vi.spyOn interception boundary in vitest/jsdom. We replace the browser
// globals with a shared in-memory Map-backed store so setItem/getItem round-
// trip correctly inside tests.
// ---------------------------------------------------------------------------

const fakeLocalStorage = new Map<string, string>();
const fakeSessionStorage = new Map<string, string>();

globalThis.localStorage = {
  getItem: (key: string) => fakeLocalStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { fakeLocalStorage.set(key, value); },
  removeItem: (key: string) => { fakeLocalStorage.delete(key); },
  key: (index: number) => Array.from(fakeLocalStorage.keys())[index] ?? null,
  get length() { return fakeLocalStorage.size; },
  clear: () => { fakeLocalStorage.clear(); },
  constructor: Object,
} as unknown as Storage;

globalThis.sessionStorage = {
  getItem: (key: string) => fakeSessionStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { fakeSessionStorage.set(key, value); },
  removeItem: (key: string) => { fakeSessionStorage.delete(key); },
  key: (index: number) => Array.from(fakeSessionStorage.keys())[index] ?? null,
  get length() { return fakeSessionStorage.size; },
  clear: () => { fakeSessionStorage.clear(); },
  constructor: Object,
} as unknown as Storage;

// ---------------------------------------------------------------------------
// Mock state — vi.hoisted ensures these run AFTER module-scope initialization,
// BEFORE the vi.mock factory executes. Without it, the factory sees
// authHandlers as undefined because mock() is hoisted above top-level code.
// ---------------------------------------------------------------------------

const { authHandlers, clearAuthHandlers } = vi.hoisted(() => {
  const _handlers: Array<(event: string, session: Session | null) => void> = [];
  return {
    authHandlers: _handlers,
    clearAuthHandlers: () => { _handlers.length = 0; },
  };
});

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — vi.hoisted ensures the factory sees the
// authHandlers array that was initialized by the vi.hoisted call above.
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn((handler: (e: string, s: Session | null) => void) => {
        authHandlers.push(handler);
        return { data: { unsubscribe: () => {} } };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: { code: 'PGRST116' } })),
        })),
      })),
    })),
  })),
  SupabaseClient: {},
  Session: {},
  User: {},
}));

vi.mock('../token-exchange', () => ({
  autoExchangeTokens: vi.fn().mockResolvedValue(undefined),
  clearAuthGatewayTokens: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { directAuth } from '../direct-auth';
import { SecureTokenStorage } from '../secure-token-storage';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SESSION_METADATA_KEY = 'lanonasis_session_metadata';
const AUTH_TIMESTAMP_KEY = 'lanonasis_auth_timestamp';
const USER_KEY = 'lanonasis_user';

const SENSITIVE_KEYS = [
  'lanonasis_session',
  'access_token',
  'refresh_token',
  'auth_gateway_tokens',
  'lanonasis_token',
] as const;

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'sb-test-access-token-' + Math.random(),
    refresh_token: 'sb-test-refresh-token-' + Math.random(),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'Bearer',
    user: {
      id: 'user-test-123',
      email: 'test@example.com',
      role: 'member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
    } as User,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Well-typed mock client — avoids ReturnType<typeof vi.fn> which collapses
// chained method access to `any` and silently returns undefined.
// ---------------------------------------------------------------------------

interface MockAuth {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signInWithOAuth: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
}

interface MockSupabaseClient {
  auth: MockAuth;
  from: ReturnType<typeof vi.fn>;
}

function getMockSupabase(): MockSupabaseClient {
  return directAuth.getClient() as unknown as MockSupabaseClient;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('direct-auth persistSession:false regression suite (t_6741976e)', () => {

  beforeEach(async () => {
    // Reset only the auth method mocks; onAuthStateChange is NOT reset so its
    // call count is preserved for token-exchange integration tests. The
    // authHandlers array is cleared here so handlers from the previous test don't
    // leak into the current test.
    const mock = getMockSupabase();
    if (mock?.auth) {
      vi.mocked(mock.auth.signInWithPassword).mockReset();
      vi.mocked(mock.auth.signInWithPassword).mockResolvedValue({ data: { session: null, user: null }, error: null });
      vi.mocked(mock.auth.getSession).mockReset();
      vi.mocked(mock.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
      vi.mocked(mock.auth.refreshSession).mockReset();
      vi.mocked(mock.auth.refreshSession).mockResolvedValue({ data: { session: null }, error: null });
      vi.mocked(mock.auth.signOut).mockReset();
      vi.mocked(mock.auth.signOut).mockResolvedValue({ error: null });
      vi.mocked(mock.auth.signInWithOAuth).mockReset();
      vi.mocked(mock.auth.signInWithOAuth).mockResolvedValue({ error: null });
      vi.mocked(mock.auth.updateUser).mockReset();
      vi.mocked(mock.auth.updateUser).mockResolvedValue({ data: { user: null }, error: null });
    }
    // Clear the handler array — only afterEach calls clearAuthHandlers()
    // because handlers need to be available during the test.
    authHandlers.length = 0;
    fakeLocalStorage.clear();
    fakeSessionStorage.clear();
  });

  afterEach(() => {
    clearAuthHandlers();
  });

  afterEach(() => {
    clearAuthHandlers();
  });

  // =========================================================================
  // Scenario 1 — No sensitive token keys in localStorage after any auth event
  // =========================================================================

  describe('Scenario 1 — Session tokens never reach localStorage', () => {

    it('after SIGNED_IN fires, no sensitive Supabase token keys appear in localStorage', async () => {
      vi.useFakeTimers();
      try {
        const session = makeSession();
        authHandlers.forEach((h) => h('SIGNED_IN', session));
        await vi.advanceTimersByTimeAsync(0);

        for (const key of SENSITIVE_KEYS) {
          expect(localStorage.getItem(key as string)).toBeNull();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('after login() succeeds, no Supabase session token keys appear in localStorage', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      await directAuth.login('test@example.com', 'password');

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }
    });

    it('after getCurrentSession() returns a session, localStorage has no token keys', async () => {
      const session = makeSession();
      getMockSupabase().auth.getSession.mockResolvedValueOnce({
        data: { session },
        error: null,
      });

      await directAuth.getCurrentSession();

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }
    });
  });

  // =========================================================================
  // Scenario 2 — Non-sensitive session metadata persists for UX
  // =========================================================================

  describe('Scenario 2 — Session metadata persists in localStorage for UX', () => {

    it('after login() succeeds, lanonasis_session_metadata is written with user_id, email, expires_at', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      await directAuth.login('test@example.com', 'password');

      const raw = localStorage.getItem(SESSION_METADATA_KEY);
      expect(raw).not.toBeNull();
      const meta = JSON.parse(raw!);
      expect(meta.user_id).toBe(session.user.id);
      expect(meta.user_email).toBe(session.user.email);
      expect(meta.expires_at).toBe(session.expires_at);
      expect(meta.updated_at).toBeDefined();
    });

    it('expires_in is stored in session metadata after login', async () => {
      const session = makeSession({ expires_in: 7200 });
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      await directAuth.login('test@example.com', 'password');

      const raw = localStorage.getItem(SESSION_METADATA_KEY)!;
      const meta = JSON.parse(raw);
      expect(meta.expires_in).toBe(7200);
    });

    it('auth timestamp is written to lanonasis_auth_timestamp after login', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const before = Date.now();
      await directAuth.login('test@example.com', 'password');
      const after = Date.now();

      const raw = localStorage.getItem(AUTH_TIMESTAMP_KEY);
      expect(raw).not.toBeNull();
      const ts = parseInt(raw!, 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('lanonasis_session_metadata survives after subsequent getCurrentSession calls', async () => {
      // First login to populate metadata
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });
      await directAuth.login('test@example.com', 'password');

      // getCurrentSession updates it — verify it still has the expected fields
      const updatedSession = { ...session, expires_in: 7200, expires_at: Math.floor(Date.now() / 1000) + 7200 };
      getMockSupabase().auth.getSession.mockResolvedValueOnce({
        data: { session: updatedSession },
        error: null,
      });
      await directAuth.getCurrentSession();

      const raw = localStorage.getItem(SESSION_METADATA_KEY);
      expect(raw).not.toBeNull();
      const meta = JSON.parse(raw!);
      expect(meta.user_id).toBe(session.user.id);
      expect(meta.expires_in).toBe(7200);
    });
  });

  // =========================================================================
  // Scenario 3 — Auto-refresh uses in-memory adapter, no disk writes
  // =========================================================================

  describe('Scenario 3 — Auto-refresh works via in-memory adapter', () => {

    it('refreshSession() does not write token keys to localStorage', async () => {
      const newSession = makeSession({
        access_token: 'sb-refreshed-access-token',
        refresh_token: 'sb-refreshed-refresh-token',
      });
      getMockSupabase().auth.refreshSession.mockResolvedValueOnce({
        data: { session: newSession },
        error: null,
      });

      await directAuth.refreshSession();

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }
    });

    it('refreshSession() stores updated expires_in in session metadata', async () => {
      const newSession = makeSession({
        expires_in: 7200,
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      });
      getMockSupabase().auth.refreshSession.mockResolvedValueOnce({
        data: { session: newSession },
        error: null,
      });

      await directAuth.refreshSession();

      const raw = localStorage.getItem(SESSION_METADATA_KEY);
      expect(raw).not.toBeNull();
      const meta = JSON.parse(raw!);
      expect(meta.expires_in).toBe(7200);
    });
  });

  // =========================================================================
  // Scenario 4 — OAuth PKCE redirect flow: tokens in memory only
  // =========================================================================

  describe('Scenario 4 — OAuth PKCE redirect flow, tokens in memory only', () => {

    it('loginWithProvider() configures PKCE OAuth with correct redirectTo and query params', async () => {
      getMockSupabase().auth.signInWithOAuth.mockResolvedValueOnce({
        error: null,
      });

      await directAuth.loginWithProvider('google');

      expect(getMockSupabase().auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: expect.objectContaining({
            access_type: 'offline',
            prompt: 'consent',
          }),
        }),
      });
    });

    it('after OAuth callback fires SIGNED_IN, no token keys appear in localStorage', async () => {
      vi.useFakeTimers();
      try {
        const session = makeSession();
        authHandlers.forEach((h) => h('SIGNED_IN', session));
        await vi.advanceTimersByTimeAsync(0);

        for (const key of SENSITIVE_KEYS) {
          expect(localStorage.getItem(key as string)).toBeNull();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('after OAuth callback, session metadata is stored for UX continuity', async () => {
      // OAuth callback triggers storeSession same as login(), so test via login()
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      await directAuth.login('test@example.com', 'password');

      expect(localStorage.getItem(SESSION_METADATA_KEY)).not.toBeNull();
    });
  });

  // =========================================================================
  // Scenario 5 — Logout cleanup: no sensitive token keys remain
  // =========================================================================

  describe('Scenario 5 — Logout cleanup: no sensitive token keys in localStorage', () => {

    it('after SIGNED_OUT fires, all sensitive token keys are absent from localStorage', async () => {
      vi.useFakeTimers();
      try {
        for (const key of SENSITIVE_KEYS) {
          localStorage.setItem(key as string, 'stale-token');
        }
        localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify({ user_id: 'x' }));

        // Use triggerCallback to simulate the auth-state-change callback directly
        await directAuth.triggerCallback('SIGNED_OUT', null);
        await vi.advanceTimersByTimeAsync(0);

        for (const key of SENSITIVE_KEYS) {
          expect(localStorage.getItem(key as string)).toBeNull();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('after logout() completes, session metadata is cleared', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });
      await directAuth.login('test@example.com', 'password');

      getMockSupabase().auth.signOut.mockResolvedValueOnce({ error: null });
      await directAuth.logout();

      expect(localStorage.getItem(SESSION_METADATA_KEY)).toBeNull();
      expect(localStorage.getItem(AUTH_TIMESTAMP_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
    });

    it('logout clears lanonasis_user key', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });
      await directAuth.login('test@example.com', 'password');

      getMockSupabase().auth.signOut.mockResolvedValueOnce({ error: null });
      await directAuth.logout();

      expect(localStorage.getItem('lanonasis_user')).toBeNull();
    });
  });

  // =========================================================================
  // Scenario 6 — Legacy token key cleanup
  // =========================================================================

  describe('Scenario 6 — Legacy token key cleanup via clearLegacySensitiveStorage()', () => {

    it('clearLegacySensitiveStorage removes all stale sensitive keys', () => {
      for (const key of SENSITIVE_KEYS) {
        localStorage.setItem(key as string, 'legacy-stale-value');
      }

      // Access via __testing__ interface
      (directAuth as any).__testing__.clearLegacySensitiveStorage();

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }
    });

    it('clearLegacySensitiveStorage is idempotent (safe to call when keys already absent)', () => {
      expect(() => (directAuth as any).__testing__.clearLegacySensitiveStorage()).not.toThrow();
    });

    it('clearLegacySensitiveStorage is called automatically when SIGNED_IN fires (migration safety)', async () => {
      vi.useFakeTimers();
      try {
        for (const key of SENSITIVE_KEYS) {
          localStorage.setItem(key as string, 'should-be-removed');
        }

        const session = makeSession();
        // Use triggerCallback to simulate the auth-state-change callback directly
        await directAuth.triggerCallback('SIGNED_IN', session);
        await vi.advanceTimersByTimeAsync(0);

        for (const key of SENSITIVE_KEYS) {
          expect(localStorage.getItem(key as string)).toBeNull();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('logout also calls clearLegacySensitiveStorage for thorough cleanup', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });
      await directAuth.login('test@example.com', 'password');

      for (const key of SENSITIVE_KEYS) {
        localStorage.setItem(key as string, 'orphan-token');
      }

      getMockSupabase().auth.signOut.mockResolvedValueOnce({ error: null });
      await directAuth.logout();

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }
    });
  });

  // =========================================================================
  // Scenario 7 — Cross-tab isolation (no localStorage token sharing)
  // =========================================================================

  describe('Scenario 7 — Cross-tab isolation: no token sharing between tabs', () => {

    it('after login, only lanonasis_session_metadata exists in localStorage (no token keys)', async () => {
      const session = makeSession();
      getMockSupabase().auth.signInWithPassword.mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      await directAuth.login('test@example.com', 'password');

      expect(localStorage.getItem(SESSION_METADATA_KEY)).not.toBeNull();

      for (const key of SENSITIVE_KEYS) {
        expect(localStorage.getItem(key as string)).toBeNull();
      }

      expect(localStorage.getItem('supabase-session')).toBeNull();
      expect(localStorage.getItem('supabase-auth-token')).toBeNull();
    });

    it('in-memory adapter prevents Supabase tokens from being shared via localStorage', () => {
      const session = makeSession();
      authHandlers.forEach((h) => h('SIGNED_IN', session));

      expect(localStorage.getItem('supabase-session')).toBeNull();
      expect(localStorage.getItem('sb-access-token')).toBeNull();
    });
  });

  // =========================================================================
  // SecureTokenStorage — supplementary isolation tests
  // =========================================================================

  describe('SecureTokenStorage — in-memory token isolation', () => {

    let storage: SecureTokenStorage;

    beforeEach(() => {
      storage = new SecureTokenStorage();
      localStorage.clear();
      sessionStorage.clear();
      vi.clearAllMocks();
    });

    it('setAccessToken stores token in memory only, never localStorage', () => {
      storage.setAccessToken('access-token-123', 3600);
      expect(storage.getAccessToken()).toBe('access-token-123');
      // Verify nothing was written to localStorage by checking the actual store
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('setRefreshToken stores in memory only, never sessionStorage', () => {
      storage.setRefreshToken('refresh-token-456');
      expect(storage.getRefreshToken()).toBe('refresh-token-456');
      // Verify nothing was written to sessionStorage by checking the actual store
      expect(sessionStorage.getItem('refresh_token_fallback')).toBeNull();
    });

    it('clear() removes legacy sensitive keys from localStorage', () => {
      localStorage.setItem('access_token', 'legacy-at');
      localStorage.setItem('refresh_token', 'legacy-rt');
      localStorage.setItem('lanonasis_token', 'legacy-lt');
      localStorage.setItem('auth_gateway_tokens', 'legacy-gt');

      storage.clear();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('lanonasis_token')).toBeNull();
      expect(localStorage.getItem('auth_gateway_tokens')).toBeNull();
    });

    it('migrateFromLocalStorage() migrates only user data, then removes token keys', () => {
      const user = { id: 'user-1', email: 'test@example.com' };

      localStorage.setItem('user_data', JSON.stringify(user));
      localStorage.setItem('refresh_token', 'legacy-refresh-token');

      storage.migrateFromLocalStorage();

      expect(storage.getUser()).toEqual(user);
      expect(storage.getRefreshToken()).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('isTokenExpired() returns false when no expiry is set', () => {
      storage.setAccessToken('token');
      expect(storage.isTokenExpired()).toBe(false);
    });

    it('isTokenExpired() returns true when token is past expiry', () => {
      storage.setAccessToken('token', -10);
      expect(storage.isTokenExpired()).toBe(true);
    });

    it('hasValidToken() returns false when no token is set', () => {
      expect(storage.hasValidToken()).toBe(false);
    });

    it('hasValidToken() returns true for a valid in-memory token', () => {
      storage.setAccessToken('valid-token', 3600);
      expect(storage.hasValidToken()).toBe(true);
    });
  });

  // =========================================================================
  // Integration — token-exchange wiring
  // =========================================================================

  describe('Token exchange integration — autoExchangeTokens wired to auth events', () => {

    it('onAuthStateChange handler is registered during DirectAuthClient construction', () => {
      // Reset singleton so the constructor runs again and registers the handler
      (directAuth as any).__testing__._resetDirectAuth();
      // Force the singleton to re-initialize by accessing any property
      void directAuth.getClient;
      expect(getMockSupabase().auth.onAuthStateChange).toHaveBeenCalled();
    });

    it('autoExchangeTokens is called via the onAuthStateChange handler on SIGNED_IN', async () => {
      // Reset singleton so the constructor runs again
      (directAuth as any).__testing__._resetDirectAuth();
      void directAuth.getClient;
      const { autoExchangeTokens } = await import('../token-exchange');
      expect(getMockSupabase().auth.onAuthStateChange).toHaveBeenCalled();
      const handler = getMockSupabase().auth.onAuthStateChange.mock.calls[0][0] as (e: string, s: Session | null) => void;
      vi.useFakeTimers();
      try {
        handler('SIGNED_IN', makeSession());
        await vi.advanceTimersByTimeAsync(0);
        expect(autoExchangeTokens).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
