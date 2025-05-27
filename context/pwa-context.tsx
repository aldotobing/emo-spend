'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type PWAPromptContextType = {
  isStandalone: boolean;
  showInstallButton: boolean;
  deferredPrompt: any;
  installPWA: () => Promise<void>;
  setDeferredPrompt: (prompt: any) => void;
};

const PWAContext = createContext<PWAPromptContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Check if the app is running in standalone mode
    const isInStandaloneMode = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      return isStandalone;
    };

    const standalone = isInStandaloneMode();
    setIsStandalone(standalone);

    // If already in standalone mode, no need to show install button
    if (standalone) {
      setShowInstallButton(false);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowInstallButton(true);
      
      // For debugging
    };

    // Check if the app was installed
    const handleAppInstalled = (evt: any) => {
      setShowInstallButton(false);
    };

    // Check if the app meets PWA installation criteria
    const checkPWAInstallable = async () => {
      try {
        if ('getInstalledRelatedApps' in navigator) {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
        }
      } catch (error) {
      }
    };

    // Debug function to manually trigger install prompt
    const debugInstallPrompt = () => {
      const fakeEvent = {
        preventDefault: () => {},
        prompt: () => {
          return Promise.resolve({ outcome: 'accepted' });
        },
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      handleBeforeInstallPrompt(fakeEvent);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For debugging - expose function to manually trigger install prompt
    (window as any).debugInstallPrompt = debugInstallPrompt;

    // Check PWA installable status
    checkPWAInstallable();

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delete (window as any).debugInstallPrompt;
    };
  }, []);

  const installPWA = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available');
      return;
    }
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      // Log the user's choice
      
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
      
      // Hide the install button
      setShowInstallButton(false);
      
      return outcome;
    } catch (error) {
      console.error('Error during installation:', error);
      throw error;
    }
  };
  
  // Function to update the deferred prompt
  const updateDeferredPrompt = (prompt: any) => {
    setDeferredPrompt(prompt);
  };

  return (
    <PWAContext.Provider
      value={{
        isStandalone,
        showInstallButton,
        deferredPrompt,
        installPWA,
        setDeferredPrompt: updateDeferredPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export const usePWA = (): PWAPromptContextType => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
