import { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';

// Extend WakeLockSentinel to include our custom release handler
interface ExtendedWakeLockSentinel extends WakeLockSentinel {
  _releaseHandler?: () => void;
}

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<ExtendedWakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for support once on mount
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);
    if (!supported) {
      logger.log('Screen Wake Lock API not supported.');
    }
  }, []);

  const syncWakeLock = useCallback(async (shouldBeActive: boolean) => {
    if (!isSupported) return;

    if (shouldBeActive) {
      // If we need it and don't have it, request it.
      if (wakeLock === null) {
        try {
          const lock = await navigator.wakeLock.request('screen') as ExtendedWakeLockSentinel;
          const handleRelease = () => {
            logger.log('Screen Wake Lock was released by the system.');
            setWakeLock(null);
          };
          lock.addEventListener('release', handleRelease);
          
          // Store the handler for cleanup
          lock._releaseHandler = handleRelease;
          
          logger.log('Screen Wake Lock is active.');
          setWakeLock(lock);
        } catch (err: unknown) {
          if (err instanceof Error) {
            logger.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
          }
        }
      }
    } else {
      // If we don't need it and have it, release it.
      if (wakeLock) {
        // Clean up event listener before releasing
        if (wakeLock._releaseHandler) {
          wakeLock.removeEventListener('release', wakeLock._releaseHandler);
        }
        await wakeLock.release();
        setWakeLock(null);
        logger.log('Screen Wake Lock released programmatically.');
      }
    }
  }, [isSupported, wakeLock]);

  // Handle document visibility change to re-acquire the lock if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLock && document.visibilityState === 'visible') {
        // If we had a lock and the page became visible again, re-request it
        syncWakeLock(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLock, syncWakeLock]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        // Clean up event listener before releasing
        if (wakeLock._releaseHandler) {
          wakeLock.removeEventListener('release', wakeLock._releaseHandler);
        }
        wakeLock.release().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, [wakeLock]);

  return { syncWakeLock, isWakeLockActive: !!wakeLock };
}; 