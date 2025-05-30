'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { checkNetworkStatus as checkNetworkStatusUtil } from '@/lib/network-utils';
import type { ReactNode } from 'react';

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
  effectiveType?: string;
  speed?: number;
}

type ToastType = 'online' | 'offline' | 'slow' | 'recovered';

interface ToastConfig {
  icon?: ReactNode;
  title: string;
  message: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

// Constants
const SLOW_CONNECTION_THRESHOLD_RTT = 200; // ms
const SLOW_CONNECTION_THRESHOLD_DOWNLINK = 1; // Mbps
const CHECK_INTERVAL = 15000; // 15 seconds
const OFFLINE_CHECK_INTERVAL = 5000; // 5 seconds when offline
const DEBOUNCE_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

// Default messages
const MESSAGES = {
  checking: 'Memeriksa koneksi...',
  online: 'Terhubung ke internet',
  offline: 'Tidak ada koneksi internet',
  slow: (speed: string = '') => `Koneksi internet Anda lambat${speed ? ` (${speed})` : ''}`,
  slowWithType: (type: string, speed: string) => `Koneksi ${type} (${speed})`,
  error: 'Gagal memeriksa koneksi'
};

export default function useNetworkMonitor() {
  // State for tracking network status
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlow: false,
    type: 'unknown',
    message: MESSAGES.checking,
  }));
  
  // Refs for tracking state between renders
  const lastToastRef = useRef<{type: string; timestamp: number} | null>(null);
  const prevStatusRef = useRef<NetworkStatus | null>(null);
  const prevOnlineStatus = useRef<boolean | null>(null);
  const isCheckingRef = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionRef = useRef<NetworkInformation | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  
  // Get network connection information
  const getConnectionInfo = useCallback((): NetworkInformation | null => {
    if (typeof navigator === 'undefined') return null;
    
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    return connection || null;
  }, []);
  
  // Check if connection is slow based on RTT and downlink
  const isConnectionSlow = useCallback((connection: NetworkInformation | null): boolean => {
    if (!connection) return false;
    
    const isSlowByRtt = connection.rtt && connection.rtt > SLOW_CONNECTION_THRESHOLD_RTT;
    const isSlowByDownlink = connection.downlink && connection.downlink < SLOW_CONNECTION_THRESHOLD_DOWNLINK;
    
    return Boolean(isSlowByRtt || isSlowByDownlink);
  }, []);
  
  // Get appropriate connection message
  const getConnectionMessage = useCallback((connection: NetworkInformation | null, isOnline: boolean): string => {
    if (!isOnline) return MESSAGES.offline;
    if (!connection) return MESSAGES.online;
    
    const speed = connection.downlink ? `${connection.downlink.toFixed(1)} Mbps` : '';
    
    if (isConnectionSlow(connection)) {
      return connection.effectiveType 
        ? MESSAGES.slowWithType(connection.effectiveType, speed)
        : MESSAGES.slow(speed);
    }
    
    return MESSAGES.online;
  }, [isConnectionSlow]);
  
  // Show toast notification
  const showToast = useCallback((type: ToastType) => {
    const now = Date.now();
    const lastToast = lastToastRef.current;
    
    // Prevent duplicate toasts within 3 seconds
    if (lastToast && lastToast.type === type && now - lastToast.timestamp < 3000) {
      return;
    }
    
    lastToastRef.current = { type, timestamp: now };
    
    const toastConfig: Record<ToastType, ToastConfig> = {
      online: {
        title: 'Online',
        message: MESSAGES.online,
        variant: 'success',
        duration: 3000
      },
      offline: {
        title: 'Offline',
        message: MESSAGES.offline,
        variant: 'error',
        duration: 0 // Don't auto-dismiss
      },
      slow: {
        title: 'Slow Connection',
        message: MESSAGES.slow(''),
        variant: 'warning',
        duration: 5000
      },
      recovered: {
        title: 'Koneksi Kembali Normal',
        message: 'Koneksi internet Anda sudah kembali normal',
        variant: 'success',
        duration: 3000
      }
    };
    
    const config = toastConfig[type];
    
    // Use type assertion to handle different toast variants
    const toastVariant = config.variant as keyof typeof toast;
    
    // Create toast with proper typing
    const toastOptions = {
      duration: config.duration,
      id: 'network-status',
      description: config.message,
      className: 'toastWrapper',
      position: 'top-center' as const,
      style: {
        position: 'fixed',
        top: '1rem',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        pointerEvents: 'none',
        padding: '1rem',
        '--muted-foreground': 'var(--muted-foreground)',
      } as React.CSSProperties,
    };

    // Add variant class to the toast
    const variantClass = (() => {
      switch(toastVariant) {
        case 'success':
        case 'error':
        case 'warning':
          return toastVariant;
        default:
          return '';
      }
    })();

    const toastOptionsWithClass = {
      ...toastOptions,
      className: `toast ${variantClass}`.trim(),
    };

    switch (toastVariant) {
      case 'success':
        toast.success(config.message, toastOptionsWithClass);
        break;
      case 'error':
        toast.error(config.message, toastOptionsWithClass);
        break;
      case 'warning':
        toast.warning(config.message, toastOptionsWithClass);
        break;
      default:
        toast(config.message, toastOptionsWithClass);
    }
  }, []);
  
    // Check network status with retry logic
  const checkNetworkStatus = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    
    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const connection = getConnectionInfo();
      const isSlow = isConnectionSlow(connection);
      const message = getConnectionMessage(connection, isOnline);
      
      const newStatus: NetworkStatus = {
        isOnline,
        isSlow,
        type: connection?.type || 'unknown',
        message,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        effectiveType: connection?.effectiveType,
      };
      
      // Only update state if component is still mounted and status has changed
      if (mountedRef.current) {
        setStatus(prevStatus => {
          // Check if status has actually changed
          if (
            prevStatus.isOnline === newStatus.isOnline &&
            prevStatus.isSlow === newStatus.isSlow &&
            prevStatus.type === newStatus.type
          ) {
            return prevStatus;
          }
          return newStatus;
        });
        
        // Show toast for status changes
        if (prevOnlineStatus.current !== null && prevOnlineStatus.current !== isOnline) {
          showToast(isOnline ? 'online' : 'offline');
        } else if (isOnline && isSlow) {
          showToast('slow');
        } else if (isOnline && !isSlow && prevStatusRef.current?.isSlow) {
          showToast('recovered');
        }
        
        prevOnlineStatus.current = isOnline;
        prevStatusRef.current = newStatus;
      }
      
      // Reset retry count on success
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Error checking network status:', error);
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const retryDelay = Math.min(1000 * 2 ** retryCountRef.current, 30000); // Max 30s
        
        if (mountedRef.current) {
          checkTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
              checkNetworkStatus();
            }
          }, retryDelay) as unknown as NodeJS.Timeout;
        }
      } else {
        // Max retries reached, show error
        showToast('offline');
      }
    } finally {
      if (mountedRef.current) {
        isCheckingRef.current = false;
      }
    }
  }, [getConnectionInfo, getConnectionMessage, isConnectionSlow, showToast]);
  
  // Debounced version of checkNetworkStatus
  const debouncedCheckNetworkStatus = useMemo(
    () => debounce(checkNetworkStatus, 300),
    [checkNetworkStatus]
  );
  
  // Setup event listeners and initial check
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial check
    checkNetworkStatus();
    
    // Handler for connection changes
    const handleConnectionChange = () => {
      if (mountedRef.current) {
        debouncedCheckNetworkStatus();
      }
    };
    
    // Setup online/offline event listeners
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    // Setup connection change listener if available
    const connection = getConnectionInfo();
    if (connection?.addEventListener) {
      connection.addEventListener('change', handleConnectionChange);
      connectionRef.current = connection;
    }
    
    // Setup interval for periodic checks
    let interval: NodeJS.Timeout;
    
    const setupInterval = () => {
      clearInterval(interval);
      interval = setInterval(
        handleConnectionChange,
        status.isOnline ? CHECK_INTERVAL : OFFLINE_CHECK_INTERVAL
      );
    };
    
    setupInterval();
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      // Clear any pending timeouts
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      
      // Clear interval
      clearInterval(interval);
      
      // Remove event listeners
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
      
      // Remove connection change listener if it was added
      if (connectionRef.current?.removeEventListener) {
        connectionRef.current.removeEventListener('change', handleConnectionChange);
        connectionRef.current = null;
      }
      
      // Cancel any pending debounced calls
      debouncedCheckNetworkStatus.cancel();
    };
  }, [debouncedCheckNetworkStatus, getConnectionInfo, status.isOnline, checkNetworkStatus]);
  
  // Return the current network status and a manual refresh function
  return useMemo(() => ({
    ...status,
    checkNetworkStatus: debouncedCheckNetworkStatus,
  }), [status, debouncedCheckNetworkStatus]);
}