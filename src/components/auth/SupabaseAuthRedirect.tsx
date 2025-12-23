import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
      // Log the current state for debugging
      console.log("SupabaseAuthRedirect: handleAuthFlow called");
      console.log("Current URL:", window.location.href);

      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      // Handle various auth paths
      if (currentPath.startsWith("/auth/")) {
        // Handle the callback path
        if (currentPath === "/auth/callback" || currentPath === "/auth/login") {
          console.log("SupabaseAuthRedirect: Processing OAuth callback");

          // Check if we have OAuth parameters in URL or hash (Supabase uses hash for OAuth)
          const hasOAuthParams =
            urlParams.get("code") ||
            urlParams.get("access_token") ||
            urlParams.get("error") ||
            hashParams.get("access_token") ||
            hashParams.get("error");

          if (hasOAuthParams) {
            // Let Supabase handle the OAuth callback automatically
            console.log(
              "SupabaseAuthRedirect: OAuth parameters detected, exchanging code for session"
            );

            // First, try to get the session immediately (Supabase might have already processed it)
            const {
              data: { session: existingSession },
              error: sessionError,
            } = await supabase.auth.getSession();

            if (existingSession && !sessionError) {
              console.log(
                "SupabaseAuthRedirect: Session already exists, redirecting immediately"
              );
              const redirectPath =
                localStorage.getItem("redirectAfterLogin") || "/dashboard";
              localStorage.removeItem("redirectAfterLogin");
              navigate(redirectPath);
              return;
            }

            // Set up a one-time auth state listener to catch when auth completes
            let redirectHandled = false;
            const {
              data: { subscription },
            } = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log(
                "SupabaseAuthRedirect: Auth state changed:",
                event,
                !!session
              );

              if (event === "SIGNED_IN" && session && !redirectHandled) {
                redirectHandled = true;
                // Unsubscribe immediately to prevent duplicate redirects
                subscription.unsubscribe();

                console.log(
                  "SupabaseAuthRedirect: User authenticated, redirecting to dashboard"
                );

                // Check for stored redirect path, default to dashboard
                const redirectPath =
                  localStorage.getItem("redirectAfterLogin") || "/dashboard";
                localStorage.removeItem("redirectAfterLogin");

                // Ensure we always go to dashboard, not landing page
                const finalPath =
                  redirectPath === "/" || redirectPath === "/landing"
                    ? "/dashboard"
                    : redirectPath;
                navigate(finalPath, { replace: true });
              }
            });

            // Also set a timeout fallback in case the auth state change doesn't fire
            // This prevents infinite spinning
            const timeoutId = setTimeout(async () => {
              if (!redirectHandled) {
                subscription.unsubscribe();

                // Check manually if user is authenticated
                const {
                  data: { user },
                  error,
                } = await supabase.auth.getUser();
                if (error) {
                  console.error("Error getting user after timeout:", error);
                  navigate("/?error=auth_callback_timeout");
                } else if (user) {
                  console.log(
                    "SupabaseAuthRedirect: User found via timeout check, redirecting"
                  );
                  navigate("/dashboard");
                } else {
                  console.log(
                    "SupabaseAuthRedirect: No user after timeout, redirecting to auth"
                  );
                  navigate("/?showAuth=true&error=auth_timeout");
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
            console.log(
              "SupabaseAuthRedirect: No OAuth params, redirecting to auth"
            );
            navigate("/?showAuth=true");
            return;
          }
        }
      }

      // For login/register paths, show the Supabase auth UI
      // Since we're directly handling auth, we'll redirect to the index page
      // which should have a login/register UI based on Supabase
      navigate("/?showAuth=true");
    } catch (error) {
      console.error("Error in handleAuthFlow:", error);
      // Fallback to home page with auth form
      navigate("/?showAuth=true&error=auth_flow_error");
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
