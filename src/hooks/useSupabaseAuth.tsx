// Direct Supabase Auth Hook
// This hook provides a simplified interface for working directly with Supabase auth
// Updated to sync with auth-gateway SSO cookies for cross-subdomain authentication

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { centralAuth } from "@/lib/central-auth";

type Profile = {
  id: string;
  full_name: string | null;
  company_name?: string | null;
  email: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

interface SupabaseAuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isProcessingCallback: boolean;
  handleAuthCallback: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(
  undefined
);

export const SupabaseAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Add error state to track initialization issues
  const [initError, setInitError] = useState<string | null>(null);

  // Track last synced token to avoid duplicate SSO syncs
  const lastSyncedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("SupabaseAuthProvider: Initializing auth");
    let cleanup: (() => void) | undefined;

    // Safety timeout to ensure loading state always clears
    // Increased to 20s to match session fetch timeout and prevent premature redirects in production
    const timeoutId = setTimeout(() => {
      console.warn(
        "Auth initialization timeout - forcing loading state to false"
      );
      setIsLoading(false);
    }, 20000); // 20 second timeout

    const init = async () => {
      try {
        cleanup = await initializeAuth();
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("Error in init:", error);
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async (): Promise<(() => void) | undefined> => {
    console.log("SupabaseAuthProvider: initializeAuth called");
    setIsLoading(true);

    // Check if supabase client is available
    if (!supabase) {
      console.error("Supabase client not initialized");
      setIsLoading(false);
      return undefined;
    }

    // Try to get initial session, but don't let failure prevent listener setup
    try {
      console.log("SupabaseAuthProvider: Getting session...");

      // Fetch session with a more generous timeout (15 seconds)
      // This prevents stuck loading states on slow connections
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session fetch timeout")), 15000);
      });

      const {
        data: { session: supabaseSession },
        error,
      } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

      console.log("SupabaseAuthProvider: Session fetched", {
        hasSession: !!supabaseSession,
        hasError: !!error,
      });

      if (error) {
        console.error("Error fetching Supabase session:", error);
        // Continue without session
      } else if (supabaseSession) {
        console.log("SupabaseAuthProvider: Setting session and user");
        setSession(supabaseSession);
        setUser(supabaseSession.user);

        // Fetch profile but don't block on it
        console.log("SupabaseAuthProvider: Fetching profile...");
        fetchProfile(supabaseSession.user.id).catch((err) => {
          console.error("Error fetching profile (non-blocking):", err);
        });

        // Sync SSO cookies if we have a session but haven't synced yet
        // This handles page reload scenarios where Supabase session exists but SSO cookies may not
        const accessToken = supabaseSession.access_token;
        if (accessToken && accessToken !== lastSyncedTokenRef.current) {
          lastSyncedTokenRef.current = accessToken;
          console.log("SupabaseAuthProvider: Initial SSO sync on session restore");
          centralAuth.exchangeSupabaseToken(accessToken).catch((error) => {
            console.warn("SupabaseAuthProvider: Initial SSO sync failed (non-critical):", error);
          });
        }
      } else {
        console.log("SupabaseAuthProvider: No session found");
      }
    } catch (error) {
      console.error("Error fetching initial session:", error);

      // If it's a timeout, log it but continue silently
      if (error instanceof Error && error.message === "Session fetch timeout") {
        console.warn(
          "Session fetch timed out - will still set up auth listener"
        );
        // Don't show toast - just continue with auth setup
      }
      // Don't return - continue to set up listener
    }

    // ALWAYS set up the auth state listener, even if initial session fetch failed
    // This is critical - without this, login won't work!
    try {
      console.log("SupabaseAuthProvider: Setting up auth state listener");
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
        console.log(
          "Supabase auth state change:",
          event,
          supabaseSession?.user?.email
        );

        if (supabaseSession) {
          setSession(supabaseSession);
          setUser(supabaseSession.user);

          if (event === "SIGNED_IN") {
            // Fetch user profile when signed in
            await fetchProfile(supabaseSession.user.id);

            // Sync with auth-gateway to set SSO cookies for cross-subdomain auth
            // This enables seamless authentication across dashboard, API, MCP, etc.
            const accessToken = supabaseSession.access_token;
            if (accessToken && accessToken !== lastSyncedTokenRef.current) {
              lastSyncedTokenRef.current = accessToken;
              console.log("SupabaseAuthProvider: Syncing SSO cookies with auth-gateway");

              // Non-blocking SSO sync - don't wait for it to complete
              centralAuth.exchangeSupabaseToken(accessToken)
                .then((success) => {
                  if (success) {
                    console.log("SupabaseAuthProvider: SSO cookies synced successfully");
                  } else {
                    console.warn("SupabaseAuthProvider: SSO cookie sync failed (non-critical)");
                  }
                })
                .catch((error) => {
                  console.warn("SupabaseAuthProvider: SSO sync error (non-critical):", error);
                });
            }

            // Show welcome toast
            toast({
              title: "Welcome!",
              description: `You are now signed in as ${supabaseSession.user.email}`,
            });

            // Check for stored redirect path
            const redirectPath = localStorage.getItem("redirectAfterLogin");
            if (redirectPath) {
              localStorage.removeItem("redirectAfterLogin");
              navigate(redirectPath);
            } else {
              // Redirect to dashboard on sign in
              navigate("/dashboard");
            }
          }
        } else {
          // Clear state when signed out
          setSession(null);
          setUser(null);
          setProfile(null);
          lastSyncedTokenRef.current = null;

          if (event === "SIGNED_OUT") {
            // Clear SSO cookies from auth-gateway (non-blocking)
            console.log("SupabaseAuthProvider: Clearing SSO cookies");
            centralAuth.clearSSOCookies().catch((error) => {
              console.warn("SupabaseAuthProvider: Failed to clear SSO cookies:", error);
            });

            // Redirect to home page on sign out
            navigate("/");

            // Show sign out toast
            toast({
              title: "Signed out",
              description: "You have been successfully signed out.",
            });
          }
        }
      });

      // Set loading to false after initialization
      console.log(
        "SupabaseAuthProvider: Auth initialized successfully, clearing loading state"
      );
      setIsLoading(false);

      // Return cleanup function to remove the subscription when component unmounts
      return () => {
        console.log("SupabaseAuthProvider: Cleaning up auth subscription");
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      setInitError(
        error instanceof Error
          ? error.message
          : "Failed to initialize authentication"
      );
      setIsLoading(false);
      return undefined;
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log("SupabaseAuthProvider: fetchProfile called", {
        userId,
        hasUser: !!user,
      });

      // Use maybeSingle() instead of single() to handle missing profiles gracefully
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // Only log real errors, not "no rows" scenarios
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error);
        return;
      }

      if (data) {
        console.log("SupabaseAuthProvider: Profile found", {
          profileId: data.id,
        });
        setProfile(data as Profile);
      } else {
        console.log("SupabaseAuthProvider: No profile found, creating one", {
          userId,
        });

        // Get user data from Supabase if not available in state
        let userData = user;
        if (!userData) {
          const {
            data: { user: fetchedUser },
          } = await supabase.auth.getUser();
          userData = fetchedUser;
        }

        // If no profile exists yet, create a basic one with only existing columns
        if (userData) {
          const basicProfile = {
            id: userId,
            email: userData.email || "",
            full_name:
              userData.user_metadata?.full_name || userData.email || "User",
          };

          // Insert the basic profile
          const { data: insertData, error: insertError } = await supabase
            .from("profiles")
            .insert([basicProfile])
            .select();

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            // Fall back to a profile object for the UI
            setProfile({
              ...basicProfile,
              company_name: null,
              avatar_url: null,
              role: "user",
            });
            return;
          }

          if (insertData && insertData[0]) {
            console.log("SupabaseAuthProvider: Profile created", {
              profileId: insertData[0].id,
            });
            setProfile(insertData[0] as Profile);

            // Seed default context entries for new users
            const defaultContextEntries = [
              {
                user_id: userId,
                content: '# Welcome to LanOnasis\n\nWelcome to LanOnasis where your context becomes money or value. This is your personal context store - a place to keep important information, notes, and knowledge that AI assistants can reference to provide you with personalized help.',
                type: 'context',
                tags: ['welcome', 'getting-started'],
                metadata: { source: 'system', is_default: true, title: 'Welcome to LanOnasis' }
              },
              {
                user_id: userId,
                content: '# Getting Started with Context Store\n\nTips for using Context Store:\n\n1. Add project notes to remember important decisions\n2. Store API documentation snippets for quick reference\n3. Save workflow templates for repeated tasks\n4. Use tags to organize related context entries\n5. The AI assistant can search and reference your context to provide personalized help',
                type: 'knowledge',
                tags: ['tips', 'getting-started', 'tutorial'],
                metadata: { source: 'system', is_default: true, title: 'Getting Started with Context Store' }
              }
            ];

            // Insert default context entries (don't block on this)
            supabase.from('memory_entries').insert(defaultContextEntries).then(({ error: seedError }) => {
              if (seedError) {
                console.warn('Failed to seed default context entries:', seedError);
              } else {
                console.log('SupabaseAuthProvider: Default context entries seeded');
              }
            });
          }
        } else {
          console.warn(
            "SupabaseAuthProvider: Cannot create profile - no user data available"
          );
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      // Auth state change listener will handle the session update
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to confirm your account.",
      });

      // Auth state change listener will handle the session update
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }

      // Clear persisted query cache on logout for security
      try {
        const { clearPersistedCache } = await import("@/lib/query-persister");
        await clearPersistedCache();
      } catch (cacheError) {
        console.warn("Failed to clear cache on logout:", cacheError);
      }

      // Auth state change listener will handle the session update
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const handleAuthCallback = async () => {
    setIsProcessingCallback(true);
    try {
      // Supabase client automatically exchanges the code for a session
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error processing auth callback:", error);
        navigate("/?error=auth_callback_failed");
        return;
      }

      // If successful, redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Error in handleAuthCallback:", error);
      navigate("/?error=auth_callback_error");
    } finally {
      setIsProcessingCallback(false);
    }
  };

  // If there's an initialization error, show a fallback
  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-4">
            Failed to initialize authentication system: {initError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        isProcessingCallback,
        handleAuthCallback,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);

  if (context === undefined) {
    throw new Error(
      "useSupabaseAuth must be used within a SupabaseAuthProvider"
    );
  }

  return context;
};
