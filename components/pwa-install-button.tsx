'use client';

import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { usePWA } from '@/context/pwa-context';

export function PWAInstallButton() {
  const { showInstallButton, installPWA } = usePWA();

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border border-foreground/10 rounded-lg shadow-lg p-3 flex items-center space-x-3">
        <div className="flex items-center">
          <Download className="h-5 w-5 mr-2 text-foreground/70" />
          <span className="text-sm font-medium">Install EmoSpend</span>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const event = new Event('hide-install-button');
              window.dispatchEvent(event);
            }}
            className="h-8 w-8 p-0"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={installPWA}
            className="h-8"
          >
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
