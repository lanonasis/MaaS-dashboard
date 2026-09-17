// Compatibility auth hook for dashboard.
// Task #128 owner decision:
// - Supported owner model: direct-auth (Supabase)
// - Central auth is transitional bridge only (SSO sync + cookie clearing)
//
// Consumes createAuthController from @/lib/auth/auth-controller for shared auth logic.

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { centralAuth } from "@/lib/central-auth";
import { secureTokenStorage } from "@/lib/secure-token-storage";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { createAuthController } from "@/lib/auth/auth-controller";
import type { AuthApi, AuthState } from "@/lib/auth/auth-controller";
import {
  hasLegacyCentralCallbackParams,
  hasLegacyCentralStorageArtifacts,
  clearLegacyCentralArtifacts,
  markCentralAuthReauthRequired,
  consumeCentralAuthReauthRequired,
} from "@/lib/auth/legacy-callbacks";

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

const CENTRAL_AUTH_REAUTH_FLAG =
  "lanonasis_central_auth_reauth_required_v136";

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


export const CentralAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const controllerRef = useRef<AuthApi | null>(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Sync controller state → React state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Local scaffolding for deferred auth work and SSO queue.
  // DASHBOARD_AUTH_OWNER_MODEL is a constant representing the dashboard's
  // supported auth model — direct Supabase sessions (non-interactive bridge only).
  const DASHBOARD_AUTH_OWNER_MODEL = "direct-supabase";
  const authGenerationRef = useRef(0);
  const deferredTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const clearDeferredAuthWork = () => {
    deferredTimers.current.forEach((t) => clearTimeout(t));
    deferredTimers.current.clear();
  };

  const deferAuthWork = (
    generation: number,
    work: () => void | Promise<void>
  ) => {
    const timer = setTimeout(() => {
      deferredTimers.current.delete(timer);
      if (generation !== authGenerationRef.current) return;
      void work();
    }, 0);
    deferredTimers.current.add(timer);
  };

  const ssoQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueSsoWork = async (work: () => Promise<unknown>) => {
    ssoQueueRef.current = ssoQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await work();
      });
    return ssoQueueRef.current;
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize secure token storage (migrates from localStorage if needed)
    secureTokenStorage.migrateFromLocalStorage();

    // Initialize controller (runs once on mount)
    if (!supabase) return;

    const controller = createAuthController(
      {
        supabase,
        centralAuth,
        navigate,
        toast,
        isDev: import.meta.env.DEV,
        // Reactive state sync — no polling needed
        onStateChange: (state: AuthState) => {
          setUser(state.user);
          setSession(state.session);
          setProfile(state.profile as Profile | null);
          setIsLoading(state.isLoading);
        },
      },
      "CentralAuthProvider"
    );
    controllerRef.current = controller;

    // Initial state read-back
    const s = controller.state;
    setUser(s.user);
    setSession(s.session);
    setProfile(s.profile as Profile | null);
    setIsLoading(s.isLoading);

    return () => {
      controllerRef.current?.cleanup?.();
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
          void enqueueSsoWork(() =>
            centralAuth.exchangeSupabaseToken(supabaseSession.access_token)
              .catch((err) => console.warn("SSO cookie sync on load failed:", err))
          );
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
      } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
        const authGeneration = ++authGenerationRef.current;
        clearDeferredAuthWork();

        console.log(
          "Supabase auth state change:",
          event,
          supabaseSession?.user?.email
        );
        setSession(supabaseSession);
        setUser(supabaseSession?.user || null);

        if (supabaseSession?.user) {
          // Supabase invokes this callback while holding its auth lock. Run
          // API work on the next task so updateUser() and other auth methods
          // can finish before profile/SSO requests begin.
          deferAuthWork(authGeneration, () =>
            fetchProfile(supabaseSession.user.id, authGeneration).catch((error) => {
              console.error("Error fetching profile after auth change:", error);
            })
          );

          // Best-effort SSO cookie sync for cross-subdomain auth.
          if (event === "SIGNED_IN" && supabaseSession.access_token) {
            deferAuthWork(authGeneration, () =>
              enqueueSsoWork(async () => {
                if (authGeneration !== authGenerationRef.current) return;
                await centralAuth.exchangeSupabaseToken(supabaseSession.access_token)
                  .catch((err) => console.warn("SSO cookie sync failed:", err));
              })
            );
          }

          // Handle OAuth callback
          if (
            event === "SIGNED_IN" &&
            supabaseSession.user.app_metadata.provider !== "email"
          ) {
            deferAuthWork(authGeneration, () =>
              handleOAuthUser(supabaseSession.user, authGeneration)
            );
          }
        } else {
          setProfile(null);

          if (event === "SIGNED_OUT") {
            void enqueueSsoWork(async () => {
              if (authGeneration !== authGenerationRef.current) return;
              await centralAuth.clearSSOCookies()
                .catch((err) => console.warn("SSO cookie clear failed:", err));
            });
          }
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

  const handleOAuthUser = async (oauthUser: User, authGeneration?: number) => {
    const isCurrentAuthGeneration = () =>
      authGeneration === undefined || authGeneration === authGenerationRef.current;

    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
         
        .eq("id", oauthUser.id as any)
        .maybeSingle();

      if (!isCurrentAuthGeneration()) return;

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
        if (!isCurrentAuthGeneration()) return;

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

  const fetchProfile = async (userId: string, authGeneration?: number) => {
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

      if (
        data &&
        (authGeneration === undefined || authGeneration === authGenerationRef.current)
      ) {
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
      const {
        data: { session },
        error,
      } = await supabase!.auth.getSession();

      if (error) {
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
        // Profile fetch is handled by the controller's onAuthStateChange
        // For callback, we need to fetch it directly
        const { data } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (data) {
          setProfile(data as any);
        }

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
          // Legacy cleanup: clear storage artifacts and flag reauth
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

          LEGACY_SENSITIVE_TOKEN_KEYS.forEach((key) =>
            localStorage.removeItem(key)
          );
          LEGACY_SESSION_STORAGE_KEYS.forEach((key) =>
            sessionStorage.removeItem(key)
          );
          LEGACY_CALLBACK_METADATA_KEYS.forEach((key) =>
            localStorage.removeItem(key)
          );
          sessionStorage.setItem(CENTRAL_AUTH_REAUTH_FLAG, "1");
          navigate("/?showAuth=true&reauth=central-auth-migration", {
            replace: true,
          });
          return;
        }

        navigate("/auth");
      }
    } catch (error) {
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
        isUsingCentralAuth: false,
        signIn: controllerRef.current?.signIn,
        signUp: controllerRef.current?.signUp,
        signOut: controllerRef.current?.signOut,
        isProcessingCallback,
        handleAuthCallback,
      }}
    >
      {children}
    </CentralAuthContext.Provider>
  );
};

export const useCentralAuth = () => {
  const context = useContext(CentralAuthContext);
  if (context === undefined) {
    throw new Error("useCentralAuth must be used within a CentralAuthProvider");
  }
  return context;
};
