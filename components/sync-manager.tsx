"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSync, type SyncResult } from "@/hooks/use-sync";
import { Button } from "./ui/button";
import { RefreshCw, Wifi, WifiOff, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { debounce } from 'lodash';

// Debounce time in milliseconds
const SYNC_DEBOUNCE_TIME = 1000;

interface SyncStats {
  syncedLocal: number;
  syncedRemote: number;
  skipped: number;
  lastSync?: Date;
  lastError?: string;
}

interface SyncManagerProps {
  showUI?: boolean;
}

export function SyncManager({ showUI = false }: SyncManagerProps = {}) {
  const { sync, isSyncing } = useSync();
  const isMounted = useRef(true);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [stats, setStats] = useState<SyncStats>({
    syncedLocal: 0,
    syncedRemote: 0,
    skipped: 0,
  });
  const [pendingSyncCount, setPendingSyncCount] = useState<number | null>(null);
  const [isLoadingPendingCount, setIsLoadingPendingCount] = useState(true);
  const router = useRouter();

  const performSync = async (manual = false): Promise<SyncResult> => {
    setSyncStatus('syncing');
    setSyncMessage(manual ? 'Syncing your data...' : 'Syncing in background...');
    
    try {
      const result = await sync({ force: manual });

      if (result.success) {
        setLastSync(new Date());
        setLastError(null);
        
        // Update stats if we have them
        if (
          result.syncedExpenses !== undefined ||
          result.syncedIncomes !== undefined
        ) {
          const syncedItems = (result.syncedExpenses ?? 0) + (result.syncedIncomes ?? 0);
          setStats((prev) => ({
            ...prev,
            syncedLocal: syncedItems,
            syncedRemote: 0, // This might need adjustment based on your sync logic
            skipped: result.skipped ?? 0,
          }));
          
          if (syncedItems > 0) {
            setSyncStatus('success');
            setSyncMessage(`Synced ${syncedItems} item${syncedItems !== 1 ? 's' : ''}`);
          } else {
            // If no items were synced, don't show success message
            setSyncStatus('idle');
            setSyncMessage('');
          }
        } else {
          setSyncStatus('idle');
          setSyncMessage('');
        }

        // Refresh the page data after successful sync
        router.refresh();
      } else if (result.error) {
        setLastError(result.error);
        setSyncStatus('error');
        setSyncMessage('Sync failed. Tap to retry.');
      } else if (result.message) {
        console.log("[Sync]", result.message);
        setSyncStatus('idle');
        setSyncMessage('');
      } else {
        // Default case - ensure we don't leave the toast showing
        setSyncStatus('idle');
        setSyncMessage('');
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setLastError(errorMessage);
      setSyncStatus('error');
      setSyncMessage('Sync failed. Tap to retry.');
      return { success: false, error: errorMessage };
    } finally {
      // Reset status after a delay if not already changed
      if (syncStatus !== 'error' && syncStatus !== 'idle') {
        // Clear any existing timer
        if (toastTimer.current) {
          clearTimeout(toastTimer.current);
        }
        
        // Set a new timer
        toastTimer.current = setTimeout(() => {
          if (isMounted.current) {
            setSyncStatus('idle');
            setSyncMessage('');
          }
        }, 3000);
      }
    }
  };

  // Use ref to track if initial sync has been performed
  const initialSyncDone = useRef(false);
  const syncInProgress = useRef(false);

  // Debounced sync function
  const debouncedSync = useCallback(
    debounce(async (manual = false) => {
      if (syncInProgress.current) return;
      syncInProgress.current = true;
      try {
        await performSync(manual);
      } finally {
        syncInProgress.current = false;
      }
    }, SYNC_DEBOUNCE_TIME),
    []
  );

  // Initial sync on mount
  useEffect(() => {
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      debouncedSync();
    }
    // Cleanup function
    return () => {
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  // Set up periodic sync (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncInProgress.current) {
        debouncedSync();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  // Get pending sync count when component mounts and after syncs
  useEffect(() => {
    let isMounted = true;
    
    const getPendingSyncCount = async () => {
      if (!isMounted) return;
      
      // Check if user is authenticated before proceeding
      const { getCurrentUser } = await import('@/lib/db');
      const user = await getCurrentUser();
      
      if (!user) {
        // console.log('[SyncManager] User not authenticated, skipping sync count check');
        setPendingSyncCount(null);
        setIsLoadingPendingCount(false);
        return;
      }
      
      setIsLoadingPendingCount(true);
      
      try {
        const { getExpensesByDateRange } = await import('@/lib/db');
        const { getIncomesByDateRange } = await import('@/lib/income');
        
        // Get all expenses and incomes
        const startDate = new Date(0).toISOString();
        const endDate = new Date().toISOString();
        
        const [expenses, incomes] = await Promise.all([
          getExpensesByDateRange(startDate, endDate),
          getIncomesByDateRange(startDate, endDate)
        ]);
        
        // Only count unsynced items
        const unsyncedExpenses = expenses.filter(expense => expense.synced === false);
        const unsyncedIncomes = incomes.filter(income => income.synced === false);
        
        const totalUnsynced = unsyncedExpenses.length + unsyncedIncomes.length;
        
        if (isMounted) {
          setPendingSyncCount(totalUnsynced);
        }
      } catch (error) {
        console.error('Error getting pending sync count:', error);
        if (isMounted) {
          setPendingSyncCount(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPendingCount(false);
        }
      }
    };
    
    getPendingSyncCount();
    
    return () => {
      isMounted = false;
    };
  }, [lastSync]);

  const handleManualSync = useCallback(() => {
    if (!syncInProgress.current) {
      debouncedSync(true);
    }
  }, [debouncedSync]);

  // Listen for online/offline events to trigger sync when connection is restored
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("[Sync] Connection restored, syncing...");
      setIsOnline(true);
      handleManualSync();
    };

    const handleOffline = () => {
      console.log("[Sync] Connection lost");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial online state
    setIsOnline(navigator.onLine);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      isMounted.current = false;
    };
  }, []);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "Never";
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (showUI) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Sync Status</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => performSync(true)}
            disabled={isSyncing || !isMounted}
            className={`gap-2 transition-all duration-300 ${
              syncStatus === 'success' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 
              syncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : ''
            }`}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : syncStatus === 'success' ? (
              <Check className="h-4 w-4" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="min-w-[60px] text-left">
              {syncStatus === 'syncing' ? 'Syncing...' : 
               syncStatus === 'success' ? 'Done' : 
               syncStatus === 'error' ? 'Error' : 'Sync Now'}
            </span>
          </Button>
        </div>

        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="min-h-[20px]">
            {syncMessage ? (
              <span className={`text-xs ${
                syncStatus === 'success' ? 'text-green-600' : 
                syncStatus === 'error' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {syncMessage}
              </span>
            ) : lastSync ? (
              <span>Last sync: {formatTimeAgo(lastSync)}</span>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="text-green-500">✓ Synced: {stats.syncedLocal + stats.syncedRemote} items</div>
              {isLoadingPendingCount ? (
                <div className="text-muted-foreground/50">Checking for updates...</div>
              ) : pendingSyncCount !== null && pendingSyncCount > 0 ? (
                <div className="text-amber-500">↻ {pendingSyncCount} item{pendingSyncCount !== 1 ? 's' : ''} to sync</div>
              ) : (
                <div className="text-green-500">✓ Up to date</div>
              )}
            </div>
          </div>

          <div className="text-xs mt-1 space-y-1">
            {stats.syncedLocal > 0 && (
              <div>• Uploaded: {stats.syncedLocal} items</div>
            )}

            {stats.syncedRemote > 0 && (
              <div>• Downloaded: {stats.syncedRemote} items</div>
            )}

            {stats.skipped > 0 && <div>• Skipped: {stats.skipped} items</div>}
          </div>

          {lastError && (
            <div className="text-destructive text-xs mt-1">
              Error: {lastError}
            </div>
          )}

          {!isOnline && (
            <div className="text-amber-500 text-xs mt-1">
              • Offline - changes will sync when back online
            </div>
          )}
        </div>
      </div>
    );
  }

  // Return null when not showing UI - the sync will still work in the background
  return null;
}
