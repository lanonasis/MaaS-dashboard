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
