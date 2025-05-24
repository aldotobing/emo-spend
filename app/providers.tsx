// app/providers.tsx
"use client";

import type React from "react";
import { useEffect } from "react";
import { setupSync } from "@/lib/db";

// Ensure syncExpenses is imported to be available in the bundle
import { syncExpenses } from "@/lib/db";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up sync listeners/handler
    if (typeof window !== "undefined") {
      setupSync();
    }
  }, []); // useEffect ini akan berjalan sekali saat komponen SyncProvider dimuat

  return <>{children}</>;
}
