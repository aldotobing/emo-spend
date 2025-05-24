// Update sync-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type SyncOperation = 'push' | 'pull' | 'background' | 'gamification' | null;

type SyncContextType = {
  isSyncing: boolean;
  currentOperation: SyncOperation;
  lastSyncTime: Date | null;
};

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  currentOperation: null,
  lastSyncTime: null,
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

export function SyncStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<SyncOperation>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleSyncStart = (e: CustomEvent<{ operation: SyncOperation }>) => {
      setIsSyncing(true);
      setCurrentOperation(e.detail.operation);
    };

    const handleSyncEnd = () => {
      setIsSyncing(false);
      setCurrentOperation(null);
      setLastSyncTime(new Date());
    };

    // @ts-ignore - Custom event with detail
    window.addEventListener("sync:start", handleSyncStart);
    window.addEventListener("sync:end", handleSyncEnd);

    return () => {
      // @ts-ignore
      window.removeEventListener("sync:start", handleSyncStart);
      window.removeEventListener("sync:end", handleSyncEnd);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, currentOperation, lastSyncTime }}>
      {children}
    </SyncContext.Provider>
  );
}