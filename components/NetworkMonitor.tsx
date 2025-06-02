// components/NetworkMonitor.tsx
'use client';

import { Wifi, WifiOff, AlertTriangle, Check } from 'lucide-react';
import useNetworkMonitor from '@/hooks/useNetworkMonitor';
import { cn } from '@/lib/utils';
import React, { memo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useBottomNav } from '@/context/bottom-nav-context';

type NetworkMonitorProps = {
  onManualCheck?: () => void;
};

const NetworkMonitorComponent = memo(({ onManualCheck }: NetworkMonitorProps) => {
  const { isOnline, isSlow, message } = useNetworkMonitor();
  const { isVisible: isNavVisible } = useBottomNav();
  const [showIndicator, setShowIndicator] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  // Clean up any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Track network status changes
  useEffect(() => {
    // Clear any pending timeouts
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Handle connection issues (offline or slow)
    if (!isOnline || isSlow) {
      const wasOnline = !wasOffline.current;
      setShowIndicator(true);
      setShowRestored(false);
      wasOffline.current = true;
      
      // Show toast for slow connection if we just detected it
      if (isSlow && wasOnline) {
        toast.warning(
          <div className="flex flex-col">
            <span className="font-medium">⚠️ Slow Connection</span>
            <span className="text-sm opacity-80">Your internet connection is slower than usual. Some features may be limited.</span>
          </div>,
          {
            duration: 4000,
            className: 'border border-amber-200 bg-amber-50',
          }
        );
      }
    } 
    // Handle connection restored
    else if (wasOffline.current) {
      setShowIndicator(true);
      setShowRestored(true);
      wasOffline.current = false;
      
      // Show connection restored toast with more context
      toast.success(
        <div className="flex flex-col">
          <span className="font-medium">✓ Connection Restored</span>
          <span className="text-sm opacity-80">You're back online with a stable connection</span>
        </div>, 
        {
          duration: 4000,
          className: 'border border-green-200 bg-green-50',
        }
      );
      
      // Hide after 3 seconds when connection is restored
      timeoutRef.current = window.setTimeout(() => {
        setShowIndicator(false);
        setShowRestored(false);
      }, 3000) as unknown as number; // Type assertion for browser vs Node.js setTimeout
    }
    // Handle stable good connection
    else {
      setShowIndicator(false);
      setShowRestored(false);
    }
  }, [isOnline, isSlow, wasOffline]);

  // Calculate bottom position based on bottom nav visibility
  const bottomPosition = isNavVisible 
    ? 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)'
    : '1rem';

  const handleStatusClick = () => {
    if (showRestored) {
      toast.success('Connection restored', {
        duration: 2000,
      });
    } else if (!isOnline) {
      toast.error('Offline: No internet connection', {
        duration: 2000,
      });
    } else if (isSlow) {
      toast.warning(`Slow connection: ${message}`, {
        duration: 2000,
      });
    }
  };

  const getStatusIcon = () => {
    if (showRestored) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <Check className="w-4 h-4" />
          <span className="sr-only">Connection restored</span>
        </div>
      );
    }
    
    if (!isOnline) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <WifiOff className="w-4 h-4" />
          <span className="sr-only">Offline: {message}</span>
        </div>
      );
    }
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <Wifi className="w-4 h-4 opacity-60" />
        <AlertTriangle className="absolute -top-0.5 -right-0.5 w-2 h-2 text-yellow-500" fill="currentColor" />
        <span className="sr-only">Slow connection: {message}</span>
      </div>
    );
  };

  if (!showIndicator) return null;

  return (
    <div 
      className={cn(
        "fixed right-4 z-[9999] transition-all duration-300 ease-in-out",
        showRestored ? 'animate-fade-in-out' : ''
      )}
      style={{
        bottom: bottomPosition,
        transition: 'bottom 0.3s ease-in-out, opacity 0.3s ease-in-out',
        opacity: showIndicator ? 1 : 0,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <button
        onClick={handleStatusClick}
        className={cn(
          "w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 border border-border/20 shadow-sm",
          "hover:opacity-80 active:scale-95",
          "focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background",
          "sm:w-7 sm:h-7",
          showRestored 
            ? "bg-green-100 text-green-800 focus:ring-green-500"
            : !isOnline 
              ? "bg-red-100 text-red-800 focus:ring-red-500" 
              : "bg-yellow-100 text-yellow-800 focus:ring-yellow-500"
        )}
        aria-label="Show network status"
        aria-live="polite"
      >
        {getStatusIcon()}
      </button>
    </div>
  );
});

NetworkMonitorComponent.displayName = 'NetworkMonitor';

// Error Boundary Component
class NetworkMonitorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NetworkMonitor error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

// Main export with error boundary
export function NetworkMonitor(props: NetworkMonitorProps) {
  return (
    <NetworkMonitorErrorBoundary>
      <NetworkMonitorComponent {...props} />
    </NetworkMonitorErrorBoundary>
  );
}