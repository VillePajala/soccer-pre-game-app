import { useState, useEffect, useCallback } from 'react';

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      console.log('Screen Wake Lock API not supported.');
      return;
    }
    if (wakeLock) {
      console.log('Wake Lock is already active.');
      return;
    }
    try {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        console.log('Screen Wake Lock was released.');
        setWakeLock(null);
      });
      console.log('Screen Wake Lock is active.');
      setWakeLock(lock);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(`${err.name}, ${err.message}`);
      } else {
        console.error('An unknown error occurred when requesting wake lock.');
      }
    }
  }, [isSupported, wakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  }, [wakeLock]);

  return { requestWakeLock, releaseWakeLock, isWakeLockActive: !!wakeLock, isSupported };
}; 