'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type BottomNavContextType = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

const BottomNavContext = createContext<BottomNavContextType | undefined>(undefined);

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleSetIsVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  return (
    <BottomNavContext.Provider 
      value={{ 
        isVisible, 
        setIsVisible: handleSetIsVisible 
      }}
    >
      {children}
    </BottomNavContext.Provider>
  );
}

export function useBottomNav() {
  const context = useContext(BottomNavContext);
  if (context === undefined) {
    throw new Error('useBottomNav must be used within a BottomNavProvider');
  }
  return context;
}
