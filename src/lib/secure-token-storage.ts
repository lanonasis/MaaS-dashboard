/**
 * Secure Token Storage
 * 
 * Stores sensitive tokens (access_token, refresh_token) in memory instead of localStorage
 * to prevent XSS attacks. Tokens are cleared when the page is closed or refreshed.
 * 
 * For persistence across page reloads, we use a secure approach:
 * - Only store refresh_token in httpOnly cookies (handled by backend)
 * - Access tokens are short-lived and stored in memory only
 * - Non-sensitive user profile metadata may be persisted for UX convenience
 */

const USER_DATA_STORAGE_KEY = 'user_data';
const LEGACY_REFRESH_FALLBACK_KEY = 'refresh_token_fallback';
const LEGACY_SENSITIVE_TOKEN_KEYS = [
  'access_token',
  'lanonasis_token',
  'refresh_token',
  'auth_gateway_tokens',
];

interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: any | null;
}

class SecureTokenStorage {
  private storage: TokenStorage = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  };

  /**
   * Store access token in memory
   * Access tokens are short-lived and should not persist across page reloads
   */
  setAccessToken(token: string, expiresIn?: number): void {
    this.storage.accessToken = token;
    if (expiresIn) {
      this.storage.expiresAt = Date.now() + expiresIn * 1000;
    }
  }

  /**
   * Get access token from memory
   */
  getAccessToken(): string | null {
    // Check if token is expired
    if (this.storage.expiresAt && Date.now() >= this.storage.expiresAt) {
      this.storage.accessToken = null;
      return null;
    }
    return this.storage.accessToken;
  }

  /**
   * Store refresh token
   * Note: In production, refresh tokens should be stored in httpOnly cookies by the backend
   * This client-side fallback intentionally stays in-memory only.
   */
  setRefreshToken(token: string): void {
    this.storage.refreshToken = token;
  }

  /**
   * Get refresh token
   * Returns memory value only
   */
  getRefreshToken(): string | null {
    return this.storage.refreshToken;
  }

  /**
   * Store user data (non-sensitive)
   * User data can be stored in localStorage as it's not a security token
   */
  setUser(user: any): void {
    this.storage.user = user;
    try {
      localStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }

  /**
   * Get user data
   */
  getUser(): any | null {
    if (this.storage.user) {
      return this.storage.user;
    }
    
    try {
      const userData = localStorage.getItem(USER_DATA_STORAGE_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear all tokens and user data
   */
  clear(): void {
    this.storage = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
    };
    
    // Clear fallback storage
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(LEGACY_REFRESH_FALLBACK_KEY);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(USER_DATA_STORAGE_KEY);
        // Clear legacy sensitive tokens and token containers.
        LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem('lanonasis_user');
        localStorage.removeItem('lanonasis_current_session');
        localStorage.removeItem('lanonasis_current_user_id');
      }
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
  }

  /**
   * Check if we have a valid access token
   */
  hasValidToken(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.storage.expiresAt) {
      return false; // No expiry set, assume valid
    }
    return Date.now() >= this.storage.expiresAt;
  }

  /**
   * Initialize from existing localStorage (migration helper)
   * This helps migrate from localStorage to in-memory storage
   */
  migrateFromLocalStorage(): void {
    try {
      // Check if localStorage is available (SSR compatibility)
      if (typeof localStorage === 'undefined') {
        return;
      }

      // Migrate only non-sensitive user metadata.
      const userData = localStorage.getItem(USER_DATA_STORAGE_KEY);
      if (userData) {
        try {
          this.setUser(JSON.parse(userData));
        } catch (e) {
          console.warn('Failed to parse user data:', e);
        }
      }

      // Remove legacy persisted sensitive tokens.
      LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(LEGACY_REFRESH_FALLBACK_KEY);
      }
    } catch (e) {
      console.warn('Migration from localStorage failed:', e);
    }
  }
}

// Export singleton instance
export const secureTokenStorage = new SecureTokenStorage();

// Export class for testing
export { SecureTokenStorage };
