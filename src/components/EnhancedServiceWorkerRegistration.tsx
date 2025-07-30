'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface ServiceWorkerState extends ServiceWorkerRegistration {
  waiting: ServiceWorker | null;
  installing: ServiceWorker | null;
  active: ServiceWorker | null;
}

interface ServiceWorkerUpdateInfo {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface SyncNotification {
  type: 'SYNC_COMPLETED' | 'SYNC_FAILED' | 'SYNC_STARTED';
  data: {
    success?: boolean;
    error?: string;
    timestamp: number;
    operations?: number;
  };
  timestamp: number;
}

export default function EnhancedServiceWorkerRegistration() {
  const [registration, setRegistration] = useState<ServiceWorkerState | null>(null);
  const [updateInfo, setUpdateInfo] = useState<ServiceWorkerUpdateInfo>({
    isUpdateAvailable: false,
    isUpdating: false,
    hasError: false
  });
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const connectionStatus = useConnectionStatus();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
      setupMessageListeners();
    }
  }, []);

  const requestManualSync = useCallback(() => {
    if (registration && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ 
        type: 'SYNC_REQUEST' 
      });
    }
  }, [registration]);

  // Register manual sync when connection status changes
  useEffect(() => {
    if (connectionStatus.isOnline && registration) {
      requestManualSync();
    }
  }, [connectionStatus.isOnline, registration, requestManualSync]);

  const registerServiceWorker = async () => {
    try {
      // Use enhanced service worker
      const reg = await navigator.serviceWorker.register('/sw-enhanced.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      setRegistration(reg as ServiceWorkerState);

      // Check for updates immediately
      await reg.update();

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: true }));
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        }
      });

      console.log('[SW] Enhanced service worker registered successfully');
    } catch (error) {
      console.error('[SW] Enhanced service worker registration failed:', error);
      setUpdateInfo(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Registration failed'
      }));
    }
  };

  const setupMessageListeners = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};
        
        switch (type) {
          case 'SYNC_COMPLETED':
            setSyncNotifications(prev => [
              { type, data, timestamp: Date.now() },
              ...prev.slice(0, 4)
            ]);
            setShowSyncToast(true);
            setTimeout(() => setShowSyncToast(false), 3000);
            break;
            
          case 'SYNC_FAILED':
            setSyncNotifications(prev => [
              { type, data, timestamp: Date.now() },
              ...prev.slice(0, 4)
            ]);
            setShowSyncToast(true);
            setTimeout(() => setShowSyncToast(false), 5000);
            break;
            
          case 'CACHE_STATUS_RESPONSE':
            console.log('[SW] Cache status:', data);
            break;
        }
      });
    }
  };

  const activateUpdate = async () => {
    if (registration?.waiting) {
      setUpdateInfo(prev => ({ ...prev, isUpdating: true }));
      
      // Send skip waiting message
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  const getCacheStatus = async () => {
    if (registration && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      
      return new Promise((resolve) => {
        channel.port1.onmessage = function(event) {
          if (event.data.type === 'CACHE_STATUS_RESPONSE') {
            resolve(event.data.data);
          }
        };
        
        navigator.serviceWorker.controller!.postMessage(
          { type: 'CACHE_STATUS' },
          [channel.port2]
        );
      });
    }
  };

  const clearCaches = () => {
    if (registration && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = function(event) {
        if (event.data.type === 'CACHE_CLEARED') {
          console.log('[SW] All caches cleared');
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
    }
  };

  return (
    <>
      {/* Update Available Banner */}
      {updateInfo.isUpdateAvailable && !updateInfo.isUpdating && (
        <div className="fixed top-0 left-0 right-0 z-[300] bg-blue-600 text-white px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-4">
            <span>🚀 App update available!</span>
            <button
              onClick={activateUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* Updating Banner */}
      {updateInfo.isUpdating && (
        <div className="fixed top-0 left-0 right-0 z-[300] bg-orange-600 text-white px-4 py-3 text-center">
          <span>⏳ Updating app...</span>
        </div>
      )}

      {/* Error Banner */}
      {updateInfo.hasError && (
        <div className="fixed top-0 left-0 right-0 z-[300] bg-red-600 text-white px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-4">
            <span>❌ Service Worker Error: {updateInfo.errorMessage}</span>
            <button
              onClick={() => setUpdateInfo(prev => ({ ...prev, hasError: false }))}
              className="text-red-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sync Toast Notification */}
      {showSyncToast && syncNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] max-w-sm">
          {syncNotifications.slice(0, 1).map((notification) => (
            <div
              key={notification.timestamp}
              className={`p-4 rounded-lg shadow-lg border text-white ${
                notification.type === 'SYNC_COMPLETED'
                  ? 'bg-green-600 border-green-500'
                  : notification.type === 'SYNC_FAILED'
                  ? 'bg-red-600 border-red-500'
                  : 'bg-blue-600 border-blue-500'
              }`}
            >
              <div className="flex items-center">
                <div className="text-lg mr-3">
                  {notification.type === 'SYNC_COMPLETED' ? '✅' :
                   notification.type === 'SYNC_FAILED' ? '❌' : '🔄'}
                </div>
                <div>
                  <h4 className="font-semibold">
                    {notification.type === 'SYNC_COMPLETED' ? 'Sync Complete' :
                     notification.type === 'SYNC_FAILED' ? 'Sync Failed' : 'Syncing...'}
                  </h4>
                  <p className="text-sm opacity-90">
                    {notification.type === 'SYNC_COMPLETED'
                      ? 'Your data has been synced to the cloud'
                      : notification.type === 'SYNC_FAILED'
                      ? `Sync error: ${notification.data.error || 'Unknown error'}`
                      : 'Syncing your data...'}
                  </p>
                </div>
                <button
                  onClick={() => setShowSyncToast(false)}
                  className="ml-4 opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Developer Tools (only in dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-[100] bg-gray-800 text-white p-3 rounded-lg text-xs">
          <div className="mb-2 font-semibold">SW Dev Tools</div>
          <div className="space-y-1">
            <button 
              onClick={requestManualSync}
              className="block w-full text-left hover:text-blue-300"
            >
              🔄 Manual Sync
            </button>
            <button 
              onClick={() => getCacheStatus().then(console.log)}
              className="block w-full text-left hover:text-blue-300"
            >
              📊 Cache Status
            </button>
            <button 
              onClick={clearCaches}
              className="block w-full text-left hover:text-red-300"
            >
              🗑️ Clear Caches
            </button>
          </div>
        </div>
      )}
    </>
  );
}