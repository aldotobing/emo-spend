'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getDb, syncExpenses, pullExpensesFromSupabase } from '@/lib/db';
import { Button } from './ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Simple lock to prevent concurrent syncs
let isSyncing = false;

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
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    lastSync: Date | null;
    lastError: string | null;
    stats: SyncStats;
  }>({
    isSyncing: false,
    lastSync: null,
    lastError: null,
    stats: { syncedLocal: 0, syncedRemote: 0, skipped: 0 }
  });

  const updateSyncState = (updates: Partial<typeof syncState> | ((prev: typeof syncState) => Partial<typeof syncState>)) => {
    setSyncState(prev => {
      const newState = typeof updates === 'function' ? updates(prev) : updates;
      return {
        ...prev,
        ...newState
      };
    });
  };

  // Use a ref to track the current sync state without causing re-renders
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 30000; // 30 seconds cooldown between syncs

  const performSync = useCallback(async (manual = false) => {
    const now = Date.now();
    
    // Skip if already syncing or in cooldown (unless it's a manual sync)
    if (isSyncingRef.current || (!manual && now - lastSyncTimeRef.current < SYNC_COOLDOWN_MS)) {
      if (manual) {
        updateSyncState({ lastError: 'Sync already in progress or in cooldown' });
      }
      return;
    }

    isSyncingRef.current = true;
    updateSyncState({
      isSyncing: true,
      lastError: null
    });

    try {
      console.log('[Sync] Starting sync process...');
      
      // Perform the sync operation which now handles both push and pull
      const result = await syncExpenses();
      
      // Update last sync time
      lastSyncTimeRef.current = now;
      
      // Update stats
      updateSyncState(prev => ({
        lastSync: new Date(),
        stats: {
          ...prev.stats, // Keep existing stats
          ...result,    // Update with new sync results
          lastSync: new Date()
        },
        lastError: null
      }));
      
      console.log('[Sync] Sync completed successfully', result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Sync] Error during sync:', error);
      updateSyncState(prev => ({
        lastError: errorMessage,
        stats: {
          ...prev.stats, // Keep existing stats
          lastError: errorMessage
        }
      }));
    } finally {
      isSyncingRef.current = false;
      updateSyncState(prev => ({
        isSyncing: false,
        // Keep other state but update isSyncing
        ...(prev.lastError ? {} : { lastError: null })
      }));
    }
  }, []); // No dependencies - we're using refs for values that change

  // Initial sync on mount
  useEffect(() => {
    performSync();
  }, [performSync]);

  // Set up periodic sync (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      performSync();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [performSync]);

  // State to track online status
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  // Listen for online/offline events to trigger sync when connection is restored
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[Sync] Connection restored, syncing...');
      setIsOnline(true);
      performSync();
    };

    const handleOffline = () => {
      console.log('[Sync] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial online state
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Just now';
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
            disabled={syncState.isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        
        <div className="text-sm space-y-1 text-muted-foreground">
          {syncState.lastSync && (
            <div>Last sync: {formatTimeAgo(syncState.lastSync)}</div>
          )}
          
          <div className="text-xs mt-1 space-y-1">
            {syncState.stats.syncedLocal > 0 && (
              <div>• Uploaded: {syncState.stats.syncedLocal} items</div>
            )}
            
            {syncState.stats.syncedRemote > 0 && (
              <div>• Downloaded: {syncState.stats.syncedRemote} items</div>
            )}
            
            {syncState.stats.skipped > 0 && (
              <div>• Skipped: {syncState.stats.skipped} items</div>
            )}
          </div>
          
          {syncState.lastError && (
            <div className="text-destructive text-xs mt-1">
              Error: {syncState.lastError}
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
