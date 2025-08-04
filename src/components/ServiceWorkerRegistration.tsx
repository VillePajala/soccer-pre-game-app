'use client';

import { useEffect, useState } from 'react';
import UpdateBanner from './UpdateBanner';
import logger from '@/utils/logger';

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.log('[PWA] Service Worker is not supported or not in browser.');
      return;
    }

    // Disable service worker in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Unregister any existing service worker in development
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          logger.log('[PWA] Service Worker unregistered in development');
        });
      });
      return; // Don't register SW in development
    }

    const fetchReleaseNotes = async () => {
      try {
        const res = await fetch('/release-notes.json', { 
          cache: 'no-store',
          signal: controller.signal 
        });
        if (res.ok) {
          const data = await res.json();
          setReleaseNotes(data.notes);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          logger.error('Failed to fetch release notes', error);
        }
      }
    };

    const swUrl = '/sw.js';

    navigator.serviceWorker.register(swUrl).then(registration => {
      logger.log('[PWA] Service Worker registered: ', registration);

      // Look for a waiting service worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        fetchReleaseNotes();
        setShowUpdateBanner(true);
        return;
      }

      // Listen for updates
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        logger.log('[PWA] New service worker found:', newWorker);
        if (newWorker) {
          newWorker.onstatechange = () => {
            logger.log('[PWA] New service worker state changed:', newWorker.state);
            // When the new worker is installed and waiting
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                fetchReleaseNotes();
                setShowUpdateBanner(true);
              }
          };
        }
      };
    }).catch(error => {
      logger.error('[PWA] Service Worker registration failed: ', error);
    });

    // Listen for controller changes
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Cleanup function
    return () => {
      controller.abort();
      // Check if removeEventListener exists (not available in all environments/tests)
      if (navigator.serviceWorker && typeof navigator.serviceWorker.removeEventListener === 'function') {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      logger.log('[PWA] Posting message to waiting worker to skip waiting.');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdateBanner(false);
    }
  };

  return showUpdateBanner ? (
    <UpdateBanner
      onUpdate={handleUpdate}
      notes={releaseNotes || undefined}
      onDismiss={() => setShowUpdateBanner(false)}
    />
  ) : null;
}