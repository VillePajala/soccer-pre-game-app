import { useState, useEffect, useCallback } from 'react';

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for support once on mount
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);
    if (!supported) {
      console.log('Screen Wake Lock API not supported.');
    }
  }, []);

  const syncWakeLock = useCallback(async (shouldBeActive: boolean) => {
    if (!isSupported) return;

    if (shouldBeActive) {
      // If we need it and don't have it, request it.
      if (wakeLock === null) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          lock.addEventListener('release', () => {
            console.log('Screen Wake Lock was released by the system.');
            setWakeLock(null);
          });
          console.log('Screen Wake Lock is active.');
          setWakeLock(lock);
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
          }
        }
      }
    } else {
      // If we don't need it and have it, release it.
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
        console.log('Screen Wake Lock released programmatically.');
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


  return { syncWakeLock, isWakeLockActive: !!wakeLock };
}; 