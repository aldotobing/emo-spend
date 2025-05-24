"use client";

import { useSyncStatus } from "@/context/sync-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function SyncIndicator() {
  const { isSyncing } = useSyncStatus();

  return (
    <AnimatePresence>
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative flex items-center"
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
              "h-2.5 w-2.5 rounded-full bg-green-500",
              "shadow-[0_0_8px_rgba(34,197,94,0.7)]"
            )}
          />
          <span className="sr-only">Syncing data</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
