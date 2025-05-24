import { useCallback, useRef, useEffect, useState } from 'react';
import { syncExpenses } from '@/lib/db';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  syncedLocal?: number;
  syncedRemote?: number;
  skipped?: number;
}

interface SyncOptions {
  force?: boolean;
  silent?: boolean;
}

export function useSync() {
  const [isMounted, setIsMounted] = useState(false);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 30000; // 30 seconds cooldown between syncs
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const sync = useCallback(async (options: SyncOptions = {}): Promise<SyncResult> => {
    // Skip if we're not in the browser yet
    if (!isMounted) {
      return { 
        success: false, 
        message: 'Sync skipped - not in browser environment',
        syncedLocal: 0,
        syncedRemote: 0,
        skipped: 0
      };
    }
    
    const { force = false, silent = false } = options;
    const now = Date.now();
    
    // Skip if already syncing or in cooldown (unless forced)
    if (isSyncingRef.current || (!force && now - lastSyncTimeRef.current < SYNC_COOLDOWN_MS)) {
      return { 
        success: false, 
        message: 'Sync skipped - already in progress or in cooldown',
        syncedLocal: 0,
        syncedRemote: 0,
        skipped: 0
      };
    }

    isSyncingRef.current = true;
    
    try {
      if (!silent) {
        console.log('[useSync] Starting sync...');
      }
      
      const result = await syncExpenses();
      lastSyncTimeRef.current = now;
      
      if (!silent) {
        console.log('[useSync] Sync completed:', result);
      }
      
      return { success: true, ...result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useSync] Sync failed:', error);
      return { success: false, error: errorMessage };
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  return { sync, isSyncing: isSyncingRef.current };
}
