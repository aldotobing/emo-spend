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
    // Check if the app is running in standalone mode
    const isInStandaloneMode = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isInStandaloneMode());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app was installed
    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      setShowInstallButton(false);
    });

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
