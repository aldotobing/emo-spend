// app/providers.tsx
"use client";

import type React from "react";
import { useEffect } from "react";
// Ubah nama fungsi yang diimpor di sini
import { setupSync } from "@/lib/db";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up sync listeners/handler
    if (typeof window !== "undefined") {
      setupSync();
    }
  }, []); // useEffect ini akan berjalan sekali saat komponen SyncProvider dimuat

  return <>{children}</>;
}
