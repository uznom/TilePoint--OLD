import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// --- Robust Browser Fallback for Private Browsing / Blocked Storage Mode ---
try {
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch (e) {
  console.warn('[Storage Fallback] localStorage is blocked, restricted, or unsupported in this browser environment. Initializing high-fidelity in-memory storage fallback...', e);
  
  // Custom in-memory storage fallback mapping to prevent runtime crashes
  const memStore: Record<string, string> = {};
  const mockStorage: Storage = {
    length: 0,
    clear() {
      for (const k in memStore) delete memStore[k];
      this.length = 0;
    },
    getItem(key: string): string | null {
      return key in memStore ? memStore[key] : null;
    },
    key(index: number): string | null {
      return Object.keys(memStore)[index] || null;
    },
    removeItem(key: string) {
      delete memStore[key];
      this.length = Object.keys(memStore).length;
    },
    setItem(key: string, value: string) {
      memStore[key] = String(value);
      this.length = Object.keys(memStore).length;
    }
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
}

// --- Browser environment check and polyfill for older browser versions ---
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

