"use client";

import { RefreshCw } from "lucide-react";

export function SyncIcon({ className = "" }: { className?: string }) {
  return (
    <RefreshCw className={`h-4 w-4 animate-spin ${className}`} />
  );
}
