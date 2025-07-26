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

// Listen for the install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  // Do NOT call self.skipWaiting() here.
  // We want to wait for the user to click the update button.
});

// Listen for the activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  // Take control of all open clients immediately
  event.waitUntil(clients.claim());
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message. Activating new service worker.');
    self.skipWaiting();
  }
});

// Cache configuration
const CACHE_NAME = 'matchday-coach-v1';
const APP_SHELL_CACHE = 'app-shell-v1';
const DATA_CACHE = 'data-cache-v1';

// Files to cache for app shell
const APP_SHELL_FILES = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html' // We'll need to create this
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      console.log('[SW] Caching app shell');
      // Cache only existing files, don't fail if some are missing
      return Promise.all(
        APP_SHELL_FILES.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
          })
        )
      );
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== APP_SHELL_CACHE && cacheName !== DATA_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Fetch handler with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache on network failure
          return caches.match(request);
        })
    );
    return;
  }

  // App shell - Cache first, network fallback
  if (APP_SHELL_FILES.includes(url.pathname) || url.pathname.match(/^\/(js|css|fonts)\//)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          return caches.open(APP_SHELL_CACHE).then((cache) => {
            if (request.method === 'GET' && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Default - Network first for everything else
  event.respondWith(
    fetch(request).catch(() => {
      // Return cached version or offline page
      return caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});
// Build Timestamp: 2025-07-26T20:47:10.293Z