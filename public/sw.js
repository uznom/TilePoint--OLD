/**
 * TilePoint ERP - Enterprise Service Worker
 * Comprehensive offline-first caching strategy for UI assets, static data, and navigation resilience.
 */

const CACHE_VERSION = 'v3.2.0';
const STATIC_CACHE = `tilepoint-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `tilepoint-assets-${CACHE_VERSION}`;
const DATA_CACHE = `tilepoint-data-${CACHE_VERSION}`;

const CURRENT_CACHES = [STATIC_CACHE, ASSETS_CACHE, DATA_CACHE];

// Core App Shell Assets required for zero-connectivity boots
const CORE_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/local-fonts.css',
  '/fonts/Plus_Jakarta_Sans_LDIuaomQNQcsA88c7O9yZ4KMCoOg4Koz4y6qhA.woff2',
  '/fonts/Plus_Jakarta_Sans_LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2',
  '/fonts/Roboto_Flex_NaNeepOXO_NexZs0b5QrzlOHb8wCikXpYqmZsWI-__OGbt8jZktqc2V3Zs0KvDLdBP8SBZtOs2IifRuUZQMsPJtUsR4DEK6cULNeUx9XgTnH37Ha_FIAp4Fm0PP1hw45DntW2x0wZGzhPmr1YNMYKYn9_1IQXGwJAiUJVUMdN5YUW4O8HtSoXjC79QRyaLshNDUf9-EmFw.woff2',
  '/images/accessibility_icon.svg',
  '/sample_sales_report.json',
  '/sample_tiles.csv'
];

// Helper: Network timeout promise
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[ServiceWorker] Network request timed out after ${ms}ms`));
    }, ms);
  });
}

// Helper: Check if request is a static asset (script, stylesheet, font, image, vector, audio, wasm)
function isStaticAssetRequest(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    /\.(css|js|json|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot|wasm|webp)$/i.test(pathname)
  );
}

// Helper: Check if request is an internal Vite dev server path or live HMR stream
function isDevOrLiveStream(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/api/db/events') ||
    pathname.startsWith('/socket.io/') ||
    pathname.includes('hot-update') ||
    pathname.endsWith('.tsx') ||
    pathname.endsWith('.ts')
  );
}

// Helper: Check if request is a read-only static / semi-static data endpoint
function isDataEndpoint(url) {
  const pathname = url.pathname;
  return (
    pathname === '/api/db' ||
    pathname === '/api/health' ||
    pathname === '/api/db/bootstrap' ||
    pathname.startsWith('/api/db/backups') ||
    pathname.startsWith('/sample_')
  );
}

// 1. INSTALL: Pre-cache core App Shell with fault tolerance
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[PWA Service Worker] Pre-caching Core ERP App Shell...');
      return Promise.allSettled(
        CORE_APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn('[PWA Service Worker] Non-critical shell pre-cache item skipped:', url, err.message);
          }
        })
      );
    }).then(() => {
      console.log('[PWA Service Worker] Installation complete. Activating immediately.');
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVATE: Discard old caches and claim connected clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!CURRENT_CACHES.includes(key)) {
            console.log('[PWA Service Worker] Purging outdated cache tier:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[PWA Service Worker] Active and controlling clients.');
      return self.clients.claim();
    })
  );
});

// 3. FETCH: Smart multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // Ignore non-HTTP/HTTPS and non-GET requests (except for offline mutation fallback)
  if (!requestUrl.protocol.startsWith('http')) {
    return;
  }

  // Handle Offline Mutation Fallback (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    // If browser is offline, provide a clean JSON error rather than generic failed to fetch
    if (!self.navigator.onLine && requestUrl.pathname.startsWith('/api/')) {
      event.respondWith(
        new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'TilePoint Server is currently offline. Mutation queued in local storage.',
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline Mode)',
            headers: { 'Content-Type': 'application/json', 'X-TilePoint-Offline': 'true' }
          }
        )
      );
    }
    return;
  }

  // Bypass dev tools, Vite internals, and SSE / Socket.io live streaming
  if (isDevOrLiveStream(requestUrl)) {
    return;
  }

  // --- STRATEGY A: Navigation & HTML Document Requests ---
  // Network-First with 3s Timeout -> Fallback to App Shell (/index.html)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      Promise.race([
        fetch(request),
        timeoutPromise(3000)
      ])
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            return networkResponse;
          }
          throw new Error('Non-200 navigation response');
        })
        .catch(async () => {
          console.log('[PWA Service Worker] Navigation fallback to cached App Shell for:', requestUrl.pathname);
          const cachedShell =
            (await caches.match(request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          
          if (cachedShell) {
            return cachedShell;
          }

          // Minimal fallback emergency page if cache was cleared
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><title>TilePoint ERP - Offline</title></head>
            <body style="background:#0F172A;color:#FFFFFF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;">
              <div style="text-align:center;max-width:400px;">
                <h1 style="color:#006FEE;font-size:24px;margin-bottom:8px;">TilePoint Offline</h1>
                <p style="color:#94A3B8;font-size:14px;line-height:1.5;">Network connection is unavailable. Please check your network and reload.</p>
                <button onclick="window.location.reload()" style="background:#006FEE;color:#FFFFFF;border:none;padding:10px 24px;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:16px;">Reload Application</button>
              </div>
            </body>
            </html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

  // --- STRATEGY B: Read-Only Data & API Endpoints (/api/db, /api/health, samples) ---
  // Network-First with 3.5s Timeout -> Fallback to Cached Snapshot in DATA_CACHE
  if (isDataEndpoint(requestUrl)) {
    event.respondWith(
      Promise.race([
        fetch(request),
        timeoutPromise(3500)
      ])
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const contentType = networkResponse.headers.get('content-type') || '';
            if (contentType.includes('application/json') || contentType.includes('text/csv')) {
              const responseToCache = networkResponse.clone();
              const cache = await caches.open(DATA_CACHE);
              await cache.put(request, responseToCache);
            }
            return networkResponse;
          }
          throw new Error('Non-200 data response');
        })
        .catch(async (err) => {
          console.warn('[PWA Service Worker] Data endpoint unreachable, checking offline cache for:', requestUrl.pathname, err.message);
          
          // Special synthetic fallback for /api/health to prevent blocking health-check pollers
          if (requestUrl.pathname === '/api/health') {
            return new Response(
              JSON.stringify({
                status: 'ok',
                mode: 'offline',
                serverReachable: false,
                serviceWorkerActive: true,
                timestamp: new Date().toISOString()
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-TilePoint-Offline-Mode': 'true'
                }
              }
            );
          }

          // Check data cache for /api/db or other data requests
          const cachedData = await caches.match(request);
          if (cachedData) {
            const headers = new Headers(cachedData.headers);
            headers.set('X-TilePoint-Source', 'sw-offline-cache');
            headers.set('X-TilePoint-Offline', 'true');
            return new Response(cachedData.body, {
              status: cachedData.status,
              statusText: cachedData.statusText,
              headers
            });
          }

          // Clean JSON error response if nothing cached
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: 'Offline: Data not available in cache and server is unreachable.',
              timestamp: new Date().toISOString()
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json', 'X-TilePoint-Offline': 'true' }
            }
          );
        })
    );
    return;
  }

  // --- STRATEGY C: Static UI Assets (JS, CSS, Fonts, Images, SVGs, Icons) ---
  // Stale-While-Revalidate with Cache-First Fallback
  if (isStaticAssetRequest(requestUrl)) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        // Validation: If an HTML response was mistakenly cached for a JS/CSS file, discard it
        if (cachedResponse) {
          const cachedType = cachedResponse.headers.get('content-type') || '';
          if (cachedType.includes('text/html') && !requestUrl.pathname.endsWith('.html')) {
            const assetCache = await caches.open(ASSETS_CACHE);
            await assetCache.delete(request);
          } else {
            // Revalidate in background if online
            fetch(request)
              .then(async (freshResponse) => {
                if (freshResponse && freshResponse.status === 200) {
                  const contentType = freshResponse.headers.get('content-type') || '';
                  if (!contentType.includes('text/html') || requestUrl.pathname.endsWith('.html')) {
                    const cache = await caches.open(ASSETS_CACHE);
                    await cache.put(request, freshResponse.clone());
                  }
                }
              })
              .catch(() => {/* Ignore background revalidation network errors */});

            return cachedResponse;
          }
        }

        // Fetch from network if not in cache
        return fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
              const contentType = networkResponse.headers.get('content-type') || '';
              // Safeguard against caching HTML 404 pages as JS/CSS
              if (!contentType.includes('text/html') || requestUrl.pathname.endsWith('.html')) {
                const responseToCache = networkResponse.clone();
                const cache = await caches.open(ASSETS_CACHE);
                await cache.put(request, responseToCache);
              }
            }
            return networkResponse;
          })
          .catch(async () => {
            // Fallback for fonts or icons if specific request failed
            if (requestUrl.pathname.includes('/fonts/')) {
              return caches.match('/fonts/local-fonts.css');
            }
            if (requestUrl.pathname.includes('/icon')) {
              return caches.match('/icon.svg');
            }
            return new Response('', { status: 408, statusText: 'Asset fetch timeout/offline' });
          });
      })
    );
    return;
  }

  // --- STRATEGY D: General Network with Cache Fallback ---
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. MESSAGE: Handle client controls & IPC commands
self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'skipWaiting' || data.type === 'SKIP_WAITING') {
    console.log('[PWA Service Worker] skipWaiting requested by client.');
    self.skipWaiting();
  } else if (data.action === 'clearCaches' || data.type === 'CLEAR_CACHES') {
    console.log('[PWA Service Worker] Purging all caches on client request...');
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  } else if (data.action === 'getCacheStats' || data.type === 'GET_CACHE_STATS') {
    const keys = await caches.keys();
    let count = 0;
    for (const key of keys) {
      const c = await caches.open(key);
      const reqs = await c.keys();
      count += reqs.length;
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ cacheKeys: keys, cachedItemsCount: count });
    }
  }
});
