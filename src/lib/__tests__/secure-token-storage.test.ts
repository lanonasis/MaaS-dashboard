import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureTokenStorage } from '../secure-token-storage';

// ---------------------------------------------------------------------------
// Polyfill localStorage / sessionStorage so this file runs standalone.
// Uses vi.fn() wrappers so tests can use vi.mocked(...).mockImplementation().
// ---------------------------------------------------------------------------
const lsStore = new Map<string, string>();
const ssStore = new Map<string, string>();

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

// Determine where to mount the storage mock
const target = typeof window !== 'undefined' ? window : globalThis;

if (!target.localStorage) {
  target.localStorage = makeStorage(lsStore) as unknown as Storage;
}
if (!target.sessionStorage) {
  target.sessionStorage = makeStorage(ssStore) as unknown as Storage;
}

// Re-configure window properties if running in a browser-like environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: target.localStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: target.sessionStorage,
    writable: true,
    configurable: true,
  });
}

describe('SecureTokenStorage security behavior', () => {
  let storage: SecureTokenStorage;

  beforeEach(() => {
    // Reset stores and mock call counts between tests
    lsStore.clear();
    ssStore.clear();
    const ls = target.localStorage;
    const ss = target.sessionStorage;
    vi.mocked(ls.getItem).mockReset();
    vi.mocked(ls.setItem).mockReset();
    vi.mocked(ls.removeItem).mockReset();
    vi.mocked(ls.clear).mockReset();
    vi.mocked(ss.getItem).mockReset();
    vi.mocked(ss.setItem).mockReset();
    vi.mocked(ss.removeItem).mockReset();
    vi.mocked(ss.clear).mockReset();
    // Re-install real Map-backed behavior after reset
    vi.mocked(ls.getItem).mockImplementation((k: string) => lsStore.get(k) ?? null);
    vi.mocked(ls.setItem).mockImplementation((k: string, v: string) => { lsStore.set(k, v); });
    vi.mocked(ls.removeItem).mockImplementation((k: string) => { lsStore.delete(k); });
    vi.mocked(ls.clear).mockImplementation(() => { lsStore.clear(); });
    vi.mocked(ss.getItem).mockImplementation((k: string) => ssStore.get(k) ?? null);
    vi.mocked(ss.setItem).mockImplementation((k: string, v: string) => { ssStore.set(k, v); });
    vi.mocked(ss.removeItem).mockImplementation((k: string) => { ssStore.delete(k); });
    vi.mocked(ss.clear).mockImplementation(() => { ssStore.clear(); });

    // Create fresh SecureTokenStorage — also clears its own in-memory state
    storage = new SecureTokenStorage();
  });

  it('keeps refresh tokens in memory only', () => {
    storage.setRefreshToken('refresh-token');

    expect(storage.getRefreshToken()).toBe('refresh-token');
    // No localStorage/sessionStorage calls for refresh tokens (memory-only)
    expect(ls.setItem).not.toHaveBeenCalled();
    expect(ss.setItem).not.toHaveBeenCalled();
  });

  it('migrates only non-sensitive user data and clears legacy token keys', () => {
    const user = { id: 'user-1', email: 'user@example.com' };

    ls.getItem.mockImplementation((key: string) => {
      if (key === 'user_data') {
        return JSON.stringify(user);
      }
      if (key === 'refresh_token') {
        return 'legacy-refresh-token';
      }
      return null;
    });

    storage.migrateFromLocalStorage();

    expect(storage.getUser()).toEqual(user);
    expect(storage.getRefreshToken()).toBeNull();

    expect(ls.removeItem).toHaveBeenCalledWith('access_token');
    expect(ls.removeItem).toHaveBeenCalledWith('lanonasis_token');
    expect(ls.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(ls.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
    expect(ss.removeItem).toHaveBeenCalledWith('refresh_token_fallback');
  });

  it('clears in-memory tokens and removes legacy persisted token keys', () => {
    storage.setAccessToken('access-token', 3600);
    storage.setRefreshToken('refresh-token');
    storage.setUser({ id: 'user-2' });

    vi.clearAllMocks();

    storage.clear();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(ss.removeItem).toHaveBeenCalledWith('refresh_token_fallback');
    expect(ls.removeItem).toHaveBeenCalledWith('access_token');
    expect(ls.removeItem).toHaveBeenCalledWith('lanonasis_token');
    expect(ls.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(ls.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
  });
});
