const CACHE_NAME = 'tilepoint-atpos-v2-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  './',
  './index.html',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install Service Worker and prime core offline app shell cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA Service Worker] Pre-caching Core Offline App Shell...');
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn('[PWA Service Worker] Non-critical pre-cache item skipped:', url, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate & clean up old stale versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA Service Worker] Discarding outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests and handle cache-first strategy with fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only handle local HTTP/HTTPS GET queries
  if (event.request.method !== 'GET' || !requestUrl.protocol.startsWith('http')) {
    return;
  }

  // Bypass service worker caching for dynamic API endpoints and real-time SSE streams
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first strategy for offline-first reliability
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Refresh cache in the background if network is available
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
          })
          .catch(() => {/* Ignore network offline errors */});
        return cachedResponse;
      }

      // Fetch from network if not in cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
          return networkResponse;
        }

        const isOpaqueOrBasic =
          networkResponse.type === 'basic' ||
          networkResponse.type === 'cors' ||
          networkResponse.type === 'opaque';

        if (isOpaqueOrBasic) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Fallback to offline root entry point for SPA page navigation
        if (
          event.request.mode === 'navigate' ||
          event.request.headers.get('accept')?.includes('text/html')
        ) {
          return caches.match('/') || caches.match('/index.html') || caches.match('./') || caches.match('./index.html');
        }
      });
    })
  );
});

// Proactive activation listener from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[PWA Service Worker] skipWaiting requested by client message.');
    self.skipWaiting();
  }
});
