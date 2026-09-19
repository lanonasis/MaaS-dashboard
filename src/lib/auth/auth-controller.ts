// Auth controller — extracts the shared auth concerns from useSupabaseAuth + useCentralAuth.
// Returns a public API object that both hooks consume via thin wrapper components.
//
// Responsibilities:
// - Deferred work queue (clear/defer/enqueueSso)
// - Auth state management (user, session, profile, isLoading)
// - Session initialization with timeout
// - Auth state change listener
// - Profile fetch with generation-aware staleness
// - Sign in / sign up / sign out
// - Auth callback handling
// - SSO cookie sync
// - OAuth user handling

import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastAction, ToastProps } from "@/hooks/use-toast";

export interface AuthControllerOptions {
  /** Supabase client instance */
  supabase: SupabaseClient;
  /** Central auth instance for SSO sync */
  centralAuth: {
    exchangeSupabaseToken: (token: string) => Promise<boolean>;
    clearSSOCookies: () => Promise<void>;
  };
  /** Router navigate function */
  navigate: (path: string, opts?: { replace?: boolean }) => void;
  /** Toast function from useToast() */
  toast: (props: ToastProps) => void;
  /** Environment flag for dev logging */
  isDev: boolean;
  /** Called every time controller state changes so the React hook can sync */
  onStateChange?: (state: AuthState) => void;
  /**
   * When true, signIn/signUp/signOut re-throw errors after a TOAST IS SHOWN
   * BY THE CALLER. In this mode the controller suppresses its own
   * destructive toast on signOut failure because the caller (typically
   * Dashboard.handleLogout) is responsible for surfacing the failure UI.
   * The throw is preserved so the caller's try/catch still fires.
   */
  throwOnAuthError?: boolean;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  initError: string | null;
}

export interface AuthApi {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
  /** Subscription cleanup function — call on unmount */
  cleanup: (() => void) | undefined;
}

export interface Profile {
  id: string;
  full_name: string | null;
  company_name?: string | null;
  email: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

interface DeferredWorkQueue {
  timers: Set<ReturnType<typeof setTimeout>>;
  ssoQueue: Promise<void>;
  clear: () => void;
  defer: (generation: number, work: () => void | Promise<void>) => void;
  enqueueSso: (work: () => Promise<unknown>) => Promise<void>;
}

const DEBUG_COLORS: Record<string, string> = {
  SupabaseAuthProvider: "#4CAF50",
  CentralAuthProvider: "#2196F3",
};

const debug = (
  prefix: string,
  isDev: boolean,
  label: string,
  ...args: unknown[]
) => {
  if (!isDev) return;
  const color = DEBUG_COLORS[prefix] || "#9E9E9E";
  console.log(
    `%c[${prefix}]`,
    `color: ${color}; font-weight: bold;`,
    label,
    ...args
  );
};

const warn = (
  prefix: string,
  isDev: boolean,
  label: string,
  ...args: unknown[]
) => {
  if (!isDev) return;
  console.warn(`[${prefix}]`, label, ...args);
};

const error = (
  prefix: string,
  isDev: boolean,
  label: string,
  ...args: unknown[]
) => {
  if (!isDev) return;
  console.error(`[${prefix}]`, label, ...args);
};

const DEFAULT_REDIRECT_PATH = "/dashboard";
const SESSION_FETCH_TIMEOUT_MS = 15000;
const AUTH_INITIALIZATION_TIMEOUT_MS = 20000;

function resolveRedirectPath(): string | null {
  try {
    const path = sessionStorage.getItem("redirectAfterLogin");
    if (path) {
      sessionStorage.removeItem("redirectAfterLogin");
      return path;
    }
  } catch {
    /* sessionStorage may be unavailable */
  }
  try {
    const path = localStorage.getItem("redirectAfterLogin");
    if (path) {
      localStorage.removeItem("redirectAfterLogin");
      return path;
    }
  } catch {
    /* localStorage may be unavailable */
  }
  return null;
}

export function createAuthController(
  opts: AuthControllerOptions,
  prefix: string
): AuthApi {
  const { supabase, centralAuth, navigate, toast, isDev, onStateChange, throwOnAuthError } = opts;

  let generation = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let ssoQueue: Promise<void> = Promise.resolve();
  let cleanupFn: (() => void) | undefined;

  // State
  let user: User | null = null;
  let session: Session | null = null;
  let profile: Profile | null = null;
  let isLoading = true;
  let initError: string | null = null;

  // Mutable ref for last synced access token (dedupes SSO syncs)
  let lastSyncedToken: string | null = null;

  const deferredWork = {
    timers,
    get ssoQueue() {
      return ssoQueue;
    },
    clear() {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    },
    defer(workGen: number, work: () => void | Promise<void>) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (workGen !== generation) return;
        void work();
      }, 0);
      timers.add(timer);
    },
    async enqueueSso(work: () => Promise<unknown>) {
      ssoQueue = ssoQueue
        .catch(() => undefined)
        .then(async () => {
          await work();
        });
      return ssoQueue;
    },
  };

  const setState = (partial: Partial<AuthState>) => {
    if (partial.user !== undefined) user = partial.user;
    if (partial.session !== undefined) session = partial.session;
    if (partial.profile !== undefined) profile = partial.profile;
    if (partial.isLoading !== undefined) isLoading = partial.isLoading;
    if (partial.initError !== undefined) initError = partial.initError;
    
    // Notify React hook of state change
    onStateChange?.({
      user,
      session,
      profile,
      isLoading,
      initError,
    });
  };

  const fetchProfile = async (
    userId: string,
    authGen?: number
  ): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        error(prefix, isDev, "Error fetching profile:", error);
        return;
      }

      if (authGen !== undefined && authGen !== generation) return;

      if (data) {
        debug(prefix, isDev, "Profile found", { profileId: data.id });
        profile = data as unknown as Profile;
        setState({ profile });
      } else {
        debug(prefix, isDev, "No profile found, creating one", { userId });
        // Fetch user data if not available
        let userData = user;
        if (!userData) {
          const { data: fetched } = await supabase.auth.getUser();
          userData = fetched?.user || null;
        }

        if (authGen !== undefined && authGen !== generation) return;

        if (userData) {
          const basicProfile: Partial<Profile> = {
            id: userId,
            email: userData.email || "",
            full_name:
              userData.user_metadata?.full_name || userData.email || "User",
          };

          const { data: insertData, error: insertError } = await supabase
            .from("profiles")
            .insert([basicProfile])
            .select();

          if (authGen !== undefined && authGen !== generation) return;

          if (insertError) {
            debug(
              prefix,
              isDev,
              "Error creating profile, using fallback",
              insertError
            );
            if (authGen === undefined || authGen === generation) {
              profile = {
                ...basicProfile,
                company_name: null,
                avatar_url: null,
                role: "user",
              } as Profile;
              setState({ profile });
            }
            return;
          }

          if (insertData && insertData[0] && authGen !== undefined && authGen === generation) {
            debug(prefix, isDev, "Profile created", {
              profileId: insertData[0].id,
            });
            profile = insertData[0] as Profile;
            setState({ profile });

            // Seed default continuity entries for new users
            const defaultEntries = [
              {
                title: "Continuity begins here",
                content:
                  "# Continuity begins here\n\nThis is your continuity surface...",
                type: "context" as const,
                tags: ["welcome", "getting-started"],
                metadata: {
                  source: "system",
                  is_default: true,
                  title: "Continuity begins here",
                },
              },
              {
                title: "How to use the continuity surface",
                content:
                  "# How to use the continuity surface\n\nThe continuity surface is not a notes app...",
                type: "knowledge" as const,
                tags: ["tips", "getting-started", "tutorial"],
                metadata: {
                  source: "system",
                  is_default: true,
                  title: "How to use the continuity surface",
                },
              },
            ];

            // Import apiClient lazily to avoid circular deps
            const { apiClient } = await import("@/lib/api-client");
            Promise.allSettled(
              defaultEntries.map((entry) => apiClient.createMemory(entry))
            ).then((results) => {
              const rejected = results.find(
                (r) => r.status === "rejected"
              );
              const apiErr = results.find(
                (r) =>
                  r.status === "fulfilled" &&
                  (r as PromiseFulfilledResult<any>).value.error
              );
              if (rejected || apiErr) {
                warn(
                  prefix,
                  isDev,
                  "Failed to seed default context entries:",
                  rejected ?? (apiErr as PromiseFulfilledResult<any>).value.error
                );
              } else {
                debug(prefix, isDev, "Default context entries seeded");
              }
            });
          }
        } else {
          warn(
            prefix,
            isDev,
            "Cannot create profile - no user data available"
          );
        }
      }
    } catch (err) {
      error(prefix, isDev, "Error in fetchProfile:", err);
    }
  };

  const initializeAuth = async (): Promise<void> => {
    debug(prefix, isDev, "Initializing auth");
    setState({ isLoading: true });

    if (!supabase) {
      error(prefix, isDev, "Supabase client not initialized");
      setState({ isLoading: false });
      return;
    }

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      warn(prefix, isDev, "Auth initialization timeout - forcing loading false");
      setState({ isLoading: false });
    }, AUTH_INITIALIZATION_TIMEOUT_MS);

    try {
      // Session fetch with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Session fetch timeout")),
          SESSION_FETCH_TIMEOUT_MS
        );
      });

      const {
        data: { session: supabaseSession },
        error,
      }: {
        data: { session: Session | null };
        error: unknown;
      } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

      debug(prefix, isDev, "Session fetched", {
        hasSession: !!supabaseSession,
        hasError: !!error,
      });

      if (error) {
        error(prefix, isDev, "Error fetching Supabase session:", error);
      } else if (supabaseSession) {
        setState({ session: supabaseSession, user: supabaseSession.user });

        // Fetch profile non-blocking
        fetchProfile(supabaseSession.user.id).catch((err) => {
          error(prefix, isDev, "Error fetching profile:", err);
        });

        // SSO sync on session restore
        const accessToken = supabaseSession.access_token;
        if (accessToken && accessToken !== lastSyncedToken) {
          lastSyncedToken = accessToken;
          debug(prefix, isDev, "Initial SSO sync on session restore");
          void deferredWork.enqueueSso(() =>
            centralAuth
              .exchangeSupabaseToken(accessToken)
              .catch((err) =>
                warn(prefix, isDev, "Initial SSO sync failed:", err)
              )
          );
        }
      } else {
        debug(prefix, isDev, "No session found");
      }
    } catch (err) {
      error(prefix, isDev, "Error fetching initial session:", err);
      if (
        err instanceof Error &&
        err.message === "Session fetch timeout"
      ) {
        warn(prefix, isDev, "Session fetch timed out - continuing");
      }
    } finally {
      clearTimeout(safetyTimeout);
    }

    // Always set up auth state listener
    try {
      debug(prefix, isDev, "Setting up auth state listener");
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event, supabaseSession) => {
          const authGen = ++generation;
          deferredWork.clear();

          debug(
            prefix,
            isDev,
            "Auth state change:",
            event,
            supabaseSession?.user?.email
          );

          if (supabaseSession) {
            setState({
              session: supabaseSession,
              user: supabaseSession.user,
            });

            // Defer profile fetch and SSO sync
            deferredWork.defer(authGen, () =>
              fetchProfile(supabaseSession.user.id, authGen).catch((err) => {
                error(prefix, isDev, "Error fetching profile after auth change:", err);
              })
            );

            if (event === "SIGNED_IN") {
              const accessToken = supabaseSession.access_token;
              if (accessToken && accessToken !== lastSyncedToken) {
                lastSyncedToken = accessToken;
                debug(prefix, isDev, "Syncing SSO cookies");

                deferredWork.defer(authGen, () =>
                  deferredWork.enqueueSso(async () => {
                    if (authGen !== generation) return;
                    await centralAuth
                      .exchangeSupabaseToken(accessToken)
                      .then((success) => {
                        if (success) {
                          debug(prefix, isDev, "SSO cookies synced");
                        } else {
                          warn(prefix, isDev, "SSO cookie sync failed");
                        }
                      })
                      .catch((err) =>
                        warn(prefix, isDev, "SSO sync error:", err)
                      );
                  })
                );
              }

              toast({
                title: "Welcome!",
                description: `You are now signed in as ${supabaseSession.user.email}`,
              });

              const redirectPath = resolveRedirectPath();
              navigate(redirectPath || DEFAULT_REDIRECT_PATH);
            }
          } else {
            setState({ session: null, user: null, profile: null });
            lastSyncedToken = null;

            if (event === "SIGNED_OUT") {
              debug(prefix, isDev, "Clearing SSO cookies");
              // SSO cookies are cleared before supabase.auth.signOut() is invoked
              // by the explicit signOut() handler, so this listener only ensures
              // the cookie domain is wiped even if sign-out was triggered
              // elsewhere (token refresh failure, server-side revocation, etc.).
              // Navigation is intentionally NOT performed here — see Dashboard's
              // handleLogout, which owns the post-signout route.
              void deferredWork.enqueueSso(async () => {
                if (authGen !== generation) return;
                await centralAuth.clearSSOCookies().catch((err) => {
                  warn(prefix, isDev, "Failed to clear SSO cookies:", err);
                });
              });
            }
          }
        }
      );

      setState({ isLoading: false });
      cleanupFn = () => {
        debug(prefix, isDev, "Cleaning up auth subscription");
        subscription.unsubscribe();
      };
    } catch (err) {
      error(prefix, isDev, "Error setting up auth listener:", err);
      setState({ isLoading: false, initError: (err as Error).message });
    }
  };

  const handleOAuthUser = async (
    oauthUser: User,
    authGen?: number
  ): Promise<void> => {
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", oauthUser.id)
        .maybeSingle();

      if (authGen !== undefined && authGen !== generation) return;

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
        });

        if (!error) {
          await fetchProfile(oauthUser.id);
        }
      }

      toast({
        title: "Welcome!",
        description: "Successfully signed in. Redirecting to dashboard...",
      });

      setTimeout(() => {
        if (authGen !== undefined && authGen !== generation) return;
        navigate(resolveRedirectPath() || DEFAULT_REDIRECT_PATH);
      }, 100);
    } catch (err) {
      error(prefix, isDev, "Error handling OAuth user:", err);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setState({ isLoading: true });
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

      // Auth state change listener handles session update
      // Navigate after state change
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as any).message)
          : "An unexpected error occurred";
      toast({
        title: "Authentication failed",
        description: errMsg,
        variant: "destructive",
      });
      if (throwOnAuthError) throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    setState({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) throw error;

      toast({
        title: "Registration successful!",
        description: "Please check your email to confirm your account.",
      });

      // Auth state change listener will handle the session update
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as any).message)
          : "An unexpected error occurred";
      toast({
        title: "Registration failed",
        description: errMsg,
        variant: "destructive",
      });
      throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Clear SSO cookies
      await centralAuth.clearSSOCookies();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setState({ session: null, user: null, profile: null });
      navigate("/");
    } catch (err) {
      // When throwOnAuthError is true the caller owns the failure UI
      // (typically Dashboard.handleLogout's destructive "Sign-out failed"
      // toast). Showing it here as well would surface two toasts in
      // sequence. We preserve the throw so the caller's try/catch still
      // fires; we just skip the controller's own toast.
      if (!throwOnAuthError) {
        const errMsg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
            ? String((err as any).message)
            : "An unexpected error occurred";
        toast({
          title: "Error signing out",
          description: errMsg,
          variant: "destructive",
        });
      }
      if (throwOnAuthError) throw err;
    }
  };

  const handleAuthCallback = async (): Promise<void> => {
    try {
      const {
        data: { session: cbSession },
        error,
      }: {
        data: { session: Session | null };
        error: unknown;
      } = await supabase.auth.getSession();

      if (error) {
        error(prefix, isDev, "Error handling auth callback:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to complete authentication",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (cbSession) {
        setState({ session: cbSession, user: cbSession.user });
        await fetchProfile(cbSession.user.id);

        toast({
          title: "Authentication Successful",
          description: "Welcome! Redirecting to dashboard...",
        });

        setTimeout(() => {
          navigate(DEFAULT_REDIRECT_PATH);
        }, 1000);
      } else {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const { hasLegacyCentralCallbackParams, hasSupabaseCallbackParams } =
          await import("@/lib/auth/legacy-callbacks");

        const legacyInUrl =
          hasLegacyCentralCallbackParams(params) &&
          !hasSupabaseCallbackParams(params, hash);

        if (legacyInUrl) {
          const { clearLegacyCentralArtifacts, markCentralAuthReauthRequired } =
            await import("@/lib/auth/legacy-callbacks");
          clearLegacyCentralArtifacts(true);
          markCentralAuthReauthRequired();
          navigate("/?showAuth=true&reauth=central-auth-migration", {
            replace: true,
          });
          return;
        }

        navigate("/auth");
      }
    } catch (err) {
      error(prefix, isDev, "Error in auth callback:", err);
      navigate("/auth");
    }
  };

  // Kick off initialization
  void initializeAuth();

  return {
    get state() {
      return { user, session, profile, isLoading, initError };
    },
    signIn,
    signUp,
    signOut,
    handleAuthCallback,
    get cleanup() {
      return cleanupFn;
    },
  };
}
