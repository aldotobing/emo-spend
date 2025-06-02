'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, WifiOff, AlertTriangle } from 'lucide-react';

// Network Information API types
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | '5g';
type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'wimax' | 'none' | 'unknown';
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

interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  type: ConnectionType | string;
  effectiveType?: EffectiveConnectionType;
  message: string;
  downlink?: number;
  rtt?: number;
  lastUpdated: number;
  saveData: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface NetworkCheckResult {
  isOnline: boolean;
  latency?: number;
  timestamp: number;
  method: 'navigator' | 'ping' | 'head'; // 'ping' is a placeholder, actual is 'head'
  error?: string;
  endpoint?: string;
}

const DEFAULT_OPTIONS = {
  checkInterval: 15000, // ms, when online
  offlineCheckInterval: 5000, // ms, when offline
  slowRTTThreshold: 300, // ms
  slowDownlinkThreshold: 1.5, // Mbps
  enableToast: true,
  testMode: false, // Bypasses actual network checks, useful for testing UI
  endpointsToCheck: [ // Small, fast, cache-busted HEAD requests
    'https://www.google.com/favicon.ico',
    'https://www.gstatic.com/generate_204',
    'https://connectivitycheck.gstatic.com/generate_204'
  ],
  requiredSuccessfulChecks: 2, // Number of successful HEAD checks to confirm online status
  checkTimeout: 3000, // ms, timeout per HEAD check
};

export default function useNetworkMonitor(options: Partial<typeof DEFAULT_OPTIONS> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlow: false,
    type: 'unknown',
    message: 'Initializing network check...',
    lastUpdated: Date.now(),
    saveData: false,
    confidence: 'low' // Initial confidence is low until checks run
  }));

  const isCheckingRef = useRef(false);
  const intervalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const statusRef = useRef(status); // Ref to current status for use in closures

  // Refs for tracking previous state for toasts
  const prevIsOnlineRef = useRef<boolean | undefined>(status.isOnline);
  const prevIsSlowRef = useRef<boolean | undefined>(status.isSlow);

  useEffect(() => {
    statusRef.current = status;
    // Update previous state refs *after* status has been processed for the current render
    // This ensures toasts compare against the truly previous render's state
    prevIsOnlineRef.current = status.isOnline;
    prevIsSlowRef.current = status.isSlow;
  }, [status]);

  const getNetworkInfo = useCallback((): NetworkInformation | null => {
    if (config.testMode || typeof navigator === 'undefined') return null;
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }, [config.testMode]);

  const checkConnectionReliability = useCallback(async (): Promise<boolean> => {
    if (config.testMode) return true;
    if (typeof navigator === 'undefined' || !navigator.onLine) return false;

    const checkPromises = config.endpointsToCheck.map(endpoint => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.checkTimeout);
      const startTime = performance.now();

      return fetch(`${endpoint}?t=${Date.now()}`, { // Cache-busting query param
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors', // Allows requests to succeed even if server lacks CORS for HEAD
        signal: controller.signal,
        referrerPolicy: 'no-referrer'
      })
        .then(() => ({ // For 'no-cors', a resolved promise means a request was made.
          isOnline: true,
          latency: performance.now() - startTime,
          timestamp: Date.now(),
          method: 'head' as const,
          endpoint
        }))
        .catch((err) => ({
          isOnline: false,
          latency: performance.now() - startTime,
          timestamp: Date.now(),
          method: 'head' as const,
          endpoint,
          error: err.name === 'AbortError' ? 'timeout' : 'fetch_failed'
        }))
        .finally(() => clearTimeout(timeoutId));
    });

    const results = await Promise.all(checkPromises);
    const successfulChecks = results.filter(r => r.isOnline).length;
    return successfulChecks >= config.requiredSuccessfulChecks;
  }, [config.endpointsToCheck, config.requiredSuccessfulChecks, config.checkTimeout, config.testMode]);

  const isConnectionSlow = useCallback((connection: NetworkInformation | null): boolean => {
    if (!connection || config.testMode) return false;
    
    const isSlowByRtt = connection.rtt != null && connection.rtt > config.slowRTTThreshold;
    const isSlowByDownlink = connection.downlink != null && connection.downlink < config.slowDownlinkThreshold;
    const isSlowByType = connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
    
    return Boolean(isSlowByRtt || isSlowByDownlink || isSlowByType);
  }, [config.slowRTTThreshold, config.slowDownlinkThreshold, config.testMode]);

  const updateNetworkStatus = useCallback(async (
    currentNavigatorOnline: boolean
  ): Promise<NetworkStatus> => {
    if (!mountedRef.current) {
      // Should ideally not happen if cleanup is correct, but as a safeguard
      return statusRef.current; // Return last known status
    }

    const connection = getNetworkInfo();
    // Only perform reliability check if navigator.onLine is true
    const isReliable = currentNavigatorOnline ? await checkConnectionReliability() : false;
    
    const actualOnlineStatus = currentNavigatorOnline && isReliable;
    const currentIsSlow = actualOnlineStatus ? isConnectionSlow(connection) : false;
    const saveData = connection?.saveData ?? false;

    let confidence: NetworkStatus['confidence'] = 'low';
    if (actualOnlineStatus) {
        confidence = 'high'; // Online and reliability checks passed
    } else {
        if (currentNavigatorOnline) { // navigator.onLine true, but reliability checks failed
            confidence = 'medium';
        } else { // navigator.onLine false
            confidence = 'high';
        }
    }

    const newStatus: NetworkStatus = {
      isOnline: actualOnlineStatus,
      isSlow: currentIsSlow,
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData,
      message: actualOnlineStatus 
        ? (currentIsSlow ? 'Connected (slow connection)' : 'Connected')
        : 'No internet connection',
      lastUpdated: Date.now(),
      confidence,
    };

    setStatus(prev => {
      // Shallow compare to prevent unnecessary re-renders if status hasn't changed
      if (
        prev.isOnline !== newStatus.isOnline ||
        prev.isSlow !== newStatus.isSlow ||
        prev.type !== newStatus.type ||
        prev.effectiveType !== newStatus.effectiveType ||
        prev.message !== newStatus.message || // Message can change even if online status is same (e.g. slow)
        prev.confidence !== newStatus.confidence
      ) {
        return newStatus;
      }
      return prev;
    });
    return newStatus;
  }, [getNetworkInfo, checkConnectionReliability, isConnectionSlow, config.testMode]); // Added config.testMode

  const performCheck = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current || !mountedRef.current || typeof navigator === 'undefined') {
      return statusRef.current.isOnline;
    }
    isCheckingRef.current = true;

    try {
      // Use the current navigator.onLine state as the basis
      const newStatus = await updateNetworkStatus(navigator.onLine);
      return newStatus.isOnline;
    } catch (error) {
      console.error('Network check failed:', error);
      // Assume offline on error during the check process itself
      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          isOnline: false,
          isSlow: false,
          message: 'Error checking connection',
          confidence: 'low',
          lastUpdated: Date.now(),
        }));
      }
      return false;
    } finally {
      if (mountedRef.current) {
        isCheckingRef.current = false;
      }
    }
  }, [updateNetworkStatus]); // Removed config.testMode from here, it's handled in updateNetworkStatus

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && mountedRef.current) {
      performCheck();
    }
  }, [performCheck]);

  // Effect for event listeners and periodic checks
  useEffect(() => {
    if (config.testMode || typeof window === 'undefined') return;

    mountedRef.current = true;
    performCheck(); // Initial check

    const handleOnline = () => performCheck();
    const handleOffline = () => performCheck(); // navigator.onLine changed, re-evaluate

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const connection = getNetworkInfo();
    if (connection) {
      connection.addEventListener('change', handleOnline); // 'change' implies re-checking
    }

    // Periodic checking
    const setupInterval = () => {
      if (intervalTimeoutRef.current) clearTimeout(intervalTimeoutRef.current);
      const intervalDuration = statusRef.current.isOnline 
        ? config.checkInterval 
        : config.offlineCheckInterval;
      
      intervalTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          performCheck().finally(() => {
            if(mountedRef.current) setupInterval(); // Schedule next check only after current one finishes
          });
        }
      }, intervalDuration);
    };

    setupInterval();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (connection) {
        connection.removeEventListener('change', handleOnline);
      }
      if (intervalTimeoutRef.current) {
        clearTimeout(intervalTimeoutRef.current);
      }
    };
  }, [
    performCheck, 
    handleVisibilityChange, // Added
    getNetworkInfo, 
    config.checkInterval, 
    config.offlineCheckInterval, 
    config.testMode
  ]);

  // Track last toast times for each type
  const lastToastTimeRef = useRef({
    offline: 0,
    slow: 0
  });
  
  // Toast intervals in milliseconds (5 minutes for offline, 2 minutes for slow)
  const TOAST_INTERVALS = {
    OFFLINE: 5 * 60 * 1000,  // 5 minutes
    SLOW: 2 * 60 * 1000      // 2 minutes
  };

  // Effect for toast notifications
  useEffect(() => {
    if (!config.enableToast || config.testMode || !mountedRef.current) {
      return;
    }

    const currentTime = Date.now();
    const { isOnline, isSlow } = statusRef.current;
    const { offline, slow } = lastToastTimeRef.current;

    // Show offline toast if offline and either:
    // 1. Just went offline, or
    // 2. Last toast was shown more than TOAST_INTERVALS.OFFLINE ms ago
    if (!isOnline && (offline === 0 || (currentTime - offline) > TOAST_INTERVALS.OFFLINE)) {
      toast('Connection lost', {
        description: 'Some features may be available',
        icon: <WifiOff className="w-4 h-4 text-red-500" />,
        className: '!bg-background/90 !border-border/50 !top-4 md:!bottom-4 md:!top-auto',
        duration: 5000,
        position: 'top-center' as const,
        style: { margin: '0 auto' },
        id: 'network-status-offline',
        dismissible: false
      });
      lastToastTimeRef.current.offline = currentTime;
    } 
    // Show slow connection toast if online but slow and either:
    // 1. Just became slow, or
    // 2. Last toast was shown more than TOAST_INTERVALS.SLOW ms ago
    else if (isOnline && isSlow && (slow === 0 || (currentTime - slow) > TOAST_INTERVALS.SLOW)) {
      toast('Slow connection', {
        description: 'Your connection is slower than usual',
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        className: '!bg-background/90 !border-border/50 !top-4 md:!bottom-4 md:!top-auto',
        duration: 5000,
        position: 'top-center' as const,
        style: { margin: '0 auto' },
        id: 'network-status-slow',
        dismissible: false
      });
      lastToastTimeRef.current.slow = currentTime;
    }
    // Show online toast when connection is restored
    else if (isOnline && prevIsOnlineRef.current === false) {
      // Dismiss any existing network status toasts first
      toast.dismiss('network-status-offline');
      toast.dismiss('network-status-slow');
      
      toast('Back online', {
        description: 'Your connection has been restored',
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        className: '!bg-background/90 !border-border/50 !top-4 md:!bottom-4 md:!top-auto',
        duration: 3000,
        position: 'top-center' as const,
        style: { margin: '0 auto' },
        id: 'network-status-online',
        dismissible: false
      });
      // Reset timers when coming back online
      lastToastTimeRef.current = { offline: 0, slow: 0 };
    }
  }, [status.isOnline, status.isSlow, config.enableToast, config.testMode]);

  const refresh = useCallback(() => {
    // Clear any pending interval and check immediately
    if (intervalTimeoutRef.current) clearTimeout(intervalTimeoutRef.current);
    return performCheck().finally(() => {
        if (mountedRef.current && !config.testMode) {
          // Reschedule interval after manual refresh
          const setupInterval = () => { // Duplicated from above, consider refactoring if larger
            if (intervalTimeoutRef.current) clearTimeout(intervalTimeoutRef.current);
            const intervalDuration = statusRef.current.isOnline 
              ? config.checkInterval 
              : config.offlineCheckInterval;
            
            intervalTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                performCheck().finally(() => {
                  if(mountedRef.current) setupInterval();
                });
              }
            }, intervalDuration);
          };
          setupInterval();
        }
    });
  }, [performCheck, config.checkInterval, config.offlineCheckInterval, config.testMode]);

  return {
    ...status, // current network status
    refresh, // Manual trigger to check network
    isChecking: isCheckingRef.current, // Whether a check is currently in progress
  };
}