'use client';

import { useEffect, useState } from 'react';
import UpdateBanner from './UpdateBanner'; // Import the new component

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker is not supported or not in browser.');
      return;
    }

    const swUrl = '/sw.js';

    navigator.serviceWorker.register(swUrl).then(registration => {
      console.log('[PWA] Service Worker registered: ', registration);

      // Look for a waiting service worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdateBanner(true);
        return;
      }

      // Listen for updates
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        console.log('[PWA] New service worker found:', newWorker);
        if (newWorker) {
          newWorker.onstatechange = () => {
            console.log('[PWA] New service worker state changed:', newWorker.state);
            // When the new worker is installed and waiting
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdateBanner(true);
            }
          };
        }
      };
    }).catch(error => {
      console.error('[PWA] Service Worker registration failed: ', error);
    });

    // Listen for controller changes
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      console.log('[PWA] Posting message to waiting worker to skip waiting.');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdateBanner(false);
    }
  };

  return showUpdateBanner ? <UpdateBanner onUpdate={handleUpdate} /> : null;
} 