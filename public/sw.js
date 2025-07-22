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

// Basic fetch handler (can be expanded for caching strategies)
self.addEventListener('fetch', (event) => {
  // For now, just pass through the request
  // This is where you would add caching logic for offline support
  event.respondWith(fetch(event.request));
});
// Build Timestamp: 2025-07-22T21:14:13.298Z