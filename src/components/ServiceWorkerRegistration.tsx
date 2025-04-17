'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run this in the browser
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('[PWA] Service Worker registered: ', registration);
          })
          .catch(registrationError => {
            console.log('[PWA] Service Worker registration failed: ', registrationError);
          });
      };

      // Register immediately if the page has already loaded
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        // Otherwise wait for the load event
        window.addEventListener('load', registerServiceWorker);
      }
    } else {
      console.log('[PWA] Service Worker is not supported in this browser.');
    }
  }, []);

  return null; // This component doesn't render anything
} 