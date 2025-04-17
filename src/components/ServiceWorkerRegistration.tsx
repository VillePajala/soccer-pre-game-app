'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('[PWA] Service Worker registered: ', registration);
          })
          .catch(registrationError => {
            console.log('[PWA] Service Worker registration failed: ', registrationError);
          });
      });
    } else {
      console.log('[PWA] Service Worker is not supported in this browser.');
    }
  }, []);

  return null; // This component doesn't render anything
} 