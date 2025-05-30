// components/NetworkMonitor.tsx
'use client';

import { Wifi, WifiOff } from 'lucide-react';
import useNetworkMonitor from '@/hooks/useNetworkMonitor';
import { cn } from '@/lib/utils';

import React, { memo } from 'react';

type NetworkMonitorProps = {
  onManualCheck?: () => void;
};

const NetworkMonitorComponent = memo(({ onManualCheck }: NetworkMonitorProps) => {
  const { isOnline, isSlow, type, message } = useNetworkMonitor();

  if (!isOnline) {
    return (
      <div 
        className="fixed bottom-4 right-4 p-2 rounded-full bg-red-100 text-red-800" 
        title={message}
        aria-live="polite"
      >
        <WifiOff className="w-5 h-5" />
        <span className="sr-only">Offline: {message}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 p-2 rounded-full transition-colors duration-300",
        isSlow 
          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" 
          : "bg-green-100 text-green-800 hover:bg-green-200"
      )}
      title={message}
      aria-live="polite"
    >
      <div className="relative">
        <Wifi className={`w-5 h-5 ${isSlow ? 'opacity-60' : 'opacity-100'}`} />
        {isSlow && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-yellow-500 border-2 border-white"></div>
        )}
        <span className="sr-only">{message}</span>
      </div>
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