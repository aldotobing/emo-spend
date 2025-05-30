// Update sync-indicator.tsx
"use client";

import { useSyncStatus } from "@/context/sync-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, Wifi, WifiOff, AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";
// Make sure to import the Tooltip component from your UI library
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const operationLabels = {
  push: "Saving changes...",
  pull: "Updating data...",
  background: "Syncing in background...",
  gamification: "Updating stats...",
  null: "Everything is up to date",
} as const;

const errorMessages = {
  connection: "Connection lost. Check your internet connection.",
  server: "Server error. Please try again later.",
  auth: "Authentication required. Please sign in again.",
  unknown: "An unknown error occurred."
} as const;

export function SyncIndicator() {
  const { isSyncing, currentOperation, lastError } = useSyncStatus();
  const [showError, setShowError] = useState(false);
  const operationLabel = operationLabels[currentOperation || 'null'];
  
  // Show error for 5 seconds if it's a connection error, otherwise show until manually cleared
  useEffect(() => {
    if (!lastError) {
      setShowError(false);
      return;
    }
    
    setShowError(true);
    
    if (lastError.type === 'connection') {
      const timer = setTimeout(() => {
        setShowError(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);
  
  const errorMessage = lastError ? (lastError.type ? errorMessages[lastError.type] : errorMessages.unknown) : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-6 h-6">
            <AnimatePresence mode="wait">
              {showError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex items-center justify-center"
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </motion.div>
              ) : isSyncing ? (
                <motion.div
                  key="syncing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      opacity: [0, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                    )}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex items-center justify-center"
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-sm">
          {showError ? (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{operationLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>{operationLabel}</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}