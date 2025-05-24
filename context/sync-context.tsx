"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type SyncContextType = {
  isSyncing: boolean;
};

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
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

  // Create a custom event for sync status changes
  useEffect(() => {
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    // Add event listeners
    window.addEventListener("sync:start", handleSyncStart);
    window.addEventListener("sync:end", handleSyncEnd);

    return () => {
      window.removeEventListener("sync:start", handleSyncStart);
      window.removeEventListener("sync:end", handleSyncEnd);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
