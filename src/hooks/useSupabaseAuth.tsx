// Direct Supabase Auth Hook
// This hook provides a simplified interface for working directly with Supabase auth

import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
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

  useEffect(() => {
    console.log("SupabaseAuthProvider: Initializing auth");
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async () => {
    console.log("SupabaseAuthProvider: initializeAuth called");
    setIsLoading(true);

    try {
      // Check if supabase client is available
      if (!supabase) {
        console.error("Supabase client not initialized");
        setIsLoading(false);
        return;
      }

      // Get the current session from Supabase
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

        if (supabaseSession) {
          setSession(supabaseSession);
          setUser(supabaseSession.user);

          if (event === "SIGNED_IN") {
            // Fetch user profile when signed in
            await fetchProfile(supabaseSession.user.id);

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

          if (event === "SIGNED_OUT") {
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

      // Cleanup function to remove the subscription when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Error initializing Supabase auth:", error);
      setInitError(
        error instanceof Error ? error.message : "Unknown initialization error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
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
        setProfile(data as Profile);
      } else {
        // If no profile exists yet, create a basic one with only existing columns
        if (user) {
          const basicProfile = {
            id: userId,
            email: user.email,
            full_name: user.user_metadata.full_name || user.email || "User",
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
              phone: null,
              avatar_url: null,
              role: "user",
            });
            return;
          }

          if (insertData && insertData[0]) {
            setProfile(insertData[0] as Profile);
          }
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
