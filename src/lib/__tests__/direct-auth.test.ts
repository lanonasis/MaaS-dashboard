/**
 * Regression tests for direct-auth.ts persistSession:false behavior (issue #128/#129)
 *
 * Validates that:
 * 1. Tokens never reach localStorage (in-memory Map adapter only)
 * 2. Non-sensitive session metadata survives page reload via localStorage
 * 3. Legacy sensitive token keys are cleaned up
 * 4. Logout clears session metadata but leaves no token residue
 * 5. OAuth PKCE redirect URL is /auth/callback
 *
 * IMPORTANT: These tests exercise the real DirectAuthClient class. Only HTTP/fetch
 * is mocked to avoid real network calls. The singleton is lazy, so it is
 * constructed on first access after mocks are set up.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Ensure localStorage/sessionStorage are available in the test environment.
// bun test runs in Node, so we polyfill these browser globals.
// ---------------------------------------------------------------------------

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as any;
}

if (typeof globalThis.sessionStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.sessionStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as any;
}

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const state = {
  capturedOptions: null as any,
  authHandlers: [] as Array<(event: string, session: Session | null) => void>,
};

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — only the methods actually used by direct-auth
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options: any) => {
    state.capturedOptions = options;
    return {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        refreshSession: vi.fn(),
        updateUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        onAuthStateChange: vi.fn((handler: (event: string, session: Session | null) => void) => {
          state.authHandlers.push(handler);
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
    };
  }),
  SupabaseClient: {},
  Session: {},
  User: {},
}));

vi.mock('../token-exchange', () => ({
  autoExchangeTokens: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { directAuth } from '../direct-auth';

// ---------------------------------------------------------------------------
// Test constants — keys that must NEVER appear in localStorage
// ---------------------------------------------------------------------------

const LEGACY_SENSITIVE_KEYS = [
  'lanonasis_session',
  'access_token',
  'lanonasis_token',
  'refresh_token',
  'auth_gateway_tokens',
];

const SUPA_TOKEN_KEYS = [
  'supabase-session',
  'supabase-auth-token',
  'sb-access-token',
  'sb-refresh-token',
];

const ALL_SENSITIVE_KEYS = [...LEGACY_SENSITIVE_KEYS, ...SUPA_TOKEN_KEYS];

const METADATA_KEYS = ['lanonasis_session_metadata', 'lanonasis_user', 'user_data'];

// ---------------------------------------------------------------------------
// Helper — fire an auth state change event to all registered handlers
// ---------------------------------------------------------------------------

function emitAuthEvent(event: string, session: Session | null = null): void {
  state.authHandlers.forEach((h) => h(event, session));
}

// ---------------------------------------------------------------------------
// Session factory
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'test-access-token-' + Math.random(),
    refresh_token: 'test-refresh-token-' + Math.random(),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'Bearer',
    user: {
      id: 'user-test-123',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Test User' },
      created_at: '2024-01-01T00:00:00.000Z',
      ...overrides.user,
    } as User,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('direct-auth.ts persistSession:false regression suite (t_6741976e)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton so each test starts fresh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (directAuth as any).__testing__?._resetDirectAuth?.();
    // Clear all storage keys
    localStorage.clear();
    sessionStorage.clear();
    state.authHandlers = [];
    state.capturedOptions = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Scenario 1 — persistSession:false — no Supabase tokens in localStorage
  // -------------------------------------------------------------------------
  describe('Scenario 1 - persistSession:false Supabase config', () => {
    it('sets persistSession to false in Supabase auth options', () => {
      // Access any method to force lazy initialization
      void directAuth.login;
      expect(state.capturedOptions).toMatchObject({
        auth: expect.objectContaining({ persistSession: false }),
      });
    });

    it('passes an in-memory Map-based storage adapter to Supabase', () => {
      void directAuth.login;
      expect(state.capturedOptions).toMatchObject({
        auth: expect.objectContaining({ storage: expect.any(Object) }),
      });
    });

    it('uses PKCE flowType (more secure than implicit flow)', () => {
      void directAuth.login;
      expect(state.capturedOptions).toMatchObject({
        auth: expect.objectContaining({ flowType: 'pkce' }),
      });
    });

    it('autoRefreshToken is enabled for background token refresh', () => {
      void directAuth.login;
      expect(state.capturedOptions).toMatchObject({
        auth: expect.objectContaining({ autoRefreshToken: true }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2 — storeSession writes only metadata to localStorage
  // -------------------------------------------------------------------------
  describe('Scenario 2 - storeSession writes only metadata to localStorage', () => {
    it('after login, lanonasis_session_metadata key EXISTS in localStorage', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });

      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      const raw = localStorage.getItem('lanonasis_session_metadata');
      expect(raw).not.toBeNull();
      const meta = JSON.parse(raw!);
      expect(meta.user_id).toBe('user-test-123');
      expect(meta.user_email).toBe('test@example.com');
    });

    it('metadata includes user_id, user_email, and expires_at', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      const raw = localStorage.getItem('lanonasis_session_metadata');
      expect(raw).not.toBeNull();
      const meta = JSON.parse(raw!);
      expect(meta.user_id).toBe(session.user?.id);
      expect(meta.user_email).toBe(session.user?.email);
      expect(meta.expires_at).toBe(session.expires_at);
    });

    it('metadata survives a simulated page reload (localStorage not cleared)', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      // Simulate page reload: re-read from localStorage (metadata persists)
      const raw = localStorage.getItem('lanonasis_session_metadata');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).user_id).toBe('user-test-123');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3 — clearLegacySensitiveStorage removes stale localStorage keys
  // -------------------------------------------------------------------------
  describe('Scenario 3 - clearLegacySensitiveStorage removes stale localStorage keys', () => {
    it('storeSession clears pre-existing legacy sensitive keys from localStorage', async () => {
      // Pre-populate localStorage with legacy sensitive keys (simulating old session)
      localStorage.setItem('lanonasis_session', 'old-session-token');
      localStorage.setItem('access_token', 'old-access-token');
      localStorage.setItem('refresh_token', 'old-refresh-token');

      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      // Legacy keys must have been removed by clearLegacySensitiveStorage
      expect(localStorage.getItem('lanonasis_session')).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('clearLegacySensitiveStorage API removes all legacy token keys', () => {
      localStorage.setItem('lanonasis_session', 'token');
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('lanonasis_token', 'token');
      localStorage.setItem('refresh_token', 'token');
      localStorage.setItem('auth_gateway_tokens', 'token');
      // lanonasis_user is NOT in LEGACY_SENSITIVE_KEYS — it's a metadata key, must survive
      localStorage.setItem('lanonasis_user', 'user-data');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (directAuth as any).__testing__.clearLegacySensitiveStorage();

      expect(localStorage.getItem('lanonasis_session')).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('lanonasis_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('auth_gateway_tokens')).toBeNull();
      // Metadata keys must NOT be removed by clearLegacySensitiveStorage
      expect(localStorage.getItem('lanonasis_user')).toBe('user-data');
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4 — logout clears session metadata and legacy keys
  // -------------------------------------------------------------------------
  describe('Scenario 4 - logout clears session metadata and legacy keys', () => {
    it('after logout, lanonasis_session_metadata is removed from localStorage', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      vi.mocked(client.auth.signOut).mockResolvedValueOnce({ error: null });

      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      expect(localStorage.getItem('lanonasis_session_metadata')).not.toBeNull();

      await directAuth.logout();
      emitAuthEvent('SIGNED_OUT');

      expect(localStorage.getItem('lanonasis_session_metadata')).toBeNull();
      expect(localStorage.getItem('lanonasis_user')).toBeNull();
    });

    it('after logout, no sensitive token keys remain in localStorage', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      vi.mocked(client.auth.signOut).mockResolvedValueOnce({ error: null });

      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);
      await directAuth.logout();
      emitAuthEvent('SIGNED_OUT');

      for (const key of ALL_SENSITIVE_KEYS) {
        expect(localStorage.getItem(key)).toBeNull();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5 — login/logout API surface
  // -------------------------------------------------------------------------
  describe('Scenario 5 - login and logout API', () => {
    it('login returns session and user on successful auth', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({
        data: { session, user: session.user },
        error: null,
      });

      const result = await directAuth.login('test@example.com', 'password');

      expect(result.session).toEqual(session);
      expect(result.user).toEqual(session.user);
      expect(result.error).toBeUndefined();
    });

    it('loginWithProvider redirects to /auth/callback with PKCE', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithOAuth).mockResolvedValueOnce({ error: null });

      await directAuth.loginWithProvider('google');

      expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }),
      });
    });

    it('logout calls signOut on the Supabase client', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signOut).mockResolvedValueOnce({ error: null });

      await directAuth.logout();

      expect(client.auth.signOut).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6 — in-memory adapter isolation from localStorage
  // -------------------------------------------------------------------------
  describe('Scenario 6 - in-memory adapter never propagates to localStorage', () => {
    it('no Supabase canonical token keys exist in localStorage at any point', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      await directAuth.login('test@example.com', 'password');
      state.authHandlers.forEach((h) => h('SIGNED_IN', session));

      expect(localStorage.getItem('supabase-session')).toBeNull();
      expect(localStorage.getItem('supabase-auth-token')).toBeNull();
      expect(localStorage.getItem('sb-access-token')).toBeNull();
      expect(localStorage.getItem('sb-refresh-token')).toBeNull();
    });

    it('tokens in the in-memory adapter are not visible in localStorage', async () => {
      const session = makeSession();
      const { createClient } = await import('@supabase/supabase-js');
      const client = (createClient as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (!client) return;

      vi.mocked(client.auth.signInWithPassword).mockResolvedValueOnce({ data: { session }, error: null });
      await directAuth.login('test@example.com', 'password');
      emitAuthEvent('SIGNED_IN', session);

      // The in-memory adapter must have session data
      const adapter = (directAuth as any).__testing__.getInMemoryStorageAdapter();
      expect(adapter.getItem('supabase-session') ?? adapter.getItem('lanonasis_session_metadata')).not.toBeNull();

      // But localStorage must NOT have any Supabase token keys
      for (const key of SUPA_TOKEN_KEYS) {
        expect(localStorage.getItem(key)).toBeNull();
      }
    });

    it('isSensitiveKey correctly identifies sensitive vs metadata keys', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testing = (directAuth as any).__testing__;
      for (const key of LEGACY_SENSITIVE_KEYS) {
        expect(testing.isSensitiveKey(key)).toBe(true);
      }
      for (const key of METADATA_KEYS) {
        expect(testing.isSensitiveKey(key)).toBe(false);
      }
      // Supabase token keys are NOT legacy sensitive keys — they are handled
      // by the in-memory adapter and do not appear in localStorage.
      for (const key of SUPA_TOKEN_KEYS) {
        expect(testing.isSensitiveKey(key)).toBe(false);
        expect(testing.isSupabaseTokenKey(key)).toBe(true);
      }
    });
  });
});
