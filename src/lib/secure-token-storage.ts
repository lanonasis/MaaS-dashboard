/**
 * Secure Token Storage
 * 
 * Stores sensitive tokens (access_token, refresh_token) in memory instead of localStorage
 * to prevent XSS attacks. Tokens are cleared when the page is closed or refreshed.
 * 
 * For persistence across page reloads, we use a secure approach:
 * - Only store refresh_token in httpOnly cookies (handled by backend)
 * - Access tokens are short-lived and stored in memory only
 * - On page load, use refresh_token to get new access_token
 */

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
   * This in-memory storage is a fallback for development
   */
  setRefreshToken(token: string): void {
    this.storage.refreshToken = token;
    // Also store in sessionStorage as a fallback (less secure than httpOnly cookies but better than localStorage)
    // This allows token refresh on page reload
    try {
      sessionStorage.setItem('refresh_token_fallback', token);
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  /**
   * Get refresh token
   * First tries memory, then falls back to sessionStorage
   */
  getRefreshToken(): string | null {
    if (this.storage.refreshToken) {
      return this.storage.refreshToken;
    }
    
    // Fallback to sessionStorage (cleared when tab closes)
    try {
      return sessionStorage.getItem('refresh_token_fallback');
    } catch (e) {
      return null;
    }
  }

  /**
   * Store user data (non-sensitive)
   * User data can be stored in localStorage as it's not a security token
   */
  setUser(user: any): void {
    this.storage.user = user;
    try {
      localStorage.setItem('user_data', JSON.stringify(user));
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
      const userData = localStorage.getItem('user_data');
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
      sessionStorage.removeItem('refresh_token_fallback');
      localStorage.removeItem('user_data');
      // Clear legacy localStorage tokens for migration
      localStorage.removeItem('access_token');
      localStorage.removeItem('lanonasis_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('lanonasis_user');
      localStorage.removeItem('lanonasis_current_session');
      localStorage.removeItem('lanonasis_current_user_id');
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
      // Migrate refresh token (only one we need to persist)
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        this.setRefreshToken(refreshToken);
      }

      // Migrate user data
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          this.setUser(JSON.parse(userData));
        } catch (e) {
          console.warn('Failed to parse user data:', e);
        }
      }

      // Clear old localStorage tokens (they'll be refreshed on next API call)
      localStorage.removeItem('access_token');
      localStorage.removeItem('lanonasis_token');
    } catch (e) {
      console.warn('Migration from localStorage failed:', e);
    }
  }
}

// Export singleton instance
export const secureTokenStorage = new SecureTokenStorage();

// Export class for testing
export { SecureTokenStorage };

