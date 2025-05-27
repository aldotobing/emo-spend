'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type PWAPromptContextType = {
  isStandalone: boolean;
  showInstallButton: boolean;
  deferredPrompt: any;
  installPWA: () => void;
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
      console.log('Is in standalone mode:', isStandalone);
      return isStandalone;
    };

    const standalone = isInStandaloneMode();
    setIsStandalone(standalone);

    // If already in standalone mode, no need to show install button
    if (standalone) {
      console.log('App is in standalone mode, not showing install button');
      setShowInstallButton(false);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired in context', e);
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowInstallButton(true);
      
      // For debugging
      console.log('Install prompt available, showing install button');
    };

    // Check if the app was installed
    const handleAppInstalled = (evt: any) => {
      console.log('App was installed', evt);
      setShowInstallButton(false);
    };

    // Check if the app meets PWA installation criteria
    const checkPWAInstallable = async () => {
      try {
        if ('getInstalledRelatedApps' in navigator) {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          console.log('Installed related apps:', relatedApps);
        }
      } catch (error) {
        console.log('Could not get installed related apps:', error);
      }
    };

    // Debug function to manually trigger install prompt
    const debugInstallPrompt = () => {
      console.log('Manually triggering install prompt for debugging');
      const fakeEvent = {
        preventDefault: () => {},
        prompt: () => {
          console.log('Install prompt would be shown now');
          return Promise.resolve({ outcome: 'accepted' });
        },
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      handleBeforeInstallPrompt(fakeEvent);
    };

    // Add event listeners
    console.log('Adding PWA event listeners');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For debugging - expose function to manually trigger install prompt
    (window as any).debugInstallPrompt = debugInstallPrompt;
    console.log('For debugging, you can call window.debugInstallPrompt() to manually trigger the install prompt');

    // Check PWA installable status
    checkPWAInstallable();

    // Log the current installation status
    console.log('PWA context initialized');
    console.log('showInstallButton:', showInstallButton);
    console.log('isStandalone:', standalone);
    console.log('PWA installation criteria:', {
      isSecureContext: window.isSecureContext,
      serviceWorker: 'serviceWorker' in navigator,
      beforeInstallPrompt: 'beforeinstallprompt' in window,
      isInstalled: standalone
    });

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delete (window as any).debugInstallPrompt;
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    
    // Hide the install button
    setShowInstallButton(false);
  };

  return (
    <PWAContext.Provider
      value={{
        isStandalone,
        showInstallButton,
        deferredPrompt,
        installPWA,
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
