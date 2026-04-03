import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SupabaseAuthRedirect from './SupabaseAuthRedirect';

/**
 * @deprecated Transitional compatibility path only.
 *
 * Task #130/#136 owner cleanup:
 * - direct-auth (Supabase) is the only interactive auth owner
 * - legacy central-auth callback/session artifacts are invalidated
 * - users are predictably redirected into direct-auth re-login
 */
const CENTRAL_AUTH_REAUTH_FLAG = 'lanonasis_central_auth_reauth_required_v136';
const LEGACY_SENSITIVE_TOKEN_KEYS = [
  'access_token',
  'lanonasis_token',
  'refresh_token',
  'auth_gateway_tokens',
];
const LEGACY_CALLBACK_METADATA_KEYS = [
  'lanonasis_current_session',
  'lanonasis_current_user_id',
  'lanonasis_auth_timestamp',
  'lanonasis_user',
];
const LEGACY_SESSION_STORAGE_KEYS = ['refresh_token_fallback'];

const CentralAuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const clearLegacyCentralArtifacts = (includeMetadata: boolean) => {
    LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    LEGACY_SESSION_STORAGE_KEYS.forEach((key) => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    });
    if (includeMetadata) {
      LEGACY_CALLBACK_METADATA_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  };

  const redirectToDirectAuthLogin = () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(CENTRAL_AUTH_REAUTH_FLAG, '1');
      }
      navigate('/?showAuth=true&reauth=central-auth-migration', { replace: true });
    } catch {
      setError(
        'Legacy authentication was retired and this session must be re-authenticated with direct auth. Please continue to login.'
      );
    }
  };

  useEffect(() => {
    console.warn(
      'CentralAuthRedirect is deprecated as an auth owner. Interactive auth now routes through Supabase direct-auth only.'
    );

    const authError = searchParams.get('error');
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasSupabaseCallbackParams = Boolean(
      searchParams.get('code') ||
      searchParams.get('error') ||
      searchParams.get('error_description') ||
      hashParams.get('access_token') ||
      hashParams.get('error')
    );
    const hasLegacyTokenParams = Boolean(
      searchParams.get('token') ||
      searchParams.get('access_token') ||
      searchParams.get('refresh_token')
    );
    const hasLegacyMetadataParams = Boolean(
      searchParams.get('session') ||
      searchParams.get('user_id') ||
      searchParams.get('timestamp')
    );
    const hasLegacyStoredArtifacts = [
      ...LEGACY_SENSITIVE_TOKEN_KEYS,
      ...LEGACY_CALLBACK_METADATA_KEYS,
    ].some((key) => Boolean(localStorage.getItem(key)));

    if (authError && !hasSupabaseCallbackParams) {
      clearLegacyCentralArtifacts(true);
      redirectToDirectAuthLogin();
      setError(`Authentication failed: ${authError.replace(/_/g, ' ')}`);
      return;
    }

    if ((hasLegacyTokenParams || hasLegacyMetadataParams) && !hasSupabaseCallbackParams) {
      clearLegacyCentralArtifacts(true);
      redirectToDirectAuthLogin();
      return;
    }

    if (hasLegacyStoredArtifacts && !hasSupabaseCallbackParams) {
      clearLegacyCentralArtifacts(true);
    }
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-4 text-center shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth/login', { replace: true })}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Continue to Direct Login
          </button>
        </div>
      </div>
    );
  }

  return <SupabaseAuthRedirect />;
};

export default CentralAuthRedirect;
