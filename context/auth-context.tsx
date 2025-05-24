"use client"; // <--- ESSENTIAL: This must be at the very top

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import {
  clearLocalUserData,
  pullExpensesFromSupabase,
  syncExpenses,
} from "@/lib/db";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // VVVV IMPORTANT: HOOKS MUST BE CALLED HERE, AT THE TOP LEVEL OF THIS FUNCTION COMPONENT (AuthProvider) VVVV
  const router = useRouter(); // Correct place for useRouter
  const supabase = getSupabaseBrowserClient(); // Can also be called here or within functions, but here is fine

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (event === "SIGNED_IN") {
        // You might trigger a data sync here as well, if needed
        // For Google SSO, the redirect handles this after login, so it's already in the login flow.
      } else if (event === "SIGNED_OUT") {
        // Optionally, add a safety net clear here if `signOut` is not always called directly.
        // await clearLocalUserData();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]); // Depend on supabase to ensure correct instance if it changes

  const performPostLoginSync = useCallback(async () => {
    try {
      await pullExpensesFromSupabase();
      await syncExpenses();
    } catch (error) {
      console.error("[Login] Error during post-login sync:", error);
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      console.log("Starting signIn function");
      setIsLoading(true);
      try {
        // Basic validation
        if (!email || !password) {
          const err = new Error("Please enter both email and password");
          console.log("Validation error:", err.message);
          throw err;
        }

        console.log("Attempting to sign in with email:", email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          console.log("Auth error occurred:", error);
          // More specific error handling
          let errorMessage = error.message;
          if (error.message.includes("Invalid login credentials")) {
            errorMessage =
              "The email or password you entered is incorrect. Please try again.";
          } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Please verify your email before signing in.";
          } else if (error.message.includes("network")) {
            errorMessage =
              "Network error. Please check your internet connection.";
          }
          const authError = new Error(errorMessage);
          console.log("Throwing auth error:", authError.message);
          throw authError;
        }

        // Success case - Let the calling component handle the success state
        console.log("Login successful");
        try {
          console.log("Starting post-login sync");
          await performPostLoginSync();
        } catch (syncError) {
          console.error("Sync error after login:", syncError);
          // Don't block the login flow for sync errors
          toast({
            title: "Sync Error",
            description:
              "Could not sync all data. Some features may be limited.",
            variant: "destructive" as const,
            duration: 5000,
          });
        }

        // Use router.push instead of window.location for better SPA behavior
        router.push("/");
      } catch (error: any) {
        // console.error("Sign-in error:", error);
        // Just re-throw the error - let the login page handle the toast
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, performPostLoginSync, supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      // After redirect, the onAuthStateChange listener will handle the session.
      // The post-login sync should be triggered by the "SIGNED_IN" event or similar.
    } catch (error: any) {
      console.error("Google sign-in error:", error.message);
      toast({
        title: "Google sign-in failed",
        description:
          error.message ||
          "An error occurred during Google sign-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, supabase]);

  const signOut = useCallback(async () => {
    // Router and toast are now variables in the scope of AuthProvider,
    // so they are accessible here without calling hooks again.
    try {
      await clearLocalUserData(); // Use the imported function

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[Logout] Supabase sign out error:", error.message);
        toast({
          // <-- This is using the `toast` variable from above
          title: "Logout Warning",
          description:
            "Failed to sign out from Supabase. You might still be logged in remotely.",
          variant: "destructive",
        });
      } else {
        toast({
          // <-- This is using the `toast` variable from above
          title: "Logged Out",
          description: "You have been successfully logged out.",
          variant: "default",
        });
      }

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 500);
    } catch (error: any) {
      console.error(
        "[Logout] Unexpected error during logout process:",
        error.message,
        error.stack
      );
      toast({
        // <-- This is using the `toast` variable from above
        title: "Logout Failed",
        description: `An unexpected error occurred during logout: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [toast, supabase]); // Ensure `toast` and `supabase` are in dependencies

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signIn,
      signInWithGoogle,
      signOut,
    }),
    [user, session, isLoading, signIn, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
