// components/NetworkMonitor.tsx
'use client';

import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import useNetworkMonitor from '@/hooks/useNetworkMonitor';
import { cn } from '@/lib/utils';
import React, { memo } from 'react';
import { toast } from 'sonner';
import { useBottomNav } from '@/context/bottom-nav-context';

type NetworkMonitorProps = {
  onManualCheck?: () => void;
};

const NetworkMonitorComponent = memo(({ onManualCheck }: NetworkMonitorProps) => {
  const { isOnline, isSlow, message } = useNetworkMonitor();
  const { isVisible: isNavVisible } = useBottomNav();

  // Calculate bottom position based on bottom nav visibility
  const bottomPosition = isNavVisible 
    ? 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)'
    : '1rem';

  const handleStatusClick = () => {
    if (!isOnline) {
      toast.error('Offline: No internet connection', {
        duration: 2000,
      });
    } else if (isSlow) {
      toast.warning(`Slow connection: ${message}`, {
        duration: 2000,
      });
    } else {
      toast.success('Connection is stable', {
        duration: 2000,
      });
    }
  };

  // Position is now controlled by the bottom nav visibility state

  const getStatusIcon = () => {
    if (!isOnline) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <WifiOff className="w-4 h-4" />
          <span className="sr-only">Offline: {message}</span>
        </div>
      );
    }
    
    if (isSlow) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <Wifi className="w-4 h-4 opacity-60" />
          <AlertTriangle className="absolute -top-0.5 -right-0.5 w-2 h-2 text-yellow-500" fill="currentColor" />
          <span className="sr-only">Slow connection: {message}</span>
        </div>
      );
    }
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <Wifi className="w-4 h-4" />
        <span className="sr-only">Online: {message}</span>
      </div>
    );
  };

  return (
    <div 
      className="fixed right-4 z-[9999] transition-all duration-300 ease-in-out"
      style={{
        bottom: bottomPosition,
        transition: 'bottom 0.3s ease-in-out',
        opacity: 1,
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
          !isOnline 
            ? "bg-red-100 text-red-800 focus:ring-red-500" 
            : isSlow 
              ? "bg-yellow-100 text-yellow-800 focus:ring-yellow-500" 
              : "bg-green-100 text-green-800 focus:ring-green-500"
        )}
        aria-label="Show network status"
        aria-live="polite"
      >
        {getStatusIcon()}
      </button>
    </div>
  );
});

// Add display name for better debugging
NetworkMonitorComponent.displayName = 'NetworkMonitor';

// Error Boundary Component
class NetworkMonitorErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NetworkMonitor error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently fail
    }
    return this.props.children;
  }
}

// Main export with error boundary
export default function NetworkMonitor(props: NetworkMonitorProps) {
  return (
    <NetworkMonitorErrorBoundary>
      <NetworkMonitorComponent {...props} />
    </NetworkMonitorErrorBoundary>
  );
}