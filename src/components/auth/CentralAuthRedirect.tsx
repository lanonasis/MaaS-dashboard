import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { centralAuth } from '../../lib/central-auth';

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
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    handleAuthFlow();
  }, [searchParams]);

  const handleAuthFlow = async () => {
    // Log the current state for debugging
    console.log('CentralAuthRedirect: handleAuthFlow called');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    // Check for OAuth tokens in URL (returned from onasis-core)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const authError = searchParams.get('error');
    const code = searchParams.get('code');
    
    console.log('Parsed tokens - access_token:', !!accessToken, 'refresh_token:', !!refreshToken, 'error:', authError, 'code:', code);

    // Handle authentication errors
    if (authError) {
      setError(`Authentication failed: ${authError.replace(/_/g, ' ')}`);
      return;
    }

    // Handle successful OAuth callback with tokens
    if (accessToken) {
      setIsValidating(true);
      try {
        console.log('CentralAuthRedirect: Processing access token');
        // Use central auth to handle tokens
        await centralAuth.handleAuthTokens(accessToken, refreshToken || undefined);
        
        // Redirect to dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
        console.log('CentralAuthRedirect: Redirecting to', redirectPath);
        localStorage.removeItem('redirectAfterLogin');
        
        window.location.href = redirectPath;
        return;
      } catch (e) {
        console.error('Token validation error:', e);
        setError('Failed to validate authentication. Please try again.');
        return;
      }
    }

    // Handle OAuth authorization code (if any)
    if (code) {
      // onasis-core should have already processed this and redirected with tokens
      // If we're here with just a code, something went wrong
      setError('OAuth flow incomplete. Please try again.');
      return;
    }

    // Check if user is already authenticated
    const existingToken = localStorage.getItem('access_token');
    console.log('CentralAuthRedirect: Checking existing token', !!existingToken);
    if (existingToken) {
      setIsValidating(true);
      try {
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
      // No existing token, redirect to onasis-core auth
      console.log('CentralAuthRedirect: No existing token, redirecting to onasis-core auth');
      redirectToOnasisAuth();
    }
  };

  const clearAuthTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  };

  const redirectToOnasisAuth = () => {
    // Store current path for redirect after auth
    const currentPath = window.location.pathname;
    console.log('CentralAuthRedirect: Current path', currentPath);
    if (currentPath !== '/' && currentPath !== '/auth' && currentPath !== '/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    // For development, redirect to dashboard directly
    if (process.env.NODE_ENV === 'development') {
      console.log('CentralAuthRedirect: Development mode, redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }
    
    // Redirect to onasis-core auth with platform identification
    const currentUrl = window.location.origin;
    const authUrl = new URL('https://api.lanonasis.com/auth/login');
    authUrl.searchParams.set('platform', 'dashboard');
    authUrl.searchParams.set('redirect_url', `${currentUrl}/auth/callback`);
    authUrl.searchParams.set('return_to', 'dashboard');
    
    console.log('Redirecting to onasis-core auth:', authUrl.toString());
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