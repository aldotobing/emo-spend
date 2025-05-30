// Update sync-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type SyncOperation = 'push' | 'pull' | 'background' | 'gamification' | null;
type SyncErrorType = 'connection' | 'server' | 'auth' | 'unknown' | null;

type SyncContextType = {
  isSyncing: boolean;
  currentOperation: SyncOperation;
  lastSyncTime: Date | null;
  lastError: {
    type: SyncErrorType;
    message: string;
    timestamp: Date;
  } | null;
  setError: (error: { type: SyncErrorType; message: string } | null) => void;
  clearError: () => void;
};

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  currentOperation: null,
  lastSyncTime: null,
  lastError: null,
  setError: () => {},
  clearError: () => {}
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
  const [lastError, setLastError] = useState<{
    type: SyncErrorType;
    message: string;
    timestamp: Date;
  } | null>(null);

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

  useEffect(() => {
    const handleOnline = () => {
      if (lastError?.type === 'connection') {
        clearError();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [lastError]);

  const setError = (error: { type: SyncErrorType; message: string } | null) => {
    if (error) {
      setLastError({ ...error, timestamp: new Date() });
    } else {
      setLastError(null);
    }
  };

  const clearError = () => {
    setLastError(null);
  };

  return (
    <SyncContext.Provider value={{
      isSyncing,
      currentOperation,
      lastSyncTime,
      lastError,
      setError,
      clearError
    }}>
      {children}
    </SyncContext.Provider>
  );
}