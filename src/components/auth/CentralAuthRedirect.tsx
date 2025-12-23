import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { centralAuth } from '../../lib/central-auth';
import { secureTokenStorage } from '../../lib/secure-token-storage';

/**
 * Central Auth Redirect Component
 * 
 * This component handles all authentication by redirecting to the centralized
 * onasis-core auth system instead of handling auth locally.
 * 
 * Authentication Flow:
 * 1. Dashboard → onasis-core/auth/login (with OAuth providers)
 * 2. onasis-core handles OAuth flow and JWT generation
 * 3. onasis-core redirects back with tokens
 * 4. Dashboard validates tokens and proceeds to dashboard
 */
const CentralAuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleAuthFlow = async () => {
    // Log the current state for debugging
    console.log('CentralAuthRedirect: handleAuthFlow called');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const currentPath = window.location.pathname;
    const isCallbackPath = currentPath === '/auth/callback';
    
    // Check for OAuth tokens in URL (returned from onasis-core)
    let accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const authError = searchParams.get('error');
    const code = searchParams.get('code');
    
    // Check for user-specific callback parameters
    const sessionId = searchParams.get('session');
    const userId = searchParams.get('user_id');
    const urlToken = searchParams.get('token');
    const timestamp = searchParams.get('timestamp');
    
    console.log('User-specific parameters:', { sessionId, userId, urlToken: !!urlToken, timestamp });
    
    // Prioritize URL token if available (more immediate)
    if (!accessToken && urlToken) {
      accessToken = urlToken;
      console.log('CentralAuthRedirect: Using token from URL parameters');
    }
    
    // Also check secure storage for tokens (migrated from localStorage) with retry for timing issues
    if (!accessToken) {
      // Check secure in-memory storage first
      accessToken = secureTokenStorage.getAccessToken();
      console.log('CentralAuthRedirect: Found token in secure storage (immediate):', !!accessToken);
      
      // Fallback to localStorage for migration (legacy support)
      if (!accessToken) {
        accessToken = localStorage.getItem('access_token') || localStorage.getItem('lanonasis_token');
        if (accessToken) {
          // Migrate to secure storage
          secureTokenStorage.setAccessToken(accessToken);
          localStorage.removeItem('access_token');
          localStorage.removeItem('lanonasis_token');
        }
      }
      
      // If no token found and this is a callback with session info, wait a bit and retry
      if (!accessToken && isCallbackPath && (sessionId || userId)) {
        console.log('CentralAuthRedirect: User-specific callback but no immediate token, retrying in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        accessToken = secureTokenStorage.getAccessToken() || localStorage.getItem('access_token') || localStorage.getItem('lanonasis_token');
        console.log('CentralAuthRedirect: Found token (retry):', !!accessToken);
        
        // One more retry if still not found
        if (!accessToken) {
          console.log('CentralAuthRedirect: Still no token, retrying in 1000ms...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          accessToken = secureTokenStorage.getAccessToken() || localStorage.getItem('access_token') || localStorage.getItem('lanonasis_token');
          console.log('CentralAuthRedirect: Found token (final retry):', !!accessToken);
        }
      }
    }
    
    console.log('Parsed tokens - access_token:', !!accessToken, 'refresh_token:', !!refreshToken, 'error:', authError, 'code:', code);
    console.log('Is callback path:', isCallbackPath);

    // Handle OAuth callback on root path (redirect to proper callback handler)
    // This ensures OAuth callbacks to /?code=xxx are properly routed to /auth/callback
    if (window.location.pathname === '/' && (code || accessToken || authError)) {
      console.log('CentralAuthRedirect: OAuth callback detected on root path, redirecting to callback handler');
      // Redirect to proper callback handler with all parameters
      window.location.href = `/auth/callback${window.location.search}`;
      return;
    }

    // Handle authentication errors
    if (authError) {
      setError(`Authentication failed: ${authError.replace(/_/g, ' ')}`);
      return;
    }

    // Handle successful OAuth callback with tokens
    if (accessToken) {
      setIsValidating(true);
      try {
        console.log('CentralAuthRedirect: Processing access token for user:', userId || 'unknown');
        console.log('CentralAuthRedirect: Session ID:', sessionId);
        
        // Get user data from secure storage or localStorage (migration)
        if (!refreshToken) {
          const user = secureTokenStorage.getUser();
          if (!user) {
            // Try legacy localStorage
            const userData = localStorage.getItem('lanonasis_user');
            if (userData) {
              try {
                const parsedUser = JSON.parse(userData);
                secureTokenStorage.setUser(parsedUser);
                localStorage.removeItem('lanonasis_user');
              } catch (e) {
                console.error('Error parsing user data:', e);
              }
            }
          }
        }
        
        // Use central auth to handle tokens (stores in secure storage)
        await centralAuth.handleAuthTokens(accessToken, refreshToken || undefined);
        
        // Store session info (non-sensitive, can use localStorage)
        if (sessionId) {
          localStorage.setItem('lanonasis_current_session', sessionId);
        }
        if (userId) {
          localStorage.setItem('lanonasis_current_user_id', userId);
        }
        if (timestamp) {
          localStorage.setItem('lanonasis_auth_timestamp', timestamp);
        }
        
        // Clean up old localStorage tokens (migrated to secure storage)
        localStorage.removeItem('lanonasis_token');
        localStorage.removeItem('lanonasis_user');
        
        // Redirect to personalized dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
        console.log('CentralAuthRedirect: Redirecting authenticated user', userId, 'to', redirectPath);
        localStorage.removeItem('redirectAfterLogin');
        
        // Use React Router navigation instead of direct browser navigation
        // This keeps us in the SPA context and avoids race conditions with token processing
        console.log('CentralAuthRedirect: Using React Router navigate() for SPA navigation');
        navigate(redirectPath);
        return;
      } catch (e) {
        console.error('Token validation error:', e);
        setError('Failed to validate authentication. Please try again.');
        return;
      } finally {
        setIsValidating(false);
      }
    }

    // Handle OAuth authorization code (if any)
    if (code) {
      // onasis-core should have already processed this and redirected with tokens
      // If we're here with just a code, something went wrong
      setError('OAuth flow incomplete. Please try again.');
      return;
    }

    // Check if user is already authenticated (either new or old token format)
    const existingToken = localStorage.getItem('access_token') || localStorage.getItem('lanonasis_token');
    console.log('CentralAuthRedirect: Checking existing token', !!existingToken);
    if (existingToken) {
      setIsValidating(true);
      try {
        // If we have the old format token, migrate it first
        if (localStorage.getItem('lanonasis_token') && !localStorage.getItem('access_token')) {
          console.log('CentralAuthRedirect: Migrating old token format');
          localStorage.setItem('access_token', existingToken);
          
          const oldUserData = localStorage.getItem('lanonasis_user');
          if (oldUserData) {
            try {
              const user = JSON.parse(oldUserData);
              localStorage.setItem('user_data', JSON.stringify(user));
            } catch (e) {
              console.error('Error migrating user data:', e);
            }
          }
          
          // Clean up old tokens
          localStorage.removeItem('lanonasis_token');
          localStorage.removeItem('lanonasis_user');
        }
        
        console.log('CentralAuthRedirect: Validating existing session');
        const session = await centralAuth.getCurrentSession();
        console.log('CentralAuthRedirect: Session validation result', session);
        
        if (session && session.user) {
          // Token is valid, redirect to dashboard
          console.log('CentralAuthRedirect: Token valid, redirecting to dashboard');
          window.location.href = '/dashboard';
          return;
        } else {
          // Token invalid, clear and redirect to auth
          console.log('CentralAuthRedirect: Token invalid, clearing and redirecting to auth');
          clearAuthTokens();
          redirectToOnasisAuth();
        }
      } catch (e) {
        // Network error or other issue, redirect to auth
        console.error('Session validation error:', e);
        clearAuthTokens();
        redirectToOnasisAuth();
      }
    } else {
      // No existing token - handle callback appropriately
      if (isCallbackPath && !code && !authError && !accessToken) {
        // Check if this came from auth gateway (legitimate redirect)
        const referrer = document.referrer;
        const isFromAuth = referrer && (referrer.includes('api.lanonasis.com') || referrer.includes('auth'));
        
        if (isFromAuth) {
          // Legitimate redirect from auth but no tokens - auth gateway issue
          console.log('CentralAuthRedirect: Callback from auth gateway but no session data found, redirecting to login');
          // Don't show error, just redirect to login cleanly
          redirectToOnasisAuth();
          return;
        } else {
          // True direct access to callback - show minimal error
          console.log('CentralAuthRedirect: Direct access to callback');
          setError('Please sign in to continue.');
          return;
        }
      }
      
      // No existing token, redirect to onasis-core auth
      console.log('CentralAuthRedirect: No existing token, redirecting to onasis-core auth');
      redirectToOnasisAuth();
    }
  };

  useEffect(() => {
    handleAuthFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const clearAuthTokens = () => {
    // Remove both token formats and all user data
    localStorage.removeItem('access_token');
    localStorage.removeItem('lanonasis_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('lanonasis_user');
    localStorage.removeItem('lanonasis_current_session');
    localStorage.removeItem('lanonasis_current_user_id');
  };

  const redirectToOnasisAuth = () => {
    // Store current path for redirect after auth
    const currentPath = window.location.pathname;
    console.log('CentralAuthRedirect: Current path', currentPath);
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    // Get auth gateway URL from environment
    const authGatewayUrl = import.meta.env.VITE_AUTH_GATEWAY_URL || import.meta.env.VITE_API_URL || 'https://auth.lanonasis.com';
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;
    
    // Redirect to local auth gateway with OAuth flow
    const currentUrl = window.location.origin;
    const authUrl = new URL(`${authGatewayUrl}/v1/auth/login`);
    authUrl.searchParams.set('platform', 'web');
    authUrl.searchParams.set('project_scope', 'app_maas_dashboard');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    
    // Add OAuth client ID if available
    if (clientId) {
      authUrl.searchParams.set('client_id', clientId);
    }
    
    console.log('Redirecting to auth gateway:', authUrl.toString());
    window.location.href = authUrl.toString();
  };

  const handleRetry = () => {
    setError(null);
    setIsValidating(false);
    redirectToOnasisAuth();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center shadow-lg">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button 
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isValidating ? 'Validating Authentication' : 'Connecting to Onasis-CORE'}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {isValidating 
            ? 'Verifying your credentials...' 
            : 'Redirecting to secure authentication...'
          }
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          🔒 Powered by Onasis-CORE Authentication
        </div>
      </div>
    </div>
  );
};

export default CentralAuthRedirect;