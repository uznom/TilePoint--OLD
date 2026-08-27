/**
 * TilePoint ERP - Service Worker Registration & Offline Cache Manager
 * Ensures robust offline loading, asset caching, and background sync management.
 */

export interface CacheStatusInfo {
  isRegistered: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  cachedAssetsCount: number;
  cacheNames: string[];
}

type ServiceWorkerStatusListener = (status: CacheStatusInfo) => void;
const listeners: Set<ServiceWorkerStatusListener> = new Set();

let currentStatus: CacheStatusInfo = {
  isRegistered: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasUpdate: false,
  cachedAssetsCount: 0,
  cacheNames: [],
};

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentStatus });
    } catch (err) {
      console.warn('[SW Manager] Listener notification warning:', err);
    }
  });
}

/**
 * Register the Service Worker for TilePoint ERP
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // Setup online/offline network listeners
  window.addEventListener('online', () => {
    console.log('[Network Monitor] System connection restored: ONLINE');
    currentStatus.isOnline = true;
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    console.warn('[Network Monitor] System connection lost: OFFLINE. Service worker caching active.');
    currentStatus.isOnline = false;
    notifyListeners();
  });

  return new Promise((resolve) => {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        currentStatus.isRegistered = true;
        console.log('[PWA Service Worker] Registered successfully with scope:', registration.scope);

        // Check for updates on register
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA Service Worker] New ERP version installed and ready for activation.');
                  currentStatus.hasUpdate = true;
                  notifyListeners();
                } else {
                  console.log('[PWA Service Worker] Core UI assets successfully cached for offline use.');
                  notifyListeners();
                }
              }
            });
          }
        });

        // Periodic update check every 30 minutes
        setInterval(() => {
          if (navigator.onLine && registration) {
            registration.update().catch((err) => {
              console.debug('[PWA Service Worker] Background update check skipped:', err);
            });
          }
        }, 30 * 60 * 1000);

        // Refresh cache stats
        await refreshCacheStats();
        notifyListeners();
        resolve(registration);
      } catch (err) {
        console.warn('[PWA Service Worker] Registration warning (app running in fallback mode):', err);
        currentStatus.isRegistered = false;
        notifyListeners();
        resolve(null);
      }
    });
  });
}

/**
 * Refresh local Cache Storage statistics
 */
export async function refreshCacheStats(): Promise<CacheStatusInfo> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return currentStatus;
  }

  try {
    const keys = await caches.keys();
    let totalCount = 0;

    for (const key of keys) {
      if (key.startsWith('tilepoint-')) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        totalCount += requests.length;
      }
    }

    currentStatus = {
      ...currentStatus,
      cacheNames: keys,
      cachedAssetsCount: totalCount,
    };
  } catch (err) {
    console.warn('[SW Manager] Error reading cache statistics:', err);
  }

  return currentStatus;
}

/**
 * Skip waiting and activate the newest installed Service Worker immediately
 */
export function activateUpdate(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
    window.location.reload();
  }
}

/**
 * Purge all local Service Worker caches and reload app shell
 */
export async function clearAllAppCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    console.log('[SW Manager] All TilePoint application caches purged successfully.');
    await refreshCacheStats();
    notifyListeners();
    return true;
  } catch (err) {
    console.error('[SW Manager] Failed to clear application caches:', err);
    return false;
  }
}

/**
 * Pre-cache arbitrary data snapshot into data cache for offline fallback
 */
export async function precacheDataSnapshot(url: string, data: any): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const dataCache = await caches.open('tilepoint-data-v3');
    const response = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-TilePoint-Offline-Precached': 'true',
        'X-TilePoint-Timestamp': new Date().toISOString(),
      },
    });
    await dataCache.put(url, response);
    console.log('[SW Manager] Pre-cached offline data snapshot for:', url);
  } catch (err) {
    console.warn('[SW Manager] Could not pre-cache data snapshot:', err);
  }
}

/**
 * Subscribe to Service Worker and network status updates
 */
export function subscribeServiceWorkerStatus(callback: ServiceWorkerStatusListener): () => void {
  listeners.add(callback);
  callback({ ...currentStatus });
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get current Service Worker status
 */
export function getServiceWorkerStatus(): CacheStatusInfo {
  return { ...currentStatus };
}
