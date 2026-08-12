import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SetNewPassword from "./SetNewPassword";

/**
 * Supabase Auth Redirect Component
 *
 * This component handles authentication redirects for Supabase auth
 * when directly connecting to Supabase instead of using central auth.
 *
 * Routes:
 *   /auth/reset-password — renders the set-new-password form once a
 *     recovery session is present (set by Supabase after the user
 *     clicks the reset link in their email).
 *   /auth/callback — OAuth callback; exchanges the code/token for a
 *     session and redirects to the dashboard.
 *   /auth/login, /auth/register, /login, /register, /signin, /signup
 *     — fall through to the sign-in form on the landing page.
 */
const SupabaseAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPasswordReset = location.pathname === "/auth/reset-password";

  useEffect(() => {
    if (isPasswordReset) return undefined;

    let disposed = false;
    let authFlowCleanup: (() => void) | undefined;

    // Add a small delay to ensure all components are initialized
    const timer = setTimeout(() => {
      void handleAuthFlow().then((cleanup) => {
        if (!cleanup) return;
        if (disposed) {
          cleanup();
        } else {
          authFlowCleanup = cleanup;
        }
      });
    }, 100);

    return () => {
      disposed = true;
      clearTimeout(timer);
      authFlowCleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPasswordReset]);

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

          // Check for a password-recovery link landing on /auth/callback.
          // Older flows redirected recovery through /auth/callback; if we
          // detect a recovery token, route to /auth/reset-password so the
          // SetNewPassword component can mount with the active session.
          const isRecovery =
            hashParams.get("type") === "recovery" ||
            urlParams.get("type") === "recovery";

          if (isRecovery) {
            console.log(
              "SupabaseAuthRedirect: recovery token detected, redirecting to reset-password"
            );
            navigate("/auth/reset-password", { replace: true });
            return;
          }

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

              if (event === "PASSWORD_RECOVERY" && session) {
                // Recovery session established — show the set-new-password UI.
                redirectHandled = true;
                subscription.unsubscribe();
                navigate("/auth/reset-password", { replace: true });
                return;
              }

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

  // The recovery flow is rendered inline so the user keeps the recovery
  // session while setting a new password. Keep this after all hooks so route
  // changes cannot alter hook order.
  if (isPasswordReset) {
    return <SetNewPassword />;
  }

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
