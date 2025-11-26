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
    // Add a small delay to ensure all components are initialized
    const timer = setTimeout(() => {
      handleAuthFlow();
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthFlow = async () => {
    try {
      // #region agent log
      const logEndpoint = 'http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd';
      const logError = (location: string, message: string, data: any) => {
        try {
          fetch(logEndpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              location,
              message,
              data,
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'oauth-fix',
              hypothesisId: 'A'
            })
          }).catch(() => {
            try {
              const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
              logs.push({location, message, data, timestamp: Date.now()});
              if (logs.length > 100) logs.shift();
              localStorage.setItem('debug_logs', JSON.stringify(logs));
            } catch(e) {}
          });
        } catch(e) {}
      };
      // #endregion
      
      // Log the current state for debugging
      console.log('SupabaseAuthRedirect: handleAuthFlow called');
      console.log('Current URL:', window.location.href);
      logError('SupabaseAuthRedirect:handleAuthFlow', 'Starting auth flow', {
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash?.substring(0, 50)
      });
      
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Handle various auth paths
      if (currentPath.startsWith('/auth/')) {
        // Handle the callback path
        if (currentPath === '/auth/callback' || currentPath === '/auth/login') {
          console.log('SupabaseAuthRedirect: Processing OAuth callback');
          logError('SupabaseAuthRedirect:callback', 'Processing callback', {
            path: currentPath,
            hasSearchParams: urlParams.toString().length > 0,
            hasHashParams: hashParams.toString().length > 0
          });
          
          // Check if we have OAuth parameters in URL or hash (Supabase uses hash for OAuth)
          const hasOAuthParams = 
            urlParams.get('code') || 
            urlParams.get('access_token') || 
            urlParams.get('error') ||
            hashParams.get('access_token') ||
            hashParams.get('error');
          
          if (hasOAuthParams) {
            // Let Supabase handle the OAuth callback automatically
            console.log('SupabaseAuthRedirect: OAuth parameters detected, exchanging code for session');
            logError('SupabaseAuthRedirect:oauth', 'OAuth params detected', {
              hasCode: !!urlParams.get('code'),
              hasAccessToken: !!(urlParams.get('access_token') || hashParams.get('access_token')),
              hasError: !!(urlParams.get('error') || hashParams.get('error'))
            });

            // First, try to get the session immediately (Supabase might have already processed it)
            const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (existingSession && !sessionError) {
              console.log('SupabaseAuthRedirect: Session already exists, redirecting immediately');
              logError('SupabaseAuthRedirect:session', 'Session exists', {userId: existingSession.user.id});
              const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
              localStorage.removeItem('redirectAfterLogin');
              navigate(redirectPath);
              return;
            }

            // Set up a one-time auth state listener to catch when auth completes
            let redirectHandled = false;
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log('SupabaseAuthRedirect: Auth state changed:', event, !!session);
              logError('SupabaseAuthRedirect:stateChange', 'Auth state change', {
                event,
                hasSession: !!session,
                userId: session?.user?.id
              });

              if (event === 'SIGNED_IN' && session && !redirectHandled) {
                redirectHandled = true;
                // Unsubscribe immediately to prevent duplicate redirects
                subscription.unsubscribe();

                console.log('SupabaseAuthRedirect: User authenticated, redirecting to dashboard');
                logError('SupabaseAuthRedirect:redirect', 'Redirecting after sign in', {
                  userId: session.user.id,
                  email: session.user.email
                });
                
                // Check for stored redirect path
                const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
                localStorage.removeItem('redirectAfterLogin');
                navigate(redirectPath);
              }
            });

            // Also set a timeout fallback in case the auth state change doesn't fire
            // This prevents infinite spinning
            const timeoutId = setTimeout(async () => {
              if (!redirectHandled) {
                subscription.unsubscribe();
                logError('SupabaseAuthRedirect:timeout', 'Timeout reached', {redirectHandled});

                // Check manually if user is authenticated
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                  console.error('Error getting user after timeout:', error);
                  logError('SupabaseAuthRedirect:timeoutError', 'Timeout error', {error: error.message});
                  navigate('/?error=auth_callback_timeout');
                } else if (user) {
                  console.log('SupabaseAuthRedirect: User found via timeout check, redirecting');
                  logError('SupabaseAuthRedirect:timeoutSuccess', 'User found on timeout', {userId: user.id});
                  navigate('/dashboard');
                } else {
                  console.log('SupabaseAuthRedirect: No user after timeout, redirecting to auth');
                  logError('SupabaseAuthRedirect:timeoutNoUser', 'No user on timeout', {});
                  navigate('/?showAuth=true&error=auth_timeout');
                }
              }
            }, 10000); // Reduced to 10 seconds for faster feedback

            // Cleanup timeout on unmount
            return () => {
              clearTimeout(timeoutId);
              if (!redirectHandled) {
                subscription.unsubscribe();
              }
            };
          } else {
            // No OAuth parameters, redirect to auth
            console.log('SupabaseAuthRedirect: No OAuth params, redirecting to auth');
            logError('SupabaseAuthRedirect:noParams', 'No OAuth params', {});
            navigate('/?showAuth=true');
            return;
          }
        }
      }
      
      // For login/register paths, show the Supabase auth UI
      // Since we're directly handling auth, we'll redirect to the index page
      // which should have a login/register UI based on Supabase
      navigate('/?showAuth=true');
    } catch (error) {
      console.error('Error in handleAuthFlow:', error);
      // #region agent log
      logError('SupabaseAuthRedirect:error', 'Error in handleAuthFlow', {
        error: error instanceof Error ? error.message : String(error)
      });
      // #endregion
      // Fallback to home page with auth form
      navigate('/?showAuth=true&error=auth_flow_error');
    }
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
