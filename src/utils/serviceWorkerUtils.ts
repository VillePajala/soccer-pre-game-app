import logger from '@/utils/logger';

/**
 * Utility functions for manual PWA update management
 */

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion?: string;
  newVersion?: string;
  error?: string;
}

/**
 * Manually check for service worker updates
 * Forces the browser to check for a new service worker
 */
export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        updateAvailable: false,
        error: 'Service Worker not supported'
      };
    }

    // Get current registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return {
        updateAvailable: false,
        error: 'No service worker registered'
      };
    }

    logger.log('[SW Utils] Manually checking for updates...');
    
    const currentVersion = await getCurrentVersion();
    
    // Check if there's already a waiting worker
    if (registration.waiting) {
      logger.log('[SW Utils] Update already available - waiting worker found');
      return {
        updateAvailable: true,
        currentVersion,
        newVersion: 'Latest'
      };
    }
    
    // Force check for updates
    try {
      await registration.update();
      logger.log('[SW Utils] Update check completed');
    } catch (updateError) {
      logger.warn('[SW Utils] Update check failed:', updateError);
      // Continue anyway - might still find updates
    }
    
    // Wait a bit longer for the update check to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check again for waiting worker after update
    if (registration.waiting) {
      logger.log('[SW Utils] Update found after manual check - waiting worker available');
      return {
        updateAvailable: true,
        currentVersion,
        newVersion: 'Latest'
      };
    }
    
    // Check if there's an installing worker
    if (registration.installing) {
      logger.log('[SW Utils] Update found - worker installing, waiting for completion...');
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        const checkInstalling = () => {
          attempts++;
          
          if (!registration.installing || attempts >= maxAttempts) {
            logger.log('[SW Utils] Installation check timed out or worker disappeared');
            resolve({
              updateAvailable: false,
              currentVersion,
              error: 'Installation check timed out'
            });
            return;
          }
          
          const state = registration.installing.state;
          logger.log(`[SW Utils] Installing worker state: ${state}`);
          
          if (state === 'installed') {
            // Check if it became the waiting worker
            if (registration.waiting) {
              resolve({
                updateAvailable: true,
                currentVersion,
                newVersion: 'Latest'
              });
            } else {
              resolve({
                updateAvailable: false,
                currentVersion,
                error: 'Installation completed but no waiting worker'
              });
            }
          } else if (state === 'redundant') {
            resolve({
              updateAvailable: false,
              currentVersion,
              error: 'Update installation failed'
            });
          } else {
            setTimeout(checkInstalling, 100);
          }
        };
        
        checkInstalling();
      });
    }
    
    // Try to detect updates by comparing timestamps or checking network
    logger.log('[SW Utils] No installing/waiting workers found, checking for network updates...');
    
    // Additional check: try to fetch the service worker file and compare timestamps
    try {
      const swResponse = await fetch('/sw.js', { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (swResponse.ok) {
        const swContent = await swResponse.text();
        const timestampMatch = swContent.match(/Build Timestamp: (.+)/);
        
        if (timestampMatch) {
          const serverTimestamp = timestampMatch[1];
          logger.log(`[SW Utils] Server SW timestamp: ${serverTimestamp}`);
          
          // Force a more aggressive update check with longer timeout
          logger.log('[SW Utils] Forcing aggressive update check...');
          
          // Unregister and re-register to force fresh check
          await registration.unregister();
          const newRegistration = await navigator.serviceWorker.register('/sw.js');
          
          // Wait for the new registration to install
          await new Promise(resolve => {
            if (newRegistration.installing) {
              newRegistration.installing.addEventListener('statechange', function() {
                if (this.state === 'installed') {
                  resolve(undefined);
                }
              });
            } else {
              resolve(undefined);
            }
          });
          
          // Check if we now have a waiting worker
          if (newRegistration.waiting) {
            return {
              updateAvailable: true,
              currentVersion,
              newVersion: 'Latest'
            };
          }
        }
      }
    } catch (fetchError) {
      logger.warn('[SW Utils] Could not fetch SW for comparison:', fetchError);
    }
    
    logger.log('[SW Utils] No updates detected - app is up to date');
    const result = {
      updateAvailable: false,
      currentVersion
    };
    logger.log('[SW Utils] Returning success result:', result);
    return result;
    
  } catch (error) {
    logger.error('[SW Utils] Error checking for updates:', error);
    return {
      updateAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Force reload the app to get the latest version
 * This clears caches and forces a fresh load
 */
export const forceAppUpdate = async (): Promise<void> => {
  try {
    logger.log('[SW Utils] Forcing app update...');
    
    // Try to activate waiting service worker first
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      logger.log('[SW Utils] Activating waiting service worker...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // The controllerchange event in ServiceWorkerRegistration will handle the reload
      return;
    }
    
    // For development, use a simpler approach to avoid webpack issues
    if (process.env.NODE_ENV === 'development') {
      logger.log('[SW Utils] Development mode - using simple reload');
      window.location.reload();
      return;
    }
    
    // For production, do a more sophisticated refresh
    logger.log('[SW Utils] Production mode - performing cache-busted reload...');
    
    // Clear only PWA-related caches, not all caches (to avoid breaking Next.js)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const pwaCacheNames = cacheNames.filter(name => 
          name.includes('matchday-coach') || 
          name.includes('app-shell') || 
          name.includes('data-cache') ||
          name.includes('pwa') ||
          name.includes('workbox')
        );
        
        if (pwaCacheNames.length > 0) {
          await Promise.all(
            pwaCacheNames.map(cacheName => caches.delete(cacheName))
          );
          logger.log(`[SW Utils] Cleared ${pwaCacheNames.length} PWA caches:`, pwaCacheNames);
        }
      } catch (cacheError) {
        logger.warn('[SW Utils] Could not clear caches:', cacheError);
      }
    }
    
    // Use cache-busting reload for production
    const currentUrl = window.location.href;
    const separator = currentUrl.includes('?') ? '&' : '?';
    const cacheBustUrl = `${currentUrl}${separator}_refresh=${Date.now()}`;
    
    logger.log('[SW Utils] Redirecting to cache-busted URL');
    window.location.href = cacheBustUrl;
    
  } catch (error) {
    logger.error('[SW Utils] Error forcing app update:', error);
    // Always fallback to simple reload to avoid breaking the app
    logger.log('[SW Utils] Using fallback simple reload');
    window.location.reload();
  }
};

/**
 * Get current app version from package.json or build info
 */
const getCurrentVersion = async (): Promise<string> => {
  try {
    // Try to get version from release notes
    const response = await fetch('/release-notes.json', { cache: 'no-cache' });
    if (response.ok) {
      const data = await response.json();
      return data.version || 'Unknown';
    }
  } catch (error) {
    logger.warn('[SW Utils] Could not fetch version info:', error);
  }
  
  return 'Unknown';
};

/**
 * Check if the app is running as an installed PWA
 */
export const isInstalledPWA = (): boolean => {
  // Check if running in standalone mode (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         // @ts-expect-error - some browsers use this non-standard property
         window.navigator.standalone === true;
};

/**
 * Development helper: Force an "update available" result for testing
 * Only works in development mode
 */
export const simulateUpdateAvailable = (): UpdateCheckResult => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      updateAvailable: false,
      error: 'Simulation only available in development'
    };
  }
  
  return {
    updateAvailable: true,
    currentVersion: '0.1.0',
    newVersion: 'Simulated Update'
  };
};