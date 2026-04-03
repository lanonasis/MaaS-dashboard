/**
 * Token Exchange Utility
 *
 * Bridges Supabase authentication with auth-gateway unified token system.
 * This enables Dashboard to work seamlessly with MCP, API, CLI, and VSCode
 * by converting Supabase tokens to auth-gateway SHA-256 hashed tokens.
 */

interface TokenExchangeResponse {
  token_type: 'Bearer';
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string | undefined;
    role: string | undefined;
    project_scope?: string;
  };
}

interface TokenExchangeError {
  error: string;
  code: string;
  message?: string;
}

const AUTH_GATEWAY_URL = import.meta.env.VITE_AUTH_GATEWAY_URL || 'https://auth.lanonasis.com';
const TOKEN_STORAGE_KEY = 'auth_gateway_tokens';
type StoredAuthGatewayTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: TokenExchangeResponse['user'];
};

// SECURITY: Keep auth-gateway tokens in memory only. Never persist to browser storage.
let inMemoryAuthGatewayTokens: StoredAuthGatewayTokens | null = null;

/**
 * Exchange Supabase token for auth-gateway tokens
 *
 * @param supabaseAccessToken - The Supabase JWT access token
 * @param projectScope - Optional project scope (defaults to 'lanonasis-maas')
 * @returns Auth-gateway tokens that work with all services
 */
export async function exchangeSupabaseToken(
  supabaseAccessToken: string,
  projectScope: string = 'lanonasis-maas'
): Promise<TokenExchangeResponse> {
  try {
    const response = await fetch(`${AUTH_GATEWAY_URL}/v1/auth/token/exchange`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
        'X-Project-Scope': projectScope,
      },
      body: JSON.stringify({
        project_scope: projectScope,
        platform: 'web',
      }),
    });

    if (!response.ok) {
      const error: TokenExchangeError = await response.json();
      throw new Error(error.message || error.error || 'Token exchange failed');
    }

    const tokens: TokenExchangeResponse = await response.json();

    // Store tokens for API/MCP calls
    storeAuthGatewayTokens(tokens);

    console.log('[Token Exchange] Successfully exchanged Supabase token for auth-gateway tokens', {
      user_id: tokens.user.id,
      project_scope: tokens.user.project_scope,
      expires_in: tokens.expires_in,
    });

    return tokens;
  } catch (error) {
    console.error('[Token Exchange] Failed to exchange token:', error);
    throw error;
  }
}

/**
 * Remove legacy persistent auth-gateway tokens from localStorage.
 * Keeping this cleanup prevents stale sensitive data from lingering after deploy.
 */
function clearLegacyPersistentTokens(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[Token Exchange] Failed to clear legacy persisted token key:', error);
  }
}

/**
 * Store auth-gateway tokens in memory only.
 */
function storeAuthGatewayTokens(tokens: TokenExchangeResponse): void {
  inMemoryAuthGatewayTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      user: tokens.user,
  };

  // Ensure old persistent tokens are removed during migration.
  clearLegacyPersistentTokens();
}

/**
 * Get stored auth-gateway tokens
 */
export function getAuthGatewayTokens(): {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: TokenExchangeResponse['user'];
} | null {
  // Keep cleanup idempotent in case users still have legacy persisted data.
  clearLegacyPersistentTokens();

  if (!inMemoryAuthGatewayTokens) {
    return null;
  }

  // Check if tokens are expired
  if (inMemoryAuthGatewayTokens.expires_at < Date.now()) {
    console.warn('[Token Exchange] In-memory auth-gateway tokens are expired');
    clearAuthGatewayTokens();
    return null;
  }

  return inMemoryAuthGatewayTokens;
}

/**
 * Get auth-gateway access token for API calls
 * Returns null if no valid token exists
 */
export function getAuthGatewayAccessToken(): string | null {
  const tokens = getAuthGatewayTokens();
  return tokens?.access_token || null;
}

/**
 * Clear stored auth-gateway tokens
 */
export function clearAuthGatewayTokens(): void {
  inMemoryAuthGatewayTokens = null;
  clearLegacyPersistentTokens();
}

/**
 * Check if auth-gateway tokens are valid
 */
export function hasValidAuthGatewayTokens(): boolean {
  const tokens = getAuthGatewayTokens();
  return tokens !== null && tokens.expires_at > Date.now();
}

/**
 * Auto-exchange tokens on Supabase auth state change
 * Call this in your auth provider/context
 */
export async function autoExchangeTokens(supabaseAccessToken: string | null): Promise<void> {
  if (!supabaseAccessToken) {
    // User logged out, clear auth-gateway tokens
    clearAuthGatewayTokens();
    return;
  }

  try {
    // Exchange Supabase token for auth-gateway tokens
    await exchangeSupabaseToken(supabaseAccessToken);
  } catch (error) {
    console.error('[Token Exchange] Auto-exchange failed:', error);
    // Don't throw - allow Supabase auth to continue working
  }
}

export default {
  exchangeSupabaseToken,
  getAuthGatewayTokens,
  getAuthGatewayAccessToken,
  clearAuthGatewayTokens,
  hasValidAuthGatewayTokens,
  autoExchangeTokens,
};
