'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X, Wifi, WifiOff, AlertCircle, Clock, RotateCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorToastProps {
  error?: Error | string | null;
  retry?: () => void;
  onDismiss?: () => void;
  title?: string;
  description?: string;
  icon?: 'wifi' | 'wifi-off' | 'alert' | 'clock' | 'refresh';
  autoDismiss?: number;
}

export function ErrorToast({ 
  error, 
  retry, 
  onDismiss, 
  title,
  description,
  icon: propIcon,
  autoDismiss
}: ErrorToastProps) {
  // Determine which icon to show based on props and error type
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : '';
  const displayTitle = title || (error ? 'Terjadi Kesalahan' : 'Pemberitahuan');
  
  // Determine icon based on props or error type
  const iconToShow = propIcon || (() => {
    if (errorMessage.includes('timeout')) return 'clock';
    if (errorMessage.includes('offline') || errorMessage.includes('network')) return 'wifi-off';
    if (retry) return 'refresh';
    return 'alert';
  })();
  
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const toastRef = useRef<HTMLDivElement>(null);

  // Handle touch events for swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(0);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const x = e.touches[0].clientX - startX;
    setCurrentX(x);
    
    if (x > 50) {
      setSwipeDirection('right');
    } else if (x < -50) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (swipeDirection) {
      toastRef.current?.classList.add(
        swipeDirection === 'right' ? 'swipe-out-right' : 'swipe-out-left'
      );
      
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }
    
    setIsSwiping(false);
    setSwipeDirection(null);
  };

  const getErrorDetails = () => {
    if (description) return description;
    
    if (errorMessage.includes('timeout')) {
      return 'Permintaan melebihi batas waktu. Periksa koneksi Anda.';
    }
    
    if (errorMessage.includes('Failed to fetch')) {
      return 'Tidak dapat terhubung ke server. Pastikan Anda terhubung ke internet.';
    }
    
    return errorMessage;
  };

  // Auto dismiss if specified
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  const renderIcon = () => {
    const iconClass = 'h-5 w-5 flex-shrink-0';
    
    switch (iconToShow) {
      case 'wifi':
        return <Wifi className={`${iconClass} text-green-500`} />;
      case 'wifi-off':
        return <WifiOff className={`${iconClass} text-destructive`} />;
      case 'clock':
        return <Clock className={`${iconClass} text-amber-500`} />;
      case 'refresh':
        return <RotateCw className={`${iconClass} text-blue-500`} />;
      case 'alert':
      default:
        return <AlertCircle className={`${iconClass} text-destructive`} />;
    }
  };

  return (
    <div 
      ref={toastRef}
      className={cn(
        'toastContent relative',
        isSwiping && 'transition-transform duration-100'
      )}
      style={{
        transform: `translateX(${currentX}px)`,
        opacity: isSwiping ? 1 - Math.min(Math.abs(currentX / 200), 0.5) : 1,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-shrink-0">
        {renderIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">
          {displayTitle}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getErrorDetails()}
        </p>
        {retry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              retry();
            }}
            className="mt-2 text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
          >
            <RotateCw className="h-3 w-3" />
            Coba Lagi
          </button>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss?.();
        }}
        className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function showErrorToast(error: Error | string, retry?: () => void) {
  let toastId: string | number | null = null;
  
  const dismiss = () => {
    if (toastId !== null) {
      toast.dismiss(toastId);
    }
  };

  toast.custom(
    (t) => (
      <ErrorToast 
        error={error} 
        retry={retry} 
        onDismiss={() => {
          dismiss();
          // If there's a retry function, we'll keep the toast alive for a bit
          if (!retry) {
            toast.dismiss(t);
          }
        }} 
      />
    ),
    {
      duration: retry ? Infinity : 5000,
      position: 'top-center',
      style: {
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        margin: 0,
        width: 'auto',
      },
    }
  );
}
