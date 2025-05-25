import { useCallback, useRef, useEffect, useState } from "react";
import { syncExpenses } from "@/lib/db";
import { syncIncomes } from "@/lib/income";

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  syncedExpenses?: number;
  syncedIncomes?: number;
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

  const sync = useCallback(
    async (options: SyncOptions = {}): Promise<SyncResult> => {
      // Skip if we're not in the browser yet
      if (!isMounted) {
        return {
          success: false,
          message: "Sync skipped - not in browser environment",
          syncedExpenses: 0,
          syncedIncomes: 0,
          skipped: 0,
        };
      }

      const { force = false, silent = false } = options;
      const now = Date.now();

      // Skip if already syncing or in cooldown (unless forced)
      if (
        isSyncingRef.current ||
        (!force && now - lastSyncTimeRef.current < SYNC_COOLDOWN_MS)
      ) {
        return {
          success: false,
          message: "Sync skipped - already in progress or in cooldown",
          syncedExpenses: 0,
          syncedIncomes: 0,
          skipped: 0,
        };
      }

      isSyncingRef.current = true;
      
      // Dispatch sync start event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync:start', { 
          detail: { operation: 'push' } 
        }));
      }

      try {
        if (!silent) {
          console.log("[useSync] Starting sync...");
        }

        // Sync both expenses and incomes
        const expensesResult = await syncExpenses();
        const incomesResult = await syncIncomes();
        lastSyncTimeRef.current = now;

        if (!silent) {
          console.log("[useSync] Sync completed:", { expenses: expensesResult, incomes: incomesResult });
        }

        // Calculate total synced and skipped items
        const totalSynced = (expensesResult.syncedLocal || 0) + (expensesResult.syncedRemote || 0) + (incomesResult.synced || 0);
        const totalSkipped = (expensesResult.skipped || 0) + (incomesResult.errors || 0);

        return { 
          success: totalSynced > 0 || totalSkipped > 0,
          syncedExpenses: (expensesResult.syncedLocal || 0) + (expensesResult.syncedRemote || 0),
          syncedIncomes: incomesResult.synced || 0,
          skipped: totalSkipped
        };
      } catch (error) {
        // Dispatch sync end event on error
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sync:end'));
        }
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[useSync] Sync failed:", error);
        return { success: false, error: errorMessage };
      } finally {
        isSyncingRef.current = false;
        // Dispatch sync end event on success
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sync:end'));
        }
      }
    },
    []
  );

  return { sync, isSyncing: isSyncingRef.current, isMounted };
}
