'use client';

import { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useSyncProgress } from '@/hooks/useSyncProgress';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner = ({ className = '' }: OfflineBannerProps) => {
  const { isOnline, isSupabaseReachable, connectionQuality } = useConnectionStatus();
  const { isActive, pendingCount, failedCount, lastSync } = useSyncProgress();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show banner when offline or poor connection
  const shouldShow = !isOnline || !isSupabaseReachable || connectionQuality === 'poor';

  useEffect(() => {
    if (shouldShow && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [shouldShow, isDismissed]);

  // Reset dismissal when connection is restored
  useEffect(() => {
    if (isOnline && isSupabaseReachable && connectionQuality === 'good') {
      setIsDismissed(false);
    }
  }, [isOnline, isSupabaseReachable, connectionQuality]);

  if (!isVisible) return null;

  const getBannerStyle = () => {
    if (!isOnline) {
      return 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-200';
    }
    if (!isSupabaseReachable || connectionQuality === 'poor') {
      return 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-200';
    }
    return 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-200';
  };

  const getBannerMessage = () => {
    if (!isOnline) {
      return {
        title: 'You\'re offline',
        message: 'Your data is saved locally and will sync when connection is restored.',
        icon: '🔴'
      };
    }
    if (!isSupabaseReachable) {
      return {
        title: 'Server unavailable',
        message: 'Working in offline mode. Your changes are saved locally.',
        icon: '🟡'
      };
    }
    if (connectionQuality === 'poor') {
      return {
        title: 'Poor connection',
        message: 'Sync may be slower than usual. Your data is saved locally.',
        icon: '🟡'
      };
    }
    return {
      title: 'Syncing data',
      message: 'Your changes are being synchronized.',
      icon: '🔄'
    };
  };

  const { title, message, icon } = getBannerMessage();

  const formatLastSync = () => {
    if (!lastSync) return null;
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    
    if (diff < 60000) return 'Last sync: just now';
    if (diff < 3600000) return `Last sync: ${Math.floor(diff / 60000)}m ago`;
    return `Last sync: ${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className={`border-l-4 p-4 ${getBannerStyle()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <span className="text-lg mr-3">{icon}</span>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm mt-1">{message}</p>
            
            {/* Additional status info */}
            <div className="flex items-center gap-4 mt-2 text-xs">
              {formatLastSync() && (
                <span className="opacity-75">{formatLastSync()}</span>
              )}
              
              {isActive && (
                <span className="flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                  Syncing...
                </span>
              )}
              
              {pendingCount > 0 && (
                <span className="opacity-75">
                  {pendingCount} changes pending
                </span>
              )}
              
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {failedCount} sync failures
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="ml-4 text-current opacity-50 hover:opacity-75 text-lg leading-none"
          title="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};