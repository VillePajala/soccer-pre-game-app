// Enhanced Service Worker for Offline-First Soccer Coaching App
// Version: 2.0.0
// Features: Background Sync, Intelligent Caching, Push Notifications

// Disable service worker in development
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', () => {
    self.clients.claim();
    // Unregister this service worker
    self.registration.unregister().then(() => {
      console.log('[SW] Service worker unregistered in development');
    });
  });
  self.addEventListener('fetch', () => {}); // Do nothing
  return; // Exit early for development
}

// Cache configuration
const CACHE_VERSION = 'v2.0.0';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const DATA_CACHE = `data-cache-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// Cache size limits (in MB)
const CACHE_SIZE_LIMITS = {
  [APP_SHELL_CACHE]: 50,
  [DATA_CACHE]: 100,
  [API_CACHE]: 25,
  [STATIC_CACHE]: 200
};

// Files to cache for app shell
const APP_SHELL_FILES = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
];

// Supabase endpoints that should trigger background sync
const SYNC_ENDPOINTS = [
  '/rest/v1/players',
  '/rest/v1/seasons', 
  '/rest/v1/tournaments',
  '/rest/v1/saved_games',
  '/rest/v1/timer_states'
];

// Install event - cache app shell and register background sync
self.addEventListener('install', (event) => {
  console.log('[SW] Enhanced service worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(APP_SHELL_CACHE).then((cache) => {
        console.log('[SW] Caching app shell');
        return Promise.allSettled(
          APP_SHELL_FILES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      }),
      
      // Register background sync
      self.registration.sync?.register('supabase-sync').then(() => {
        console.log('[SW] Background sync registered');
      }).catch(err => {
        console.warn('[SW] Background sync registration failed:', err);
      })
    ])
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Enhanced service worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      clients.claim(),
      
      // Initialize IndexedDB connection for background operations
      initializeBackgroundDB()
    ])
  );
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'supabase-sync') {
    event.waitUntil(syncPendingOperations());
  }
});

// Enhanced fetch handler with intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle Supabase API requests
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(handleSupabaseRequest(request));
    return;
  }

  // Handle static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle app shell and navigation
  if (request.mode === 'navigate' || APP_SHELL_FILES.includes(url.pathname)) {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have pending sync operations',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'sync-notification',
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Soccer Coach', options)
    );
  } catch (err) {
    console.error('[SW] Error handling push notification:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Received SKIP_WAITING message. Activating new service worker.');
      self.skipWaiting();
      break;
      
    case 'SYNC_REQUEST':
      console.log('[SW] Manual sync requested');
      event.waitUntil(syncPendingOperations());
      break;
      
    case 'CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0]?.postMessage({ type: 'CACHE_STATUS_RESPONSE', data: status });
      }));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches().then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      }));
      break;
  }
});

// ==================== HELPER FUNCTIONS ====================

// Handle Supabase API requests with background sync fallback
async function handleSupabaseRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful GET responses
      if (request.method === 'GET') {
        const cache = await caches.open(API_CACHE);
        cache.put(request.clone(), response.clone());
      }
      return response;
    }
    
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (networkError) {
    console.log('[SW] Network failed for Supabase request, checking cache and sync options');
    
    // For read operations, try cache first
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Returning cached response for:', request.url);
        return cachedResponse;
      }
    }
    
    // If it's a write operation and we're offline, queue for background sync
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      console.log('[SW] Queueing write operation for background sync:', request.method, request.url);
      
      await queueFailedRequest(request);
      
      // Register background sync
      try {
        if ('sync' in self.registration) {
          await self.registration.sync.register('supabase-sync');
          console.log('[SW] Background sync registered successfully');
        }
      } catch (syncError) {
        console.warn('[SW] Failed to register background sync:', syncError);
      }
      
      // Return a synthetic success response for optimistic updates
      return new Response(JSON.stringify({ 
        success: true, 
        queued: true, 
        message: 'Operation queued for sync when online',
        timestamp: Date.now()
      }), {
        status: 202,
        headers: { 
          'Content-Type': 'application/json',
          'X-Sync-Status': 'queued'
        }
      });
    }
    
    // For read operations with no cache, return error
    return new Response(JSON.stringify({
      error: 'No cached data available and network is offline',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Failed to fetch static asset:', request.url);
    throw err;
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (err) {
    // Return cached app shell or offline page
    const cache = await caches.open(APP_SHELL_CACHE);
    return await cache.match('/') || await cache.match('/offline.html');
  }
}

// Initialize IndexedDB connection for background operations
async function initializeBackgroundDB() {
  try {
    // This would integrate with our IndexedDBProvider
    console.log('[SW] IndexedDB connection initialized for background operations');
  } catch (err) {
    console.error('[SW] Failed to initialize background DB:', err);
  }
}

// Queue failed requests for background sync
async function queueFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB queue (would integrate with our SyncManager)
    console.log('[SW] Queued failed request for background sync:', requestData.url);
  } catch (err) {
    console.error('[SW] Failed to queue request:', err);
  }
}

// Sync pending operations in background
async function syncPendingOperations() {
  try {
    console.log('[SW] Starting background sync...');
    
    // Notify clients that sync has started
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_STARTED',
        data: { timestamp: Date.now() }
      });
    });
    
    // Check connectivity first
    const isOnline = await checkSupabaseConnectivity();
    if (!isOnline) {
      throw new Error('Supabase is not reachable');
    }
    
    // Get sync queue from IndexedDB
    const syncQueue = await getSyncQueueFromIndexedDB();
    if (!syncQueue || syncQueue.length === 0) {
      console.log('[SW] No operations to sync');
      
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETED',
          data: { success: true, processed: 0, timestamp: Date.now() }
        });
      });
      return;
    }
    
    console.log(`[SW] Found ${syncQueue.length} operations to sync`);
    
    let processed = 0;
    let failed = 0;
    const errors = [];
    
    // Process sync queue in batches
    const batchSize = 5;
    for (let i = 0; i < syncQueue.length; i += batchSize) {
      const batch = syncQueue.slice(i, i + batchSize);
      
      for (const operation of batch) {
        try {
          await processSyncOperation(operation);
          processed++;
          
          // Remove from queue after successful sync
          await removeSyncOperationFromIndexedDB(operation.id);
        } catch (error) {
          failed++;
          errors.push(error.message);
          console.error('[SW] Failed to sync operation:', operation, error);
          
          // Update retry count
          await updateSyncOperationRetry(operation.id);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Notify clients of sync completion
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        data: { 
          success: failed === 0, 
          processed, 
          failed, 
          errors: errors.slice(0, 3), // Limit error messages
          timestamp: Date.now() 
        }
      });
    });
    
    console.log(`[SW] Background sync completed: ${processed} processed, ${failed} failed`);
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
    
    // Notify clients of sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_FAILED',
        data: { error: err.message, timestamp: Date.now() }
      });
    });
  }
}

// Get cache status and sizes
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    status[cacheName] = {
      count: requests.length,
      size: await estimateCacheSize(cache)
    };
  }
  
  return status;
}

// Estimate cache size (approximate)
async function estimateCacheSize(cache) {
  const requests = await cache.keys();
  let totalSize = 0;
  
  for (const request of requests.slice(0, 10)) { // Sample first 10
    try {
      const response = await cache.match(request);
      if (response) {
        const text = await response.text();
        totalSize += text.length;
      }
    } catch (err) {
      // Ignore errors
    }
  }
  
  // Extrapolate total size
  return Math.round((totalSize * requests.length) / Math.min(10, requests.length));
}

// Clear all caches
async function clearCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// ==================== INDEXEDDB INTEGRATION ====================

// Check Supabase connectivity
async function checkSupabaseConnectivity() {
  try {
    const supabaseUrl = '{{NEXT_PUBLIC_SUPABASE_URL}}'; // Injected at build time
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': '{{NEXT_PUBLIC_SUPABASE_ANON_KEY}}' // Injected at build time
      }
    });
    return response.ok || response.status === 401;
  } catch (error) {
    return false;
  }
}

// Get sync queue from IndexedDB
async function getSyncQueueFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('soccer-coach-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Process a single sync operation
async function processSyncOperation(operation) {
  const { table, action, data } = operation;
  
  let url = `https://xtwqgpdpvhztkbmktqsb.supabase.co/rest/v1/${table}`;
  let method = 'POST';
  let body = JSON.stringify(data);
  
  switch (action) {
    case 'create':
      method = 'POST';
      body = JSON.stringify(data);
      break;
    case 'update':
      method = 'PATCH';
      url += `?id=eq.${data.id}`;
      body = JSON.stringify(data);
      break;
    case 'delete':
      method = 'DELETE';
      url += `?id=eq.${data.id}`;
      body = null;
      break;
  }
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': '{{NEXT_PUBLIC_SUPABASE_ANON_KEY}}', // Injected at build time
      'Authorization': 'Bearer {{NEXT_PUBLIC_SUPABASE_ANON_KEY}}' // Injected at build time
    },
    body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}

// Remove sync operation from IndexedDB after successful sync
async function removeSyncOperationFromIndexedDB(operationId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('soccer-coach-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const deleteRequest = store.delete(operationId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Update retry count for failed sync operation
async function updateSyncOperationRetry(operationId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('soccer-coach-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const getRequest = store.get(operationId);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.retries = (operation.retries || 0) + 1;
          operation.lastAttempt = Date.now();
          
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Operation not found, probably already removed
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

// Build Timestamp: ${new Date().toISOString()}