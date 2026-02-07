// Central Authentication Hook with Supabase Fallback
// This hook provides a unified interface for authentication that can use either
// the central auth gateway or fallback to Supabase

import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  centralAuth,
  type AuthSession as CentralAuthSession,
} from "@/lib/central-auth";
import { secureTokenStorage } from "@/lib/secure-token-storage";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  // Note: phone column doesn't exist in current schema
};

interface CentralAuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | CentralAuthSession | null;
  isLoading: boolean;
  isUsingCentralAuth: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isProcessingCallback: boolean;
  handleAuthCallback: () => Promise<void>;
}

const CentralAuthContext = createContext<CentralAuthContextType | undefined>(
  undefined
);

const readEnvFlag = (key: string, fallback: boolean) => {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })
    ?.env;
  const raw =
    metaEnv?.[key] ??
    (typeof process !== "undefined" ? process.env?.[key] : undefined);
  if (raw === undefined) {
    return fallback;
  }
  return String(raw).toLowerCase() === "true";
};

export const CentralAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | CentralAuthSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingCentralAuth, setIsUsingCentralAuth] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("CentralAuthProvider: Initializing auth");
    let cleanup: (() => void) | undefined;

    const init = async () => {
      // Initialize secure token storage (migrates from localStorage if needed)
      secureTokenStorage.migrateFromLocalStorage();
      cleanup = await initializeAuth();
    };

    init();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async (): Promise<(() => void) | undefined> => {
    const useCentralAuth = readEnvFlag("VITE_USE_CENTRAL_AUTH", false);
    const useFallbackAuth = readEnvFlag("VITE_USE_FALLBACK_AUTH", true);

    console.log("CentralAuthProvider: initializeAuth called", {
      USE_CENTRAL_AUTH: useCentralAuth,
      USE_FALLBACK_AUTH: useFallbackAuth,
    });
    setIsLoading(true);

    // Try central auth first if enabled
    if (useCentralAuth) {
      try {
        console.log("CentralAuthProvider: Checking central auth health");
        const isHealthy = await centralAuth.healthCheck();
        console.log(
          "CentralAuthProvider: Central auth health status",
          isHealthy
        );
        if (isHealthy) {
          console.log("CentralAuthProvider: Getting current session");
          const centralSession = await centralAuth.getCurrentSession();
          console.log(
            "CentralAuthProvider: Current session result",
            centralSession
          );
          if (centralSession) {
            setSession(centralSession);
            setUser(centralSession.user as User);
            setIsUsingCentralAuth(true);
            await fetchProfile(centralSession.user.id);
            setIsLoading(false);
            return undefined;
          }
        }
      } catch (error) {
        console.warn(
          "Central auth not available, falling back to Supabase:",
          error
        );
      }
    }

    // Fallback to Supabase
    if (useFallbackAuth) {
      try {
        const {
          data: { session: supabaseSession },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching Supabase session:", error);
        } else if (supabaseSession) {
          setSession(supabaseSession);
          setUser(supabaseSession.user);
          setIsUsingCentralAuth(false);
          await fetchProfile(supabaseSession.user.id);

          // Sync SSO cookies on page load with existing session
          if (supabaseSession.access_token) {
            centralAuth.exchangeSupabaseToken(supabaseSession.access_token)
              .catch((err) => console.warn("SSO cookie sync on load failed:", err));
          }
        }

        // Set up Supabase auth state listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
          console.log(
            "Supabase auth state change:",
            event,
            supabaseSession?.user?.email
          );
          setSession(supabaseSession);
          setUser(supabaseSession?.user || null);

          if (supabaseSession?.user) {
            await fetchProfile(supabaseSession.user.id);

            // Sync SSO cookies for cross-subdomain authentication
            if (event === "SIGNED_IN" && supabaseSession.access_token) {
              centralAuth.exchangeSupabaseToken(supabaseSession.access_token)
                .catch((err) => console.warn("SSO cookie sync failed:", err));
            }

            // Handle OAuth callback
            if (
              event === "SIGNED_IN" &&
              supabaseSession.user.app_metadata.provider !== "email"
            ) {
              await handleOAuthUser(supabaseSession.user);
            }
          } else {
            setProfile(null);
          }
        });

        setIsLoading(false);

        // Cleanup subscription on unmount
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Error initializing Supabase auth:", error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    return undefined;
  };

  const handleOAuthUser = async (oauthUser: User) => {
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
         
        .eq("id", oauthUser.id as any)
        .maybeSingle();

      if (!existingProfile) {
        const { error } = await supabase.from("profiles").insert({
          email: oauthUser.email || null,
          full_name:
            oauthUser.user_metadata?.full_name ||
            oauthUser.user_metadata?.name ||
            null,
          avatar_url:
            oauthUser.user_metadata?.avatar_url ||
            oauthUser.user_metadata?.picture ||
            null,
          company_name: null,
          role: "user",
           
        } as any);

        if (!error) {
          await fetchProfile(oauthUser.id);
        }
      }

      toast({
        title: "Welcome!",
        description: "Successfully signed in. Redirecting to dashboard...",
      });

      setTimeout(() => {
        // Try sessionStorage first, fallback to localStorage
        let redirectPath = null;
        try {
          redirectPath = sessionStorage.getItem("redirectAfterLogin");
          if (redirectPath) {
            sessionStorage.removeItem("redirectAfterLogin");
          }
        } catch (e) {
          // Fallback to localStorage
          redirectPath = localStorage.getItem("redirectAfterLogin");
          if (redirectPath) {
            localStorage.removeItem("redirectAfterLogin");
          }
        }
        navigate(redirectPath || "/dashboard");
      }, 100);
    } catch (error) {
      console.error("Error handling OAuth user:", error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
         
        .eq("id", userId as any)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data as unknown as Profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const useCentralAuth = readEnvFlag("VITE_USE_CENTRAL_AUTH", false);
      const useFallbackAuth = readEnvFlag("VITE_USE_FALLBACK_AUTH", true);

      // Try central auth first if enabled
      if (useCentralAuth && isUsingCentralAuth) {
        try {
          // centralAuth.login() redirects and never returns
          // The auth callback handler will complete the flow
          await centralAuth.login(email, password);
          // Code after this will never execute due to redirect
          return;
        } catch (centralError) {
          console.warn(
            "Central auth login failed, falling back to Supabase:",
            centralError
          );
        }
      }

      // Fallback to Supabase
      if (useFallbackAuth) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Successfully signed in",
          description: "Welcome back!",
        });

        // Try sessionStorage first, fallback to localStorage
        let redirectPath = null;
        try {
          redirectPath = sessionStorage.getItem("redirectAfterLogin");
          if (redirectPath) {
            sessionStorage.removeItem("redirectAfterLogin");
          }
        } catch (e) {
          // Fallback to localStorage
          redirectPath = localStorage.getItem("redirectAfterLogin");
          if (redirectPath) {
            localStorage.removeItem("redirectAfterLogin");
          }
        }
        navigate(redirectPath || "/dashboard");
      } else {
        throw new Error("No authentication method available");
      }
    } catch (error: unknown) {
      toast({
        title: "Error signing in",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const useCentralAuth = readEnvFlag("VITE_USE_CENTRAL_AUTH", false);
      const useFallbackAuth = readEnvFlag("VITE_USE_FALLBACK_AUTH", true);

      // Try central auth first if enabled
      if (useCentralAuth) {
        try {
          // centralAuth.signup() redirects and never returns
          // The auth callback handler will complete the flow
          await centralAuth.signup(email, password, name);
          // Code after this will never execute due to redirect
          return;
        } catch (centralError) {
          console.warn(
            "Central auth signup failed, falling back to Supabase:",
            centralError
          );
        }
      }

      // Fallback to Supabase
      if (useFallbackAuth) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created successfully",
          description: "Please check your email to verify your account.",
        });

        navigate("/auth/login");
      } else {
        throw new Error("No authentication method available");
      }
    } catch (error: unknown) {
      toast({
        title: "Error creating account",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear SSO cookies for cross-subdomain logout
      await centralAuth.clearSSOCookies();

      if (isUsingCentralAuth) {
        await centralAuth.logout();
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      navigate("/");
    } catch (error: unknown) {
      toast({
        title: "Error signing out",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAuthCallback = async () => {
    setIsProcessingCallback(true);
    try {
      // This is primarily for OAuth callbacks which go through Supabase
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error handling auth callback:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to complete authentication",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
        await fetchProfile(session.user.id);

        toast({
          title: "Authentication Successful",
          description: "Welcome! Redirecting to dashboard...",
        });

        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error in auth callback:", error);
      navigate("/auth");
    } finally {
      setIsProcessingCallback(false);
    }
  };

  return (
    <CentralAuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isUsingCentralAuth,
        signIn,
        signUp,
        signOut,
        isProcessingCallback,
        handleAuthCallback,
      }}
    >
      {children}
    </CentralAuthContext.Provider>
  );
};

// This file intentionally exports both a Provider component and a hook
// This is a standard React context pattern and the warning can be safely ignored
// eslint-disable-next-line react-refresh/only-export-components
export const useCentralAuth = () => {
  const context = useContext(CentralAuthContext);
  if (context === undefined) {
    throw new Error("useCentralAuth must be used within a CentralAuthProvider");
  }
  return context;
};
