// Direct Supabase Auth Hook
// This hook provides a simplified interface for working directly with Supabase auth

import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from '@supabase/supabase-js';

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

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('SupabaseAuthProvider: Initializing auth');
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async () => {
    console.log('SupabaseAuthProvider: initializeAuth called');
    setIsLoading(true);
    
    try {
      // Get the current session from Supabase
      const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error fetching Supabase session:', error);
      } else if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        await fetchProfile(supabaseSession.user.id);
      }

      // Set up Supabase auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, supabaseSession) => {
          console.log('Supabase auth state change:', event, supabaseSession?.user?.email);
          
          if (supabaseSession) {
            setSession(supabaseSession);
            setUser(supabaseSession.user);
            
            if (event === 'SIGNED_IN') {
              // Fetch user profile when signed in
              await fetchProfile(supabaseSession.user.id);
              
              // Show welcome toast
              toast({
                title: "Welcome!",
                description: `You are now signed in as ${supabaseSession.user.email}`,
              });
              
              // Redirect to dashboard on sign in
              navigate('/dashboard');
            }
          } else {
            // Clear state when signed out
            setSession(null);
            setUser(null);
            setProfile(null);
            
            if (event === 'SIGNED_OUT') {
              // Redirect to home page on sign out
              navigate('/');
              
              // Show sign out toast
              toast({
                title: "Signed out",
                description: "You have been successfully signed out.",
              });
            }
          }
        }
      );
      
      // Cleanup function to remove the subscription when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing Supabase auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setProfile(data as Profile);
      } else {
        // If no profile exists yet, create a basic one
        if (user) {
          const newProfile = {
            id: userId,
            full_name: user.user_metadata.full_name || null,
            company_name: null,
            email: user.email,
            phone: null,
            avatar_url: null,
            role: 'user',
          };
          
          // Insert the new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile]);
          
          if (insertError) {
            console.error('Error creating user profile:', insertError);
            return;
          }
          
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
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
          variant: "destructive"
        });
        throw error;
      }
      
      // Auth state change listener will handle the session update
    } catch (error) {
      console.error('Sign in error:', error);
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
          variant: "destructive"
        });
        throw error;
      }
      
      toast({
        title: "Registration successful!",
        description: "Please check your email to confirm your account.",
      });
      
      // Auth state change listener will handle the session update
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Auth state change listener will handle the session update
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const handleAuthCallback = async () => {
    setIsProcessingCallback(true);
    try {
      // Supabase client automatically exchanges the code for a session
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error processing auth callback:', error);
        navigate('/?error=auth_callback_failed');
        return;
      }
      
      // If successful, redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error in handleAuthCallback:', error);
      navigate('/?error=auth_callback_error');
    } finally {
      setIsProcessingCallback(false);
    }
  };

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
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider");
  }
  
  return context;
};
