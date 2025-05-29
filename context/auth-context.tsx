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
  loading: boolean;
  isLoading: boolean; // Alias for loading for backward compatibility
  isSyncing: boolean; // New state for data syncing
  signIn: (email: string, password: string) => Promise<{ error: any } | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSync: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log(`[Auth] Auth state changed: ${event}`);
      
      // Update state first
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        // console.log('[Auth] User signed in, starting sync...');
        
        let retryCount = 0;
        const maxRetries = 5;
        const checkUserAndSync = async () => {
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (user) {
              // console.log('[Auth] User verified:', user.id);
              await performPostLoginSync();
              router.push('/');
            } else if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.pow(2, retryCount) * 100;
              // console.log(`[Auth] Retry ${retryCount} in ${delay}ms`);
              setTimeout(checkUserAndSync, delay);
            } else {
              throw new Error('User not available after retries');
            }
          } catch (error) {
            // console.error('[Auth] Sync error:', error);
            toast({
              title: 'Gagal Sync Data',
              description: 'Pastikan koneksi internet stabil dan coba lagi',
              variant: 'destructive'
            });
          }
        };

        setTimeout(checkUserAndSync, 500);
      } else if (event === 'SIGNED_OUT') {
        // console.log('[Auth] User signed out, clearing local data');
        try {
          await clearLocalUserData();
          // console.log('[Auth] Local data cleared');
        } catch (error) {
          // console.error('[Auth] Error clearing local data:', error);
        }
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]); // Depend on supabase to ensure correct instance if it changes

  const performPostLoginSync = useCallback(async () => {
    // Show sync started toast that will auto-dismiss when the page changes
    toast({
      title: "Syncing your data...",
      variant: "default",
      duration: 3000, // Will auto-dismiss after 3 seconds
    });

    try {
      // console.log('[Auth] Starting post-login sync...');
      // Pull and sync expenses
      // console.log('[Sync] Pulling expenses...');
      const expensePull = await pullExpensesFromSupabase();
      // console.log(`[Sync] Pulled ${expensePull.synced} expenses, skipped ${expensePull.skipped}`);
      
      // console.log('[Sync] Syncing expenses...');
      const expenseSync = await syncExpenses();
      // console.log(`[Sync] Synced ${expenseSync.syncedLocal + expenseSync.syncedRemote} expenses`);
      
      // Then sync incomes
      // console.log('[Sync] Pulling incomes...');
      const incomePull = await pullIncomesFromSupabase();
      // console.log(`[Sync] Pulled ${incomePull.synced} incomes, skipped ${incomePull.skipped}`);
      
      // console.log('[Sync] Syncing incomes...');
      const incomeSync = await syncIncomes();
      // console.log(`[Sync] Synced ${incomeSync.synced} incomes, errors: ${incomeSync.errors}`);
      
      // console.log('[Sync] Post-login sync completed successfully');
      
      // The toast will auto-dismiss after its duration
      return {
        success: true,
        expensePull,
        expenseSync,
        incomePull,
        incomeSync
      };
    } catch (error) {
      console.error('[Auth] Error in post-login sync:', error);
      
      toast({
        title: "Sync Error",
        description: "There was an issue syncing your data. Some features may not work correctly.",
        variant: "destructive",
        duration: 5000,
      });
      
      return false;
    } finally {
      // The toast will auto-dismiss when new toasts are shown
    }
  }, [toast]);

  const forceSync = useCallback(async () => {
    // console.log('[Auth] Forcing manual sync');
    try {
      await performPostLoginSync();
      // console.log('[Auth] Manual sync completed');
      return true;
    } catch (error) {
      console.error('[Auth] Manual sync failed:', error);
      return false;
    }
  }, [performPostLoginSync]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };
      
      // Show redirecting toast
      toast({
        title: "Success!",
        description: "Preparing your dashboard...",
        variant: "default",
      });
      
      // Update user state immediately
      setUser(data.user);
      
      // Redirect to home page
      router.push('/');
      
      // Start syncing in background after redirect
      setIsSyncing(true);
      setTimeout(async () => {
        try {
          await performPostLoginSync();
        } catch (syncError) {
          console.error('Background sync error:', syncError);
        } finally {
          setIsSyncing(false);
        }
      }, 0);
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [router, performPostLoginSync]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      // console.log('[Google Auth] Starting Google OAuth flow...');
      
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
      
      // console.log('[Google Auth] OAuth flow started, waiting for auth state change...');
      
      // Wait for the auth state to change and handle the sign-in
      await new Promise<void>((resolve, reject) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error('[Google Auth] Auth state change timeout');
          reject(new Error('Auth state change timeout'));
        }, 30000); // 30 second timeout
        
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          // console.log('[Google Auth] Auth state changed:', event);
          
          if (event === 'SIGNED_IN') {
            clearTimeout(timeout);
            
            // Small delay to ensure session is fully established
            setTimeout(async () => {
              try {
                // console.log('[Google Auth] Triggering post-login sync...');
                await performPostLoginSync();
                // console.log('[Google Auth] Sync completed');
                resolve();
              } catch (syncError) {
                // console.error('[Google Auth] Sync error:', syncError);
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
      
      // console.log('[Google Auth] Google sign-in and sync completed successfully');
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
      setLoading(false);
    }
  }, [toast, supabase]);

  const signOut = useCallback(async () => {
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
        title: "Logout Failed",
        description: `An unexpected error occurred during logout: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [toast, supabase]); // Ensure `toast` and `supabase` are in dependencies

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoading: loading, // Alias for backward compatibility
      isSyncing,
      signIn,
      signInWithGoogle,
      signOut,
      forceSync,
    }),
    [user, loading, isSyncing, signIn, signInWithGoogle, signOut, forceSync]
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
