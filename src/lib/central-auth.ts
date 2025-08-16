// Central Authentication Gateway API Client
// This module handles communication with the onasis-core auth gateway
// Updated to use OAuth flow and platform-specific authentication

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    platform?: string;
    provider?: string;
    project_scope?: string;
    avatar_url?: string;
  };
}

interface ApiKey {
  id: string;
  key: string;
  service: string;
  user_id: string;
  expires_at: string | null;
  rate_limited: boolean;
  created_at: string;
  last_used: string | null;
  name?: string;
}

interface CreateApiKeyRequest {
  name: string;
  service: string;
  expires_at?: string | null;
  rate_limited: boolean;
}

interface ApiKeyResponse {
  id: string;
  key: string;
  service: string;
  expires_at: string | null;
  rate_limited: boolean;
  created_at: string;
  name?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.lanonasis.com';
const PROJECT_SCOPE = import.meta.env.VITE_PROJECT_SCOPE || 'dashboard';
const PLATFORM = 'dashboard';

class CentralAuthClient {
  private getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setStoredToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private removeStoredToken(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let token = this.getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Platform': PLATFORM,
        'X-Project-Scope': PROJECT_SCOPE,
        ...options.headers,
      },
    });

    // Handle token expiration and retry with refresh
    if (response.status === 401) {
      try {
        await this.refreshToken();
        token = this.getStoredToken();
        
        if (!token) {
          throw new Error('Failed to refresh authentication token');
        }

        return fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Platform': PLATFORM,
            'X-Project-Scope': PROJECT_SCOPE,
            ...options.headers,
          },
        });
      } catch (refreshError) {
        this.removeStoredToken();
        throw new Error('Authentication failed - please log in again');
      }
    }

    return response;
  }

  // OAuth redirect methods - redirect to onasis-core for authentication
  async loginWithProvider(provider: string): Promise<void> {
    const redirectUrl = `${window.location.origin}/?return=auth`;
    const authUrl = new URL(`${API_BASE_URL}/auth/login`);
    authUrl.searchParams.set('platform', PLATFORM);
    authUrl.searchParams.set('provider', provider);
    authUrl.searchParams.set('redirect_url', redirectUrl);
    
    // Store current path for post-auth redirect
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    window.location.href = authUrl.toString();
  }

  // Legacy login method - redirects to onasis-core login page
  async login(email?: string, password?: string): Promise<never> {
    console.warn('Traditional login deprecated. Redirecting to centralized auth...');
    const redirectUrl = `${window.location.origin}/?return=auth`;
    const authUrl = new URL(`${API_BASE_URL}/auth/login`);
    authUrl.searchParams.set('platform', PLATFORM);
    authUrl.searchParams.set('redirect_url', redirectUrl);
    
    window.location.href = authUrl.toString();
    throw new Error('Redirecting to centralized authentication');
  }

  // Legacy signup method - redirects to onasis-core login page
  async signup(email?: string, password?: string, name?: string): Promise<never> {
    console.warn('Traditional signup deprecated. Redirecting to centralized auth...');
    const redirectUrl = `${window.location.origin}/?return=auth`;
    const authUrl = new URL(`${API_BASE_URL}/auth/login`);
    authUrl.searchParams.set('platform', PLATFORM);
    authUrl.searchParams.set('redirect_url', redirectUrl);
    
    window.location.href = authUrl.toString();
    throw new Error('Redirecting to centralized authentication');
  }

  async refreshToken(): Promise<AuthSession> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform': PLATFORM,
        'X-Project-Scope': PROJECT_SCOPE,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.removeStoredToken();
      throw new Error('Token refresh failed');
    }

    const session = await response.json();
    this.setStoredToken(session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    localStorage.setItem('user_data', JSON.stringify(session.user));
    return session;
  }

  async logout(): Promise<void> {
    try {
      await this.makeAuthenticatedRequest('/v1/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if request fails
      console.warn('Logout request failed:', error);
    } finally {
      this.removeStoredToken();
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const response = await this.makeAuthenticatedRequest('/v1/auth/verify');
      
      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      
      // Transform to AuthSession format
      return {
        access_token: this.getStoredToken() || '',
        refresh_token: localStorage.getItem('refresh_token') || '',
        expires_in: 3600, // Default 1 hour
        user: userData.user || userData
      };
    } catch (error) {
      return null;
    }
  }

  // API Key Management Methods - route through onasis-core
  async createApiKey(request: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    const response = await this.makeAuthenticatedRequest('/v1/keys', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create API key' }));
      throw new Error(error.message || 'Failed to create API key');
    }

    return response.json();
  }

  async listApiKeys(): Promise<ApiKey[]> {
    const response = await this.makeAuthenticatedRequest('/v1/keys');

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch API keys' }));
      throw new Error(error.message || 'Failed to fetch API keys');
    }

    const data = await response.json();
    return data.keys || data.data || [];
  }

  async revokeApiKey(keyId: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`/v1/keys/${keyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to revoke API key' }));
      throw new Error(error.message || 'Failed to revoke API key');
    }
  }

  async getApiKeyUsage(keyId: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`/v1/keys/${keyId}/usage`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch API key usage' }));
      throw new Error(error.message || 'Failed to fetch API key usage');
    }

    return response.json();
  }

  // Handle auth tokens from URL parameters (from onasis-core OAuth flow)
  async handleAuthTokens(accessToken: string, refreshToken?: string): Promise<AuthSession> {
    // Store tokens
    this.setStoredToken(accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

    // Verify token with onasis-core
    const response = await fetch(`${API_BASE_URL}/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Platform': PLATFORM,
        'X-Project-Scope': PROJECT_SCOPE,
      }
    });

    if (!response.ok) {
      this.removeStoredToken();
      throw new Error('Token validation failed');
    }

    const userData = await response.json();
    
    // Store user data
    localStorage.setItem('user_data', JSON.stringify(userData.user || userData));
    
    // Return session format
    return {
      access_token: accessToken,
      refresh_token: refreshToken || '',
      expires_in: 3600,
      user: userData.user || userData
    };
  }

  // Health check to verify central auth is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-Project-Scope': PROJECT_SCOPE,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const centralAuth = new CentralAuthClient();
export type { AuthSession, ApiKey, CreateApiKeyRequest, ApiKeyResponse };