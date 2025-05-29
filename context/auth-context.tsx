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
import { pullIncomesFromSupabase, syncIncomes } from "@/lib/income";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSync: () => Promise<boolean>;
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Auth state changed: ${event}`);
      
      // Update state first
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        try {
          console.log('[Auth] User signed in, starting sync...');
          await performPostLoginSync();
          console.log('[Auth] Sync completed after sign in');
          router.push('/');
        } catch (error) {
          console.error('[Auth] Error during post-login sync:', error);
          toast({
            title: 'Sync Error',
            description: 'Could not sync all data. Some features may be limited.',
            variant: 'destructive',
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out, clearing local data');
        try {
          await clearLocalUserData();
          console.log('[Auth] Local data cleared');
        } catch (error) {
          console.error('[Auth] Error clearing local data:', error);
        }
      }
      
      setIsLoading(false);
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
      console.log('[Sync] Starting post-login sync');
      
      // Sync expenses first
      console.log('[Sync] Pulling expenses...');
      const expensePull = await pullExpensesFromSupabase();
      console.log(`[Sync] Pulled ${expensePull.synced} expenses, skipped ${expensePull.skipped}`);
      
      console.log('[Sync] Syncing expenses...');
      const expenseSync = await syncExpenses();
      console.log(`[Sync] Synced ${expenseSync.syncedLocal + expenseSync.syncedRemote} expenses`);
      
      // Then sync incomes
      console.log('[Sync] Pulling incomes...');
      const incomePull = await pullIncomesFromSupabase();
      console.log(`[Sync] Pulled ${incomePull.synced} incomes, skipped ${incomePull.skipped}`);
      
      console.log('[Sync] Syncing incomes...');
      const incomeSync = await syncIncomes();
      console.log(`[Sync] Synced ${incomeSync.synced} incomes, errors: ${incomeSync.errors}`);
      
      console.log('[Sync] Post-login sync completed successfully');
      
      return {
        success: true,
        expensePull,
        expenseSync,
        incomePull,
        incomeSync
      };
    } catch (error) {
      console.error("[Login] Error during post-login sync:", error);
      throw error; // Re-throw to allow handling in the calling function
    }
  }, []);

  const forceSync = useCallback(async () => {
    console.log('[Auth] Forcing manual sync');
    try {
      await performPostLoginSync();
      console.log('[Auth] Manual sync completed');
      return true;
    } catch (error) {
      console.error('[Auth] Manual sync failed:', error);
      return false;
    }
  }, [performPostLoginSync]);

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

        // Success case - The onAuthStateChange handler will handle the redirect
        console.log("Login successful - Auth state change will handle the redirect");
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
      console.log('[Google Auth] Starting Google OAuth flow...');
      
      // First, sign in with Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}`,
          //redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[Google Auth] OAuth error:', error);
        throw error;
      }
      
      console.log('[Google Auth] OAuth flow started, waiting for auth state change...');
      
      // Wait for the auth state to change and handle the sign-in
      await new Promise<void>((resolve, reject) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error('[Google Auth] Auth state change timeout');
          reject(new Error('Auth state change timeout'));
        }, 30000); // 30 second timeout
        
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[Google Auth] Auth state changed:', event);
          
          if (event === 'SIGNED_IN') {
            clearTimeout(timeout);
            
            // Small delay to ensure session is fully established
            setTimeout(async () => {
              try {
                console.log('[Google Auth] Triggering post-login sync...');
                await performPostLoginSync();
                console.log('[Google Auth] Sync completed');
                resolve();
              } catch (syncError) {
                console.error('[Google Auth] Sync error:', syncError);
                reject(syncError);
              }
            }, 1000); // 1 second delay
          }
        });
        
        // Cleanup subscription when done
        return () => {
          clearTimeout(timeout);
          subscription?.unsubscribe();
        };
      });
      
      console.log('[Google Auth] Google sign-in and sync completed successfully');
    } catch (error: any) {
      console.error("[Google Auth] Google sign-in error:", error.message, error);
      toast({
        title: "Google sign-in failed",
        description:
          error.message ||
          "An error occurred during Google sign-in. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, supabase]);

  const signOut = useCallback(async () => {
    // Router and toast are now variables in the scope of AuthProvider,
    // so they are accessible here without calling hooks again.
    try {
      await clearLocalUserData(); // Clear local database

      // Clear any cached financial data from session/local storage
      // This ensures no stale data remains after logout
      sessionStorage.removeItem('financialHealth');
      localStorage.removeItem('financialHealth');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[Logout] Supabase sign out error:", error.message);
        toast({
          title: "Logout Warning",
          description:
            "Failed to sign out from Supabase. You might still be logged in remotely.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
          variant: "default",
        });
      }

      // Clear any remaining state by forcing a full page reload
      window.location.href = "/auth/login";
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
      forceSync,
    }),
    [user, session, isLoading, signIn, signInWithGoogle, signOut, forceSync]
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
