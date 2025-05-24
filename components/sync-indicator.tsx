// Update sync-indicator.tsx
"use client";

import { useSyncStatus } from "@/context/sync-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const operationLabels = {
  push: "Saving...",
  pull: "Updating...",
  background: "Syncing...",
  gamification: "Updating stats...",
  null: "Synced",
} as const;

export function SyncIndicator() {
  const { isSyncing, currentOperation } = useSyncStatus();
  const operationLabel = operationLabels[currentOperation || 'null'];

  return (
    <div className="flex items-center gap-2 min-w-[24px] sm:min-w-[104px]">
      <div className="w-2.5 h-2.5 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isSyncing ? (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex items-center justify-center w-2.5 h-2.5"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]"
                )}
              />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="h-2.5 w-2.5 rounded-full bg-green-400 opacity-40"
            />
          )}
        </AnimatePresence>
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline-block min-w-[80px]">
        {operationLabel}
      </span>
    </div>
  );
}