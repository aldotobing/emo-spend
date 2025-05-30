'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import React from 'react';

// Network Information API types
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | '5g';
type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
type NetworkType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';

interface NetworkInformation extends EventTarget {
  readonly type?: NetworkType;
  readonly effectiveType?: EffectiveConnectionType;
  readonly downlink?: number; // in Mbps
  readonly downlinkMax?: number;
  readonly rtt?: number; // in ms
  readonly saveData?: boolean;
  onchange?: EventListenerOrEventListenerObject | null;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
  }
}

export interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  type: ConnectionType | string;
  message: string;
  downlink?: number;
  rtt?: number;
}

// Constants
const SLOW_CONNECTION_THRESHOLD_RTT = 200; // ms
const SLOW_CONNECTION_THRESHOLD_DOWNLINK = 1; // Mbps
const CHECK_INTERVAL = 15000; // 15 seconds
const OFFLINE_CHECK_INTERVAL = 5000; // 5 seconds when offline

// Default messages
const MESSAGES = {
  checking: 'Memeriksa koneksi...',
  online: 'Terhubung ke internet',
  offline: 'Tidak ada koneksi internet',
  slow: (speed = '') => `Koneksi internet Anda lambat${speed ? ` (${speed})` : ''}`,
  error: 'Gagal memeriksa koneksi'
};

// Helper function to get connection info
const getConnectionInfo = (): NetworkInformation | null => {
  if (typeof navigator === 'undefined') return null;
  
  const connection = (navigator as any).connection || 
                   (navigator as any).mozConnection || 
                   (navigator as any).webkitConnection;
  
  return connection || null;
};

// Helper function to check if connection is slow
const isConnectionSlow = (connection: NetworkInformation | null): boolean => {
  if (!connection) return false;
  
  const isSlowByRtt = connection.rtt && connection.rtt > SLOW_CONNECTION_THRESHOLD_RTT;
  const isSlowByDownlink = connection.downlink && connection.downlink < SLOW_CONNECTION_THRESHOLD_DOWNLINK;
  
  return Boolean(isSlowByRtt || isSlowByDownlink);
};

// Helper function to get connection message
const getConnectionMessage = (connection: NetworkInformation | null, isOnline: boolean): string => {
  if (!isOnline) return MESSAGES.offline;
  if (!connection) return MESSAGES.online;
  
  const speed = connection.downlink ? `${connection.downlink.toFixed(1)} Mbps` : '';
  
  if (isConnectionSlow(connection)) {
    return MESSAGES.slow(speed);
  }
  
  return MESSAGES.online;
};

export default function useNetworkMonitor() {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlow: false,
    type: 'unknown',
    message: MESSAGES.checking,
  }));

  // Refs
  const lastToastRef = useRef<{ type: string; timestamp: number } | null>(null);
  const prevStatusRef = useRef<NetworkStatus | null>(null);
  const prevOnlineStatusRef = useRef<boolean | null>(null);
  const isCheckingRef = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionRef = useRef<NetworkInformation | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const statusRef = useRef<NetworkStatus>(status);
  const showToastRef = useRef<((type: 'online' | 'offline' | 'slow' | 'recovered') => void)>(() => {});
  const checkNetworkStatusRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Memoize toast configurations to prevent recreation on every render
  const toastConfigs = React.useMemo(() => ({
    online: {
      title: MESSAGES.online,
      message: status.isSlow ? MESSAGES.slow() : 'Koneksi internet tersedia',
      icon: 'check-circle',
      iconColor: 'text-green-500',
      duration: 5000, // 5 seconds
    },
    offline: {
      title: MESSAGES.offline,
      message: 'Tidak dapat terhubung ke internet',
      icon: 'alert-circle',
      iconColor: 'text-red-500',
      duration: 15000, // 15 seconds
    },
    slow: {
      title: MESSAGES.slow(),
      message: 'Kecepatan internet Anda lambat',
      icon: 'alert-triangle',
      iconColor: 'text-amber-500',
      duration: 8000, // 8 seconds
    },
    recovered: {
      title: MESSAGES.online,
      message: 'Koneksi kembali normal',
      icon: 'check-circle',
      iconColor: 'text-green-500',
      duration: 5000, // 5 seconds
    },
  }), [status.isSlow]);

  // Show toast notification - defined outside of useCallback to avoid dependency issues
  const showToast = (type: 'online' | 'offline' | 'slow' | 'recovered') => {
    const now = Date.now();
    const lastToast = lastToastRef.current;
    
    // Prevent duplicate toasts within 3 seconds
    if (lastToast && lastToast.type === type && now - lastToast.timestamp < 3000) {
      return;
    }
    
    lastToastRef.current = { type, timestamp: now };
    const config = toastConfigs[type];
    
    // Create the appropriate icon component
    let iconComponent;
    switch (config.icon) {
      case 'check-circle':
        iconComponent = React.createElement(CheckCircle, { 
          key: 'check-circle',
          className: `w-4 h-4 ${config.iconColor} flex-shrink-0` 
        });
        break;
      case 'alert-circle':
        iconComponent = React.createElement(AlertCircle, { 
          key: 'alert-circle',
          className: `w-4 h-4 ${config.iconColor} flex-shrink-0` 
        });
        break;
      case 'alert-triangle':
        iconComponent = React.createElement(AlertTriangle, { 
          key: 'alert-triangle',
          className: `w-4 h-4 ${config.iconColor} flex-shrink-0` 
        });
        break;
      default:
        iconComponent = React.createElement(CheckCircle, { 
          key: 'default-check',
          className: 'w-4 h-4 text-green-500 flex-shrink-0' 
        });
    }

    const toastContent = (
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0">
          {iconComponent}
        </div>
        <div className="grid gap-1">
          <p className="text-sm font-medium">{config.title}</p>
          <p className="text-sm text-muted-foreground">
            {config.message}
          </p>
        </div>
      </div>
    );
    
    // Dismiss any existing toasts first
    toast.dismiss();
    
    // Show the toast with stable configuration
    toast(toastContent, {
      duration: config.duration,
      className: '!bg-background !border-border !shadow-lg !p-0 !m-0 !rounded-lg !max-w-[calc(100%-1rem)]',
      style: {
        padding: 0,
        margin: 0,
        width: 'auto',
      }
    });
  };

  // Check network status - non-hook version for event listeners
  const checkNetworkStatusImpl = async () => {
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    const wasOnline = statusRef.current?.isOnline ?? true;
    const wasSlow = statusRef.current?.isSlow ?? false;
    const connection = getConnectionInfo();
    connectionRef.current = connection;

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const isSlow = isConnectionSlow(connection);
      const message = getConnectionMessage(connection, isOnline);

      const newStatus: NetworkStatus = {
        isOnline,
        isSlow,
        type: connection?.effectiveType || 'unknown',
        message,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      };

      // Store previous status before updating
      const prevStatus = { ...statusRef.current };
      
      // Update the ref with new status
      statusRef.current = newStatus;
      
      // Determine what changed
      const cameOnline = !prevStatus.isOnline && isOnline;
      const wentOffline = prevStatus.isOnline && !isOnline;
      const becameSlow = !prevStatus.isSlow && isSlow;
      const recoveredFromSlow = prevStatus.isSlow && !isSlow;
      
      // Show toasts based on what changed
      if (cameOnline) {
        showToast('online');
      } else if (wentOffline) {
        showToast('offline');
      } else if (becameSlow) {
        showToast('slow');
      } else if (recoveredFromSlow && isOnline) {
        // Only show recovered if we're still online
        showToast('recovered');
      }

      // Update React state
      setStatus(newStatus);
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Error checking network status:', error);
      retryCountRef.current += 1;
      
      if (retryCountRef.current <= 3) {
        // Retry after a delay
        setTimeout(checkNetworkStatusRef?.current || (() => {}), 5000);
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Keep refs updated with the latest functions
  useEffect(() => {
    statusRef.current = status;
    showToastRef.current = showToast;
    checkNetworkStatusRef.current = checkNetworkStatusImpl;
  }, [status, showToast, checkNetworkStatusImpl]);

  // Effect to set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Event handlers that use refs to get the latest functions
    const handleOnline = () => {
      if (checkNetworkStatusRef.current) {
        checkNetworkStatusRef.current();
      }
    };
    
    const handleOffline = () => {
      if (checkNetworkStatusRef.current) {
        checkNetworkStatusRef.current();
      }
    };
    
    const handleConnectionChange = () => {
      if (checkNetworkStatusRef.current) {
        checkNetworkStatusRef.current();
      }
    };

    // Initial check
    checkNetworkStatusRef.current();

    // Set up interval for periodic checks
    const interval = setInterval(
      () => checkNetworkStatusRef.current(),
      status.isOnline ? CHECK_INTERVAL : OFFLINE_CHECK_INTERVAL
    );

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = getConnectionInfo();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      
      clearInterval(interval);
      mountedRef.current = false;
    };
  }, [status.isOnline]);

  return status;
}