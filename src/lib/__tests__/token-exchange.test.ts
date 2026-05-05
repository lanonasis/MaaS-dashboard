import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoExchangeTokens,
  clearAuthGatewayTokens,
  exchangeSupabaseToken,
  getAuthGatewayAccessToken,
  getAuthGatewayTokens,
  hasValidAuthGatewayTokens,
} from '../token-exchange';

// ---------------------------------------------------------------------------
// Polyfill localStorage / sessionStorage so this file runs standalone.
// Uses vi.fn() wrappers so tests can use vi.mocked(...).mockImplementation().
// ---------------------------------------------------------------------------
const lsStore = new Map<string, string>();

function makeStorage(store: Map<string, string>) {
  return {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    clear: vi.fn(() => { store.clear(); }),
    key: vi.fn((i: number) => Array.from(store.keys())[i] ?? null),
    get length() { return store.size; },
  };
}

const target = typeof window !== 'undefined' ? window : globalThis;

if (!target.localStorage) {
  target.localStorage = makeStorage(lsStore) as unknown as Storage;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: target.localStorage,
    writable: true,
    configurable: true,
  });
}

describe('token-exchange security behavior', () => {
  beforeEach(() => {
    lsStore.clear();
    const ls = target.localStorage;
    vi.mocked(ls.setItem).mockReset();
    vi.mocked(ls.removeItem).mockReset();
    vi.mocked(ls.clear).mockReset();
    vi.mocked(ls.getItem).mockReset();
    vi.mocked(ls.setItem).mockImplementation((k: string, v: string) => { lsStore.set(k, v); });
    vi.mocked(ls.removeItem).mockImplementation((k: string) => { lsStore.delete(k); });
    vi.mocked(ls.clear).mockImplementation(() => { lsStore.clear(); });
    vi.mocked(ls.getItem).mockImplementation((k: string) => lsStore.get(k) ?? null);

    clearAuthGatewayTokens();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores exchanged tokens in memory only and clears legacy persisted key', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: 'Bearer',
        access_token: 'ag-access-token',
        refresh_token: 'ag-refresh-token',
        expires_in: 3600,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'member',
          project_scope: 'lanonasis-maas',
        },
      }),
    } as Response);

    await exchangeSupabaseToken('supabase-token');

    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
    expect(getAuthGatewayAccessToken()).toBe('ag-access-token');
    expect(getAuthGatewayTokens()?.refresh_token).toBe('ag-refresh-token');
    expect(hasValidAuthGatewayTokens()).toBe(true);
  });

  it('expires in-memory tokens and clears legacy persisted key', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T00:00:00.000Z'));

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: 'Bearer',
        access_token: 'short-lived-token',
        refresh_token: 'short-lived-refresh-token',
        expires_in: 1,
        user: {
          id: 'user-2',
          email: 'user2@example.com',
          role: 'member',
          project_scope: 'lanonasis-maas',
        },
      }),
    } as Response);

    await exchangeSupabaseToken('supabase-token');
    expect(getAuthGatewayTokens()).not.toBeNull();

    vi.setSystemTime(new Date('2026-04-03T00:00:02.000Z'));

    expect(getAuthGatewayTokens()).toBeNull();
    expect(hasValidAuthGatewayTokens()).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
  });

  it('clears in-memory tokens on logout auto-exchange', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        token_type: 'Bearer',
        access_token: 'active-token',
        refresh_token: 'active-refresh-token',
        expires_in: 3600,
        user: {
          id: 'user-3',
          email: 'user3@example.com',
          role: 'member',
          project_scope: 'lanonasis-maas',
        },
      }),
    } as Response);

    await exchangeSupabaseToken('supabase-token');
    expect(getAuthGatewayAccessToken()).toBe('active-token');

    await autoExchangeTokens(null);

    expect(getAuthGatewayAccessToken()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
  });
});
