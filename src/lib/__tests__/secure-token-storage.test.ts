import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureTokenStorage } from '../secure-token-storage';

describe('SecureTokenStorage security behavior', () => {
  let storage: SecureTokenStorage;

  beforeEach(() => {
    storage = new SecureTokenStorage();
    vi.clearAllMocks();
  });

  it('keeps refresh tokens in memory only', () => {
    storage.setRefreshToken('refresh-token');

    expect(storage.getRefreshToken()).toBe('refresh-token');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalledWith('refresh_token', expect.anything());
  });

  it('migrates only non-sensitive user data and clears legacy token keys', () => {
    const user = { id: 'user-1', email: 'user@example.com' };

    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
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

    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('lanonasis_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('refresh_token_fallback');
  });

  it('clears in-memory tokens and removes legacy persisted token keys', () => {
    storage.setAccessToken('access-token', 3600);
    storage.setRefreshToken('refresh-token');
    storage.setUser({ id: 'user-2' });

    vi.clearAllMocks();

    storage.clear();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('refresh_token_fallback');
    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('lanonasis_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_gateway_tokens');
  });
});
