"use client"; 

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import styles from "@/styles/toast.module.css";
import { useRouter } from 'next/navigation';
import { showErrorToast } from '@/components/ui/error-toast';
import { toast } from "sonner";
import { SyncIcon } from "@/components/ui/sync-icon";
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
  isLoading: boolean; // Alias for backward compatibility
  isSyncing: boolean; // New state for data syncing
  signIn: (email: string, password: string) => Promise<{ error: any } | null>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSync: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const isInitialLoad = useRef(true);
  const lastSignInTime = useRef<number | null>(null);
  const isProcessingAuth = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log(`[Auth] Auth state changed: ${event}`);
      
      // Update state first
      setSession(session);
      setUser(session?.user ?? null);
      
      // Only process SIGNED_IN event if we're not already processing auth
      if (event === 'SIGNED_IN' && !isProcessingAuth.current) {
        isProcessingAuth.current = true;
        lastSignInTime.current = Date.now();
        // console.log('[Auth] User signed in, starting sync...');
        
        let retryCount = 0;
        const maxRetries = 5;
        const checkUserAndSync = async () => {
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (user) {
              // console.log('[Auth] User verified:', user.id);
              await performPostLoginSync();
              // Never redirect automatically - let the user stay on their current page
              // This prevents unwanted redirects when reconnecting or refreshing
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
            toast.error('Gagal Sync Data', {
              description: 'Pastikan koneksi internet stabil dan coba lagi'
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
      
      // Mark initial load as complete after first render
      isInitialLoad.current = false;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      // Reset processing flag when unmounting
      isProcessingAuth.current = false;
    };
  }, [supabase]); // Depend on supabase to ensure correct instance if it changes

  // Toast options
  const toastOptions = {
    className: '!bg-background !text-foreground !border-border',
    style: {
      padding: 0,
      margin: 0,
      pointerEvents: 'auto' as const,
    },
    position: 'top-center' as const,
    icon: undefined,
  };

  const showSyncToast = () => {
    // Dismiss any existing toasts first
    toast.dismiss();
    
    // Return a promise that resolves with the toast ID
    return new Promise<string | number>((resolve) => {
      const toastId = toast.custom((t) => (
        <div className={`${styles.toastContent}`}>
          <SyncIcon className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="text-left">
            <p className="font-medium text-foreground">Menyinkronkan Data</p>
            <p className="text-sm text-muted-foreground">Harap tunggu sebentar...</p>
          </div>
        </div>
      ), {
        id: 'sync-toast', // Use a fixed ID to prevent duplicates
        duration: Infinity,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        }
      });
      
      resolve(toastId);
    });
  };

  // Helper function to add delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const showSuccessToast = async () => {
    // Dismiss any existing toasts first
    toast.dismiss();
    
    // Add a small delay before showing the success toast
    await delay(300);
    
    return new Promise((resolve) => {
      toast.custom((t) => (
        <div className={styles.toastContent}>
          <div className="h-5 w-5 flex items-center justify-center text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Sinkronisasi Berhasil</p>
            <p className="text-sm text-muted-foreground">Data Anda sudah diperbarui</p>
          </div>
        </div>
      ), {
        duration: 3000,
        className: styles.toast,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          margin: 0,
          width: 'auto',
          maxWidth: '90%',
        },
        onDismiss: () => resolve(undefined),
      });
    });
  };

  const showSyncErrorToast = async (error?: Error | string, retryFn?: () => void) => {
    // Dismiss any existing toasts first
    toast.dismiss();
    
    // Add a small delay before showing the error toast
    await delay(300);
    
    // Use the new error toast component with retry functionality
    const toastOptions = {
      className: styles.toast,
      style: {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        margin: 0,
        width: 'auto',
        maxWidth: '90%',
      }
    };
    
    return new Promise((resolve) => {
      showErrorToast(error || 'Gagal menyinkronkan data', retryFn || (() => {
        // Default retry behavior if no retry function is provided
        if (user) {
          performPostLoginSync();
        }
      }));
      resolve(undefined);
    });
  };

  const performPostLoginSync = useCallback(async () => {
    let loadingToast: string | number | undefined;
    
    try {
      // Show sync toast only when starting to sync
      loadingToast = await showSyncToast();
      
      // console.log('[Auth] Starting post-login sync...');
      
      // Start syncing expenses
      // console.log('[Sync] Syncing expenses...');
      const expensePull = await pullExpensesFromSupabase();
      // console.log(`[Sync] Pulled ${expensePull.synced} expenses, errors: ${expensePull.errors}`);
      
      const expenseSync = await syncExpenses();
      // console.log(`[Sync] Synced ${expenseSync.syncedLocal + expenseSync.syncedRemote} expenses`);
      
      // Start syncing incomes
      // console.log('[Sync] Syncing incomes...');
      const incomePull = await pullIncomesFromSupabase();
      // console.log(`[Sync] Pulled ${incomePull.synced} incomes, errors: ${incomePull.errors}`);
      
      const incomeSync = await syncIncomes();
      // console.log(`[Sync] Synced ${incomeSync.synced} incomes, errors: ${incomeSync.errors}`);
      
      // console.log('[Sync] Post-login sync completed successfully');
      
      // Dismiss the loading toast and show success
      if (loadingToast) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure toast is shown
        toast.dismiss(loadingToast);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before showing next toast
      }
      await showSuccessToast();
      
      return {
        success: true,
        expensePull,
        expenseSync,
        incomePull,
        incomeSync,
      };
    } catch (error) {
      console.error('[Sync] Error during post-login sync:', error);
      
      // Dismiss the loading toast and show error
      if (loadingToast) {
        await new Promise(resolve => setTimeout(resolve, 100));
        toast.dismiss(loadingToast);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await showSyncErrorToast();
      
      return false;
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
      toast.success("Berhasil masuk!", {
        description: "Menyiapkan dashboard Anda..."
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

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      // Show success message
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
      
      // Redirect to verification page
      router.push('/auth/verify');
      
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

const signInWithGoogle = useCallback(async () => {
  setLoading(true);
  
  try {
    // console.log('[Google Auth] Starting Google OAuth flow...');
    
    // First, sign in with Google using the default redirect flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
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
    
    // The rest will be handled by the onAuthStateChange listener in the AuthProvider
    // which will trigger the sync and update the user state
  } catch (error: any) {
    console.error("[Google Auth] Google sign-in error:", error.message, error);
    toast.error("Gagal masuk dengan Google", {
      description: error.message || "Terjadi kesalahan saat mencoba masuk dengan Google. Silakan coba lagi.",
    });
    throw error;
  } finally {
    setLoading(false);
  }
}, [supabase.auth, toast]);

  const signOut = useCallback(async () => {
    try {
      await clearLocalUserData();
      sessionStorage.removeItem('financialHealth');
      localStorage.removeItem('financialHealth');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error.message);
        toast.warning("Sign out warning", {
          description: error.message,
        });
        return;
      }

      toast.success("Signed out successfully");
      router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error("Error signing out", {
        description: error.message,
      });
    }
  }, [router, toast, supabase.auth]);

  // Memoize the context value
  const value = useMemo(
    () => ({
      user,
      loading,
      isLoading: loading,
      isSyncing,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      forceSync,
    }),
    [user, loading, isSyncing, signIn, signUp, signInWithGoogle, signOut, forceSync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
