// Enhanced service worker with offline caching strategies
// This will replace the basic service worker

const CACHE_NAME = 'soccer-coach-v1';
const STATIC_CACHE = 'soccer-coach-static-v1';
const API_CACHE = 'soccer-coach-api-v1';

// Static assets to cache (app shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // Add other critical static assets
];

// API routes that should be cached
const API_ROUTES = [
  '/api/',
  // Add other API patterns
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating enhanced service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== API_CACHE && 
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all open clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
  } else {
    // Default: network with cache fallback
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'data-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Push notifications (for future use)
self.addEventListener('push', () => {
  console.log('[SW] Push notification received');
  // Handle push notifications
});

// Helper functions

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_ROUTES.some(route => url.pathname.startsWith(route)) ||
         url.hostname.includes('supabase.co');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Caching strategies

async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  try {
    console.log('[SW] Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed, trying cache:', error.message);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit after network failure:', request.url);
      return cachedResponse;
    }
    
    // If it's a navigation request and no cache, return offline page
    if (isNavigationRequest(request)) {
      return createOfflineResponse();
    }
    
    throw error;
  }
}

function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Offline - Soccer Coach</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .offline-message { color: #666; }
      </style>
    </head>
    <body>
      <h1>You're Offline</h1>
      <p class="offline-message">
        Don't worry! You can still use the app with your saved data.
        Check your connection and try again.
      </p>
      <button onclick="window.location.reload()">Try Again</button>
    </body>
    </html>
    `,
    {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html'
      }
    }
  );
}

async function syncOfflineData() {
  try {
    console.log('[SW] Syncing offline data...');
    // This would integrate with the IndexedDB sync queue
    // For now, just a placeholder
    
    // In real implementation, this would:
    // 1. Get queued operations from IndexedDB
    // 2. Send them to the server
    // 3. Handle responses and update local data
    // 4. Clean up successful operations
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error;
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Received SKIP_WAITING message');
      self.skipWaiting();
      break;
      
    case 'SYNC_DATA':
      console.log('[SW] Manual sync requested');
      syncOfflineData();
      break;
      
    case 'CLEAR_CACHE':
      console.log('[SW] Cache clear requested');
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});