// Direct Supabase Auth Hook
// This hook provides a simplified interface for working directly with Supabase auth
// Updated to sync with auth-gateway SSO cookies for cross-subdomain authentication
//
// Consumes createAuthController from @/lib/auth/auth-controller for shared auth logic.

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api-client";
import { Session, User } from "@supabase/supabase-js";
import { centralAuth } from "@/lib/central-auth";
import { createAuthController } from "@/lib/auth/auth-controller";
import type { AuthApi, AuthState } from "@/lib/auth/auth-controller";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const controllerRef = useRef<AuthApi | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize controller on mount — SupabaseAuth re-throws errors
  useEffect(() => {
    if (!supabase) {
      setInitError("Supabase client not initialized");
      setIsLoading(false);
      return;
    }

    const controller = createAuthController({
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
        if (state.initError) setInitError(state.initError);
      },
      // SupabaseAuth tests expect signIn/signUp/signOut to re-throw
      throwOnAuthError: true,
    }, "SupabaseAuthProvider");

    controllerRef.current = controller;

    // Initial state read-back
    const s = controller.state;
    setUser(s.user);
    setSession(s.session);
    setProfile(s.profile as Profile | null);
    setIsLoading(s.isLoading);
    if (s.initError) setInitError(s.initError);

    return () => {
      controller.cleanup?.();
    };
  }, []);

  const handleAuthCallback = async () => {
    setIsProcessingCallback(true);
    try {
      const { error } = await supabase!.auth.getSession();

      if (error) {
        navigate("/?error=auth_callback_failed");
        return;
      }

      navigate("/dashboard");
    } catch (error) {
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
        // Controller throws errors directly (throwOnAuthError: true)
        signIn: controllerRef.current?.signIn,
        signUp: controllerRef.current?.signUp,
        signOut: controllerRef.current?.signOut,
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
