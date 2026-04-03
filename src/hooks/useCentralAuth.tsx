// Compatibility auth hook for dashboard.
// Task #128 owner decision:
// - Supported owner model: direct-auth (Supabase)
// - Central auth is transitional bridge only (SSO sync + cookie clearing)
//
// Expected lifecycle:
// - Redirect/login/signup/callback flow is Supabase-owned (`/auth/callback`)
// - Refresh lifecycle is Supabase session lifecycle
// - Token exchange to auth-gateway is best-effort bridging, not ownership

import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { centralAuth } from "@/lib/central-auth";
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
  session: Session | null;
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

const DASHBOARD_AUTH_OWNER_MODEL = "direct-auth";
const CENTRAL_AUTH_REAUTH_FLAG = "lanonasis_central_auth_reauth_required_v136";
const LEGACY_SENSITIVE_TOKEN_KEYS = [
  "access_token",
  "lanonasis_token",
  "refresh_token",
  "auth_gateway_tokens",
];
const LEGACY_CALLBACK_METADATA_KEYS = [
  "lanonasis_current_session",
  "lanonasis_current_user_id",
  "lanonasis_auth_timestamp",
  "lanonasis_user",
];
const LEGACY_SESSION_STORAGE_KEYS = ["refresh_token_fallback"];

const hasSupabaseCallbackParams = (
  searchParams: URLSearchParams,
  hash: string
): boolean => {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return Boolean(
    searchParams.get("code") ||
      searchParams.get("error") ||
      searchParams.get("error_description") ||
      hashParams.get("access_token") ||
      hashParams.get("error")
  );
};

const hasLegacyCentralCallbackParams = (
  searchParams: URLSearchParams
): boolean => {
  return Boolean(
    searchParams.get("token") ||
      searchParams.get("access_token") ||
      searchParams.get("refresh_token") ||
      searchParams.get("session") ||
      searchParams.get("user_id") ||
      searchParams.get("timestamp")
  );
};

const hasLegacyCentralStorageArtifacts = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    [...LEGACY_SENSITIVE_TOKEN_KEYS, ...LEGACY_CALLBACK_METADATA_KEYS].some(
      (key) => Boolean(localStorage.getItem(key))
    ) ||
    LEGACY_SESSION_STORAGE_KEYS.some((key) =>
      typeof sessionStorage !== "undefined"
        ? Boolean(sessionStorage.getItem(key))
        : false
    )
  );
};

const clearLegacyCentralArtifacts = (includeMetadata: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_SESSION_STORAGE_KEYS.forEach((key) => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
  });

  if (includeMetadata) {
    LEGACY_CALLBACK_METADATA_KEYS.forEach((key) => localStorage.removeItem(key));
  }
};

const markCentralAuthReauthRequired = (): void => {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(CENTRAL_AUTH_REAUTH_FLAG, "1");
};

const consumeCentralAuthReauthRequired = (): boolean => {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  const flagged = sessionStorage.getItem(CENTRAL_AUTH_REAUTH_FLAG) === "1";
  if (flagged) {
    sessionStorage.removeItem(CENTRAL_AUTH_REAUTH_FLAG);
  }
  return flagged;
};

export const CentralAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isUsingCentralAuth = false;
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
    console.log("CentralAuthProvider: initializeAuth called", {
      DASHBOARD_AUTH_OWNER_MODEL,
      CENTRAL_AUTH_ROLE: "non-interactive bridge only",
    });
    setIsLoading(true);

    const searchParams = new URLSearchParams(window.location.search);
    const supabaseCallbackInProgress = hasSupabaseCallbackParams(
      searchParams,
      window.location.hash
    );
    const legacyCentralCallbackInUrl =
      hasLegacyCentralCallbackParams(searchParams) && !supabaseCallbackInProgress;

    // Always remove persisted sensitive artifacts from deprecated central-auth flows.
    clearLegacyCentralArtifacts(false);

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
        await fetchProfile(supabaseSession.user.id);

        // Best-effort SSO cookie sync for cross-subdomain auth.
        if (supabaseSession.access_token) {
          centralAuth.exchangeSupabaseToken(supabaseSession.access_token)
            .catch((err) => console.warn("SSO cookie sync on load failed:", err));
        }
      } else if (legacyCentralCallbackInUrl) {
        // No compatible session exists for deprecated central-auth callback tokens.
        clearLegacyCentralArtifacts(true);
        markCentralAuthReauthRequired();
        setIsLoading(false);
        navigate("/?showAuth=true&reauth=central-auth-migration", {
          replace: true,
        });
        return undefined;
      } else if (hasLegacyCentralStorageArtifacts()) {
        // Stale central-auth session metadata should not survive rollout.
        clearLegacyCentralArtifacts(true);
      }

      if (!supabaseSession && consumeCentralAuthReauthRequired()) {
        toast({
          title: "Sign in required",
          description:
            "Your previous central-auth session was retired. Please sign in again using direct auth.",
        });
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

          // Best-effort SSO cookie sync for cross-subdomain auth.
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
      const { error } = await supabase.auth.signInWithPassword({
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
      const { error } = await supabase.auth.signUp({
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

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

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
        const searchParams = new URLSearchParams(window.location.search);
        const legacyCentralCallbackInUrl =
          hasLegacyCentralCallbackParams(searchParams) &&
          !hasSupabaseCallbackParams(searchParams, window.location.hash);

        if (legacyCentralCallbackInUrl) {
          clearLegacyCentralArtifacts(true);
          markCentralAuthReauthRequired();
          navigate("/?showAuth=true&reauth=central-auth-migration", {
            replace: true,
          });
          return;
        }

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
