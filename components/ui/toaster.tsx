"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className="max-w-xs w-full mx-4 bg-background/80 text-foreground border border-border backdrop-blur-md sm:max-w-sm sm:mx-0"
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 sm:bottom-8 sm:right-8 sm:top-auto sm:left-auto sm:translate-y-0 sm:translate-x-0" />
    </ToastProvider>
  );
}
