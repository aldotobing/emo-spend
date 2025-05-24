"use client";

import { useEffect, useState } from "react";
import { useSync, type SyncResult } from "@/hooks/use-sync";
import { Button } from "./ui/button";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const { sync, isSyncing, isMounted } = useSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [stats, setStats] = useState<SyncStats>({
    syncedLocal: 0,
    syncedRemote: 0,
    skipped: 0,
  });
  const router = useRouter();

  const performSync = async (manual = false): Promise<SyncResult> => {
    try {
      const result = await sync({ force: manual });

      if (result.success) {
        setLastSync(new Date());
        setLastError(null);

        // Update stats if we have them
        if (
          result.syncedLocal !== undefined ||
          result.syncedRemote !== undefined
        ) {
          setStats((prev) => ({
            ...prev,
            syncedLocal: result.syncedLocal ?? 0,
            syncedRemote: result.syncedRemote ?? 0,
            skipped: result.skipped ?? 0,
          }));
        }

        // Refresh the page data after successful sync
        router.refresh();
      } else if (result.error) {
        setLastError(result.error);
      } else if (result.message) {
        console.log("[Sync]", result.message);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setLastError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Initial sync on mount
  useEffect(() => {
    performSync();
  }, []);

  // Set up periodic sync (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      performSync();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for online/offline events to trigger sync when connection is restored
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("[Sync] Connection restored, syncing...");
      setIsOnline(true);
      performSync();
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
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>

        <div className="text-sm space-y-1 text-muted-foreground">
          {lastSync && <div>Last sync: {formatTimeAgo(lastSync)}</div>}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            <span>{isOnline ? "Online" : "Offline"}</span>
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
