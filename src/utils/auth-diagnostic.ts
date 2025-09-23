/**
 * Authentication Diagnostic Utility
 * Run this in the browser console to diagnose auth issues
 */

export const runAuthDiagnostic = () => {
  console.log('=== Authentication Diagnostic Report ===');
  console.log(`Current URL: ${window.location.href}`);
  console.log(`Current Path: ${window.location.pathname}`);
  console.log(`Referrer: ${document.referrer}`);
  
  // Check environment variables
  console.log('\n--- Environment Configuration ---');
  console.log(`VITE_USE_CENTRAL_AUTH: ${import.meta.env.VITE_USE_CENTRAL_AUTH}`);
  console.log(`VITE_USE_FALLBACK_AUTH: ${import.meta.env.VITE_USE_FALLBACK_AUTH}`);
  console.log(`VITE_API_URL: ${import.meta.env.VITE_API_URL}`);
  console.log(`VITE_AUTH_GATEWAY_URL: ${import.meta.env.VITE_AUTH_GATEWAY_URL}`);
  
  // Check stored tokens
  console.log('\n--- Stored Tokens ---');
  console.log(`access_token: ${localStorage.getItem('access_token') ? 'Present' : 'Missing'}`);
  console.log(`refresh_token: ${localStorage.getItem('refresh_token') ? 'Present' : 'Missing'}`);
  console.log(`user_data: ${localStorage.getItem('user_data') ? 'Present' : 'Missing'}`);
  console.log(`lanonasis_token (legacy): ${localStorage.getItem('lanonasis_token') ? 'Present' : 'Missing'}`);
  console.log(`lanonasis_user (legacy): ${localStorage.getItem('lanonasis_user') ? 'Present' : 'Missing'}`);
  console.log(`lanonasis_current_session: ${localStorage.getItem('lanonasis_current_session') || 'Missing'}`);
  console.log(`lanonasis_current_user_id: ${localStorage.getItem('lanonasis_current_user_id') || 'Missing'}`);
  
  // Check Supabase session
  console.log('\n--- Supabase Session ---');
  const supabaseSession = localStorage.getItem('sb-localhost-auth-token') || 
                         localStorage.getItem('sb-ggkyexmuqtfovwzvddse-auth-token');
  console.log(`Supabase session: ${supabaseSession ? 'Present' : 'Missing'}`);
  
  // Check redirect states
  console.log('\n--- Redirect States ---');
  console.log(`redirectAfterLogin: ${localStorage.getItem('redirectAfterLogin') || 'Not set'}`);
  
  // Check URL parameters
  console.log('\n--- URL Parameters ---');
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach((value, key) => {
    console.log(`${key}: ${key.includes('token') ? '[REDACTED]' : value}`);
  });
  
  // Provide recommendations
  console.log('\n--- Recommendations ---');
  if (import.meta.env.VITE_USE_CENTRAL_AUTH === 'true' && import.meta.env.VITE_USE_FALLBACK_AUTH === 'true') {
    console.warn('⚠️ Both Central Auth and Fallback Auth are enabled. This can cause conflicts.');
    console.warn('   Consider disabling one by setting VITE_USE_FALLBACK_AUTH=false');
  }
  
  if (localStorage.getItem('lanonasis_token') && localStorage.getItem('access_token')) {
    console.warn('⚠️ Both legacy and new token formats are present. This may cause conflicts.');
    console.warn('   Run: clearLegacyTokens() to clean up');
  }
  
  if (!localStorage.getItem('access_token') && !localStorage.getItem('lanonasis_token')) {
    console.warn('⚠️ No authentication tokens found. User needs to log in.');
  }
  
  console.log('\n=== End of Diagnostic Report ===');
};

export const clearLegacyTokens = () => {
  console.log('Clearing legacy tokens...');
  localStorage.removeItem('lanonasis_token');
  localStorage.removeItem('lanonasis_user');
  console.log('Legacy tokens cleared. Refresh the page to re-authenticate.');
};

export const clearAllAuthData = () => {
  console.log('Clearing all authentication data...');
  // Clear new format
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  
  // Clear legacy format
  localStorage.removeItem('lanonasis_token');
  localStorage.removeItem('lanonasis_user');
  
  // Clear session data
  localStorage.removeItem('lanonasis_current_session');
  localStorage.removeItem('lanonasis_current_user_id');
  localStorage.removeItem('lanonasis_auth_timestamp');
  
  // Clear redirect state
  localStorage.removeItem('redirectAfterLogin');
  
  // Clear Supabase sessions
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.includes('-auth-token')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('All authentication data cleared. Refresh the page to start fresh.');
};

// Export to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).authDiagnostic = {
    run: runAuthDiagnostic,
    clearLegacy: clearLegacyTokens,
    clearAll: clearAllAuthData
  };
}