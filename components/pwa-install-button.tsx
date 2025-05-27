'use client';

import { Download, X, Info } from 'lucide-react';
import { Button } from './ui/button';
import { usePWA } from '@/context/pwa-context';
import { useEffect, useState } from 'react';

export function PWAInstallButton() {
  const { showInstallButton, installPWA, isStandalone, deferredPrompt } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if the button was previously dismissed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem('pwaInstallDismissed') === 'true';
      setDismissed(wasDismissed);
    }
  }, []);

  // Handle showing the button with a delay
  useEffect(() => {
    if (showInstallButton && !dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // 2 second delay before showing the button

      return () => clearTimeout(timer);
    }
  }, [showInstallButton, dismissed]);

  // Log the current state for debugging
  useEffect(() => {
    console.log('PWA Install Button State:', {
      showInstallButton,
      isStandalone,
      isVisible,
      dismissed,
      hasDeferredPrompt: !!deferredPrompt,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      pwaSupported: 'serviceWorker' in navigator && 'beforeinstallprompt' in window
    });
  }, [showInstallButton, isStandalone, isVisible, dismissed, deferredPrompt]);

  const handleInstallClick = async () => {
    try {
      setIsInstalling(true);
      console.log('Install button clicked, calling installPWA...');
      
      if (deferredPrompt) {
        console.log('Using deferredPrompt to show installation dialog');
        await installPWA();
      } else {
        console.warn('No deferredPrompt available, trying manual installation');
        // Fallback: Try to trigger installation manually
        if ('serviceWorker' in navigator && 'beforeinstallprompt' in window) {
          console.log('Attempting to trigger installation via beforeinstallprompt event');
          const event = new Event('beforeinstallprompt');
          window.dispatchEvent(event);
        } else {
          console.warn('Browser does not support PWA installation');
          // Show instructions for manual installation
          alert('Your browser does not support PWA installation. Please use Chrome, Edge, or another modern browser.');
        }
      }
      
      console.log('Installation completed');
    } catch (error) {
      console.error('Installation failed:', error);
      alert('Failed to install the app. Please try again or use a different browser.');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    console.log('Dismiss button clicked');
    setIsVisible(false);
    setDismissed(true);
    
    // Store dismissal in localStorage to prevent showing again
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwaInstallDismissed', 'true');
    }
  };

  // Don't show the button if the app is already installed, was dismissed, or not in a browser that supports PWA
  if (!isVisible || isStandalone || dismissed) {
    return null;
  }

  console.log('Rendering install button');

  return (
    <div 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in"
      style={{
        animation: 'fadeIn 0.3s ease-in-out',
        maxWidth: 'calc(100% - 2rem)'
      }}
    >
      <div className="bg-background border border-foreground/10 rounded-lg shadow-lg p-3 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center">
          <Download className="h-5 w-5 mr-2 text-foreground/70 flex-shrink-0" />
          <span className="text-sm font-medium text-center sm:text-left">
            Install EmoSpend for a better experience
          </span>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="h-8 w-8 p-0"
            title="Debug info"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="h-8 px-3"
            disabled={isInstalling}
            title="Dismiss"
          >
            <X className="h-4 w-4 mr-1" />
            <span className="sr-only">Dismiss</span>
          </Button>
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-8 px-4"
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Installing...
              </>
            ) : (
              'Install Now'
            )}
          </Button>
        </div>
      </div>
      
      {showDebugInfo && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify({
              showInstallButton,
              isStandalone,
              isVisible,
              dismissed,
              hasDeferredPrompt: !!deferredPrompt,
              pwaSupported: 'serviceWorker' in navigator && 'beforeinstallprompt' in window,
              userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
              isSecureContext: window.isSecureContext,
              serviceWorker: 'serviceWorker' in navigator,
              beforeInstallPrompt: 'beforeinstallprompt' in window,
            }, null, 2)}
          </pre>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
