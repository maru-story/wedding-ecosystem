/// <reference lib="webworker" />

const CACHE_NAME = 'wedding-scanner-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

// Install event: cache app shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event: serve from cache first, then network (stale-while-revalidate for navigation)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests — they should go to network directly.
  // API endpoints are on a different origin (e.g. backend port 4000 or api subdomain)
  // or match the root API routes directly.
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const path = requestUrl.pathname;
  if (
    path.startsWith('/events') ||
    path.startsWith('/auth') ||
    path.startsWith('/checkin') ||
    path.startsWith('/scanner') ||
    path.startsWith('/guests') ||
    path.startsWith('/messages') ||
    path.startsWith('/health')
  ) {
    return;
  }

  // Skip WebSocket upgrade requests
  if (request.headers.get('upgrade') === 'websocket') return;

  // For navigation requests (HTML pages), use network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached version and update in background
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        // Cache the new resource
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
