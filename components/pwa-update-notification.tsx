'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

type WorkboxWindow = Window & {
  workbox?: {
    addEventListener: (event: string, callback: () => void) => void;
    removeEventListener: (event: string, callback: () => void) => void;
    update: () => void;
  };
};

declare const window: WorkboxWindow;

export function PWAUpdateNotification() {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Handle the service worker update flow
  const onSWUpdate = (registration: ServiceWorkerRegistration) => {
    const worker = registration.waiting;
    if (worker) {
      setShowReload(true);
      setWaitingWorker(worker);
    }
  };

  // Listen for controller change (when a new service worker takes over)
  const onControllerChange = () => {
    window.location.reload();
  };

  // Reload the page to activate the new service worker
  const reloadPage = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowReload(false);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Listen for controller change (when a new service worker takes over)
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      // Check if there's a waiting service worker
      const checkWaitingServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.waiting) {
            onSWUpdate(registration);
          }
        } catch (error) {
          console.error('Error checking for service worker updates:', error);
        }
      };

      // Check for updates immediately
      checkWaitingServiceWorker();

      // Set up a message listener for service worker updates
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Clean up event listeners
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [waitingWorker]);

  if (!showReload) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-background border border-foreground/10 rounded-lg shadow-lg max-w-sm">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2 text-foreground/70" />
          <p className="text-sm font-medium">New version available</p>
        </div>
        <p className="text-xs text-foreground/60 mb-2">
          A new version of EmoSpend is available. Please reload to update.
        </p>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReload(false)}
            className="text-xs h-8"
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={reloadPage}
            className="text-xs h-8"
          >
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
