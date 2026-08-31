import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/plus-jakarta-sans/300.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/plus-jakarta-sans/400-italic.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyHeroUIThemeToDOM } from './lib/herouiThemeEngine';
import { registerServiceWorker, clearAllAppCaches, activateUpdate, getServiceWorkerStatus } from './services/serviceWorkerRegistration';
import './index.css';

// --- Robust Browser Fallback for Private Browsing / Blocked Storage Mode ---
try {
 const testKey = '__storage_test__';
 window.localStorage.setItem(testKey, testKey);
 window.localStorage.removeItem(testKey);
} catch (e) {
 console.warn('[Storage Fallback] localStorage is blocked, restricted, or unsupported in this browser environment. Initializing high-fidelity in-memory storage fallback...', e);
 
  const memStore: Record<string, string> = {};
  const mockStorage: Storage = {
    get length(): number {
      return Object.keys(memStore).length;
    },
    clear() {
      for (const k in memStore) delete memStore[k];
    },
    getItem(key: string): string | null {
      return key in memStore ? memStore[key] : null;
    },
    key(index: number): string | null {
      return Object.keys(memStore)[index] || null;
    },
    removeItem(key: string) {
      delete memStore[key];
    },
    setItem(key: string, value: string) {
      memStore[key] = String(value);
    }
  };

 Object.defineProperty(window, 'localStorage', {
 value: mockStorage,
 writable: true,
 configurable: true
 });
}

// --- PWA Service Worker Registration & Browser Polyfills ---
if (typeof window !== 'undefined') {
  // Register Enterprise Service Worker for offline UI asset & static data caching
  registerServiceWorker();

  // Expose operational management helpers to window for diagnostics
  (window as any).clearAppCaches = clearAllAppCaches;
  (window as any).activateServiceWorkerUpdate = activateUpdate;
  (window as any).getServiceWorkerStatus = getServiceWorkerStatus;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    if (msg.includes('WebSocket') || msg === 'WebSocket closed without opened.') {
      event.preventDefault();
      console.warn('[Vite HMR] Ignored expected WebSocket HMR connection close in preview environment:', msg);
    }
  });
}

if (typeof Object.hasOwn === 'undefined') {
 // Polyfill Object.hasOwn for older Safari, Chrome, and Firefox
 Object.hasOwn = (obj: any, prop: PropertyKey) => Object.prototype.hasOwnProperty.call(obj, prop);
}

// polyfill standard window.requestIdleCallback if unprovided by Safari or iOS WebViews
if (typeof window !== 'undefined' && !(window as any).requestIdleCallback) {
 (window as any).requestIdleCallback = function (cb: any) {
 const start = Date.now();
 return setTimeout(function () {
 cb({
 didTimeout: false,
 timeRemaining: function () {
 return Math.max(0, 50 - (Date.now() - start));
 }
 });
 }, 1);
 };
 (window as any).cancelIdleCallback = function (id: any) {
 clearTimeout(id);
 };
}

if (typeof window !== 'undefined') {
  (window as any).resetDB = async function (mode = 'all') {
    console.log(`[TilePoint Reset] Initiating database reset (mode: ${mode})...`);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('tp_token') || '';
      const res = await fetch('/api/db/truncate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode, confirmation: 'RESET' }),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch((jsonErr) => {
          console.debug('[TilePoint Reset] Failed to parse error JSON from truncate endpoint:', jsonErr);
          return {};
        });
        console.error('[TilePoint Reset] Server truncate returned non-OK status:', res.status, errorJson);
      } else {
        const data = await res.json();
        console.log('[TilePoint Reset] Server wipe response:', data);
      }
    } catch (err) {
      console.error('[TilePoint Reset] Server truncate network/execution failure:', err);
    }

    try { localStorage.clear(); } catch (storageErr) { console.warn('[TilePoint Reset] localStorage clear failed:', storageErr); }
    try { sessionStorage.clear(); } catch (storageErr) { console.warn('[TilePoint Reset] sessionStorage clear failed:', storageErr); }
    try { localStorage.setItem('tp_is_configured', 'false'); } catch (storageErr) { console.warn('[TilePoint Reset] Set unconfigured flag failed:', storageErr); }
    try { localStorage.setItem('tilepoint_onboarded_setup', 'false'); } catch (storageErr) { console.warn('[TilePoint Reset] Set onboarding flag failed:', storageErr); }
    try {
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('TilePointBackupDB');
      }
    } catch (idbErr) {
      console.warn('[TilePoint Reset] IndexedDB deletion failed:', idbErr);
    }

    console.log('[TilePoint Reset] Local and server data cleared. Rebooting...');
    window.location.href = '/';
  };
  (window as any).resetDatabase = (window as any).resetDB;
}

const rootEl = document.getElementById('root');
if (rootEl) {
  try {
    // Ensure HeroUI theme CSS variables, UI style mode, and DOM attributes are applied before React mount
    applyHeroUIThemeToDOM();
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('[TilePoint Startup] Fatal mount error caught:', err);
    rootEl.innerHTML = `
      <div style="min-height:100vh;background:#0F172A;color:#FFFFFF;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;">
        <div style="max-width:480px;background:#1E293B;border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:24px;text-align:center;">
          <h2 style="color:#EF4444;margin:0 0 8px 0;font-size:18px;">Application Launch Recovery</h2>
          <p style="color:#94A3B8;font-size:13px;margin:0 0 16px 0;">A startup initialization fault occurred. Click below to reset local state and reload.</p>
          <button onclick="window.resetDB ? window.resetDB() : (localStorage.clear(), location.reload())" style="background:#006FEE;color:#FFFFFF;border:none;border-radius:8px;padding:10px 20px;font-weight:600;cursor:pointer;">
            Reset & Reload App
          </button>
        </div>
      </div>
    `;
  }
}

