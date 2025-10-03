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
  }, []);

  const handleAuthFlow = async () => {
    // Log the current state for debugging
    console.log('SupabaseAuthRedirect: handleAuthFlow called');
    console.log('Current URL:', window.location.href);
    
    const currentPath = window.location.pathname;
    
    // Handle various auth paths
    if (currentPath.startsWith('/auth/')) {
      // Handle the callback path
      if (currentPath === '/auth/callback') {
        // The Supabase client will automatically handle the callback and update the session
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting Supabase session:', error);
          navigate('/?error=auth_error');
        } else {
          // Successfully handled the callback, redirect to dashboard
          navigate('/dashboard');
        }
        return;
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
