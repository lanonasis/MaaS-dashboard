import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Supabase Auth Redirect Component
 * 
 * This component handles authentication redirects for Supabase auth
 * when directly connecting to Supabase instead of using central auth.
 */
const SupabaseAuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    handleAuthFlow();
  }, [handleAuthFlow]);

  const handleAuthFlow = async () => {
    // Log the current state for debugging
    console.log('SupabaseAuthRedirect: handleAuthFlow called');
    console.log('Current URL:', window.location.href);
    
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle various auth paths
    if (currentPath.startsWith('/auth/')) {
      // Handle the callback path
      if (currentPath === '/auth/callback') {
        console.log('SupabaseAuthRedirect: Processing OAuth callback');
        
        // Check if we have OAuth parameters
        const hasOAuthParams = urlParams.get('code') || urlParams.get('access_token') || urlParams.get('error');
        
        if (hasOAuthParams) {
          // Let Supabase handle the OAuth callback automatically
          // The auth state change listener in useSupabaseAuth will handle the redirect
          console.log('SupabaseAuthRedirect: OAuth parameters detected, waiting for auth state change');
          
          // Wait a moment for the auth state to update
          setTimeout(() => {
            // Check if user is now authenticated
            supabase.auth.getUser().then(({ data: { user }, error }) => {
              if (error) {
                console.error('Error getting user after callback:', error);
                navigate('/?error=auth_callback_failed');
              } else if (user) {
                console.log('SupabaseAuthRedirect: User authenticated, redirecting to dashboard');
                // Check for stored redirect path
                const redirectPath = localStorage.getItem('redirectAfterLogin');
                if (redirectPath) {
                  localStorage.removeItem('redirectAfterLogin');
                  navigate(redirectPath);
                } else {
                  navigate('/dashboard');
                }
              } else {
                console.log('SupabaseAuthRedirect: No user found after callback, redirecting to auth');
                navigate('/?showAuth=true');
              }
            });
          }, 1000);
          
          return;
        } else {
          // No OAuth parameters, redirect to auth
          navigate('/?showAuth=true');
          return;
        }
      }
    }
    
    // For login/register paths, show the Supabase auth UI
    // Since we're directly handling auth, we'll redirect to the index page
    // which should have a login/register UI based on Supabase
    navigate('/?showAuth=true');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Processing authentication...</p>
      </div>
    </div>
  );
};

export default SupabaseAuthRedirect;
