import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoExchangeTokens,
  clearAuthGatewayTokens,
  exchangeSupabaseToken,
  getAuthGatewayAccessToken,
  getAuthGatewayTokens,
  hasValidAuthGatewayTokens,
} from '../token-exchange';

describe('token-exchange security behavior', () => {
  beforeEach(() => {
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
