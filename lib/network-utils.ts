export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown' | string;

export interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  type: ConnectionType | string;
  message: string;
  speed?: number; // in kbps
  downlink?: number;
  rtt?: number;
  effectiveType?: string;
}

// Simple network status checker
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const checkNetworkStatus = async (retryCount = 0): Promise<NetworkStatus> => {
  // Default response for server-side rendering
  if (typeof navigator === 'undefined') {
    return {
      isOnline: true,
      isSlow: false,
      type: 'unknown',
      message: 'Koneksi tidak dapat diperiksa'
    };
  }

  try {
    const isOnline = navigator.onLine;
    
    // If offline, no need to check connection details
    if (!isOnline) {
      return {
        isOnline: false,
        isSlow: false,
        type: 'offline',
        message: 'Tidak ada koneksi internet'
      };
    }

    let isSlow = false;
    let message = 'Koneksi baik';
    let type = 'unknown';
    let downlink: number | undefined;
    let rtt: number | undefined;
    let effectiveType: string | undefined;

    try {
      // Check connection type if available
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (connection) {
        type = connection.type || connection.effectiveType || 'unknown';
        downlink = connection.downlink;
        rtt = connection.rtt;
        effectiveType = connection.effectiveType;
        
        // Check for slow connection
        const slowTypes = ['slow-2g', '2g', '3g'];
        isSlow = slowTypes.includes(type) || 
                slowTypes.includes(connection.effectiveType) ||
                (connection.downlink && connection.downlink < 1);

        if (isSlow) {
          const speed = connection.downlink ? `${connection.downlink.toFixed(1)} Mbps` : 'lambat';
          message = `Koneksi lambat (${speed})`;
        }
      }


      return { 
        isOnline: true, 
        isSlow, 
        type, 
        message,
        downlink,
        rtt,
        effectiveType
      };
    } catch (error) {
      // If there's an error but we have retries left, retry after a delay
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return checkNetworkStatus(retryCount + 1);
      }
      
      // If we've exhausted retries, return a safe default
      console.error('Error checking network status:', error);
      return {
        isOnline: navigator.onLine,
        isSlow: false,
        type: 'unknown',
        message: 'Gagal memeriksa kualitas koneksi',
        downlink: undefined,
        rtt: undefined,
        effectiveType: undefined
      };
    }
  } catch (error) {
    // If there's an error in the outer try-catch, return a safe default
    console.error('Error in network status check:', error);
    return {
      isOnline: navigator?.onLine || false,
      isSlow: false,
      type: 'unknown',
      message: 'Gagal memeriksa status jaringan'
    };
  }
};

// Simple function to check if online
export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// Function to check connection speed (simplified)
export const checkConnectionSpeed = (): Promise<number> => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined') {
      return resolve(10); // Default to fast connection
    }

    const connection = (navigator as any).connection;
    if (connection && typeof connection.downlink === 'number') {
      return resolve(connection.downlink);
    }
    
    resolve(10); // Default to 10 Mbps if can't detect
  });
};

export const getConnectionType = (): ConnectionType => {
  if (typeof navigator === 'undefined') return 'unknown';
  
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  return connection?.type || connection?.effectiveType || 'unknown';
};

export const isSlowConnection = (speed: number): boolean => {
  return speed < 100; // Less than 100kbps is considered slow
};