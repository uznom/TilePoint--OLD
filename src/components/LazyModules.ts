import React from 'react';

// Shared module type signature
type ComponentModule = { default: React.ComponentType<any> };
type ModuleLoader = () => Promise<ComponentModule>;

// Helper to safely extract default or named component export regardless of ESM/CJS format
const resolveModule = (m: any, preferredName?: string): ComponentModule => {
  if (!m) throw new Error('Dynamic module resolved to empty object');
  if (preferredName && m[preferredName]) {
    return { default: m[preferredName] };
  }
  if (m.default) {
    return { default: m.default };
  }
  const fallbackKey = Object.keys(m).find((k) => typeof m[k] === 'function' || (typeof m[k] === 'object' && m[k] !== null));
  if (fallbackKey && m[fallbackKey]) {
    return { default: m[fallbackKey] };
  }
  return { default: m };
};

// Map of all dynamic module loaders indexed by canonical key and sub-tab IDs
const MODULE_LOADERS: Record<string, ModuleLoader> = {
  dashboard: () => import('./Dashboard').then((m) => resolveModule(m, 'Dashboard')),
  'profit-analytics': () => import('./AdminProfitModule').then((m) => resolveModule(m, 'AdminProfitModule')),
  analytics: () => import('./AdminProfitModule').then((m) => resolveModule(m, 'AdminProfitModule')),
  pos: () => import('./PosModule').then((m) => resolveModule(m, 'PosModule')),
  ledger: () => import('./PosModule').then((m) => resolveModule(m, 'PosModule')),
  inventory: () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-stocks': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-adjustments': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-transfer': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-logistics': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-import': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-expiry': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  'inventory-branch-prices': () => import('./InventoryModule').then((m) => resolveModule(m, 'InventoryModule')),
  procurement: () => import('./ProcurementModule').then((m) => resolveModule(m, 'ProcurementModule')),
  'procurement-po': () => import('./ProcurementModule').then((m) => resolveModule(m, 'ProcurementModule')),
  transmittal: () => import('./TransmittalModule').then((m) => resolveModule(m, 'TransmittalModule')),
  shift: () => import('./ShiftModule').then((m) => resolveModule(m, 'ShiftModule')),
  shifts: () => import('./ShiftModule').then((m) => resolveModule(m, 'ShiftModule')),
  branches: () => import('./BranchModule').then((m) => resolveModule(m, 'BranchModule')),
  archives: () => import('./ArchivesModule').then((m) => resolveModule(m, 'ArchivesModule')),
  users: () => import('./UsersModule').then((m) => resolveModule(m, 'UsersModule')),
  'system-settings': () => import('./SystemSettingsModule').then((m) => resolveModule(m, 'SystemSettingsModule')),
  settings: () => import('./SystemSettingsModule').then((m) => resolveModule(m, 'SystemSettingsModule')),
  calculator: () => import('./CalculatorModule').then((m) => resolveModule(m, 'CalculatorModule')),
  'staff-portal': () => import('./StaffPortal').then((m) => resolveModule(m, 'StaffPortal')),
  portal: () => import('./StaffPortal').then((m) => resolveModule(m, 'StaffPortal')),
  'store-operations': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'atpos-extra': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  deliveries: () => import('./DeliveriesModule').then((m) => resolveModule(m, 'DeliveriesModule')),
  'deliveries-panel': () => import('./DeliveriesModule').then((m) => resolveModule(m, 'DeliveriesModule')),
  'sales-transmission': () => import('./SalesTransmissionModule').then((m) => resolveModule(m, 'SalesTransmissionModule')),
  'daily-reconciliation': () => import('./DailyReconciliationModule').then((m) => resolveModule(m, 'DailyReconciliationModule')),
  'reconciliation-transmission': () => import('./ReconciliationTransmissionModule').then((m) => resolveModule(m, 'ReconciliationTransmissionModule')),
  'damage-register': () => import('./DamageRegisterModule').then((m) => resolveModule(m, 'DamageRegisterModule')),
  'inventory-damage': () => import('./DamageRegisterModule').then((m) => resolveModule(m, 'DamageRegisterModule')),
  'adjustments-void': () => import('./PosModule').then((m) => resolveModule(m, 'PosModule')),
  'adjustments-return': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  adjustments: () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  members: () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'members-manage': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'members-receivables': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'members-loyalty': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'members-search-sales': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  expenses: () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'expenses-add': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'expenses-search': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  supplier: () => import('./ProcurementModule').then((m) => resolveModule(m, 'ProcurementModule')),
  'suppliers-manage': () => import('./ProcurementModule').then((m) => resolveModule(m, 'ProcurementModule')),
  'suppliers-credits': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'suppliers-calendar': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  bir: () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-xz': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-summary': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-pwd': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-athletes': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-solo': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-senior20': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-senior5': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  'bir-regular': () => import('./StoreOperationsModule').then((m) => resolveModule(m, 'StoreOperationsModule')),
  tutorials: () => import('./TutorialOnboarding').then((m) => resolveModule(m, 'TutorialOnboarding')),
};

const PATH_ALIAS_MAP: Record<string, string> = {
  analytics: 'profit-analytics',
  settings: 'system-settings',
  shifts: 'shift',
  deliveries: 'deliveries-panel',
  'damage-register': 'inventory-damage',
  portal: 'staff-portal',
  ledger: 'pos',
  members: 'members-manage',
  bir: 'bir-xz',
  supplier: 'suppliers-manage',
  expenses: 'expenses-add',
  adjustments: 'adjustments-return',
};

/**
 * Normalizes raw keys or URL path names to canonical module loader keys
 */
export function normalizeModuleKey(rawKey: string): string {
  if (!rawKey) return '';
  const cleaned = rawKey.startsWith('/') ? rawKey.substring(1) : rawKey;
  if (MODULE_LOADERS[cleaned]) return cleaned;
  if (PATH_ALIAS_MAP[cleaned]) return PATH_ALIAS_MAP[cleaned];
  return cleaned;
}

// Map of canonical file-loader promises to prevent duplicate fetch calls
const modulePromiseCache = new Map<string, Promise<ComponentModule>>();

/**
 * Loads or returns cached dynamic import promise for a module key
 */
export function getOrLoadModule(rawKey: string): Promise<ComponentModule> {
  const key = normalizeModuleKey(rawKey);
  if (modulePromiseCache.has(key)) {
    return modulePromiseCache.get(key)!;
  }

  const loader = MODULE_LOADERS[key];
  if (!loader) {
    console.warn(`[LazyModules] No loader configured for module key: "${key}" (raw: "${rawKey}")`);
    return Promise.reject(new Error(`No loader found for module "${key}"`));
  }

  const loadWithRetry = async (retries = 2): Promise<ComponentModule> => {
    try {
      return await loader();
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 300));
        return loadWithRetry(retries - 1);
      }
      modulePromiseCache.delete(key);
      console.error(`[LazyModules] Failed to load module chunk "${key}":`, err);
      throw err;
    }
  };

  const promise = loadWithRetry();
  modulePromiseCache.set(key, promise);
  return promise;
}

// Lazy-loaded routes and heavy modules for code splitting
export const LazyDashboard = React.lazy(() => getOrLoadModule('dashboard'));
export const LazyAdminProfitModule = React.lazy(() => getOrLoadModule('profit-analytics'));
export const LazyPosModule = React.lazy(() => getOrLoadModule('pos'));
export const LazyInventoryModule = React.lazy(() => getOrLoadModule('inventory'));
export const LazyProcurementModule = React.lazy(() => getOrLoadModule('procurement'));
export const LazyTransmittalModule = React.lazy(() => getOrLoadModule('transmittal'));
export const LazyShiftModule = React.lazy(() => getOrLoadModule('shift'));
export const LazyBranchModule = React.lazy(() => getOrLoadModule('branches'));
export const LazyArchivesModule = React.lazy(() => getOrLoadModule('archives'));
export const LazyUsersModule = React.lazy(() => getOrLoadModule('users'));
export const LazySystemSettingsModule = React.lazy(() => getOrLoadModule('system-settings'));
export const LazyCalculatorModule = React.lazy(() => getOrLoadModule('calculator'));
export const LazyStaffPortal = React.lazy(() => getOrLoadModule('staff-portal'));
export const LazyStoreOperationsModule = React.lazy(() => getOrLoadModule('store-operations'));
export const LazyAtposExtraModules = LazyStoreOperationsModule;
export const LazyDeliveriesModule = React.lazy(() => getOrLoadModule('deliveries'));
export const LazySalesTransmissionModule = React.lazy(() => getOrLoadModule('sales-transmission'));
export const LazyDailyReconciliationModule = React.lazy(() => getOrLoadModule('daily-reconciliation'));
export const LazyReconciliationTransmissionModule = React.lazy(() => getOrLoadModule('reconciliation-transmission'));
export const LazyDamageRegisterModule = React.lazy(() => getOrLoadModule('damage-register'));
export const LazyTutorialOnboarding = React.lazy(() => getOrLoadModule('tutorials'));

// Priority Tiers for pre-fetching during app idle time
export const HIGH_PRIORITY_MODULES = ['pos', 'dashboard', 'shift', 'calculator', 'inventory'];
export const MEDIUM_PRIORITY_MODULES = ['profit-analytics', 'deliveries', 'reconciliation-transmission', 'users', 'members-manage'];
export const LOW_PRIORITY_MODULES = [
  'branches',
  'system-settings',
  'store-operations',
  'sales-transmission',
  'damage-register',
  'procurement',
  'transmittal',
  'staff-portal',
  'daily-reconciliation',
];

const VISITS_STORAGE_KEY = 'tilepoint_module_visits';

/**
 * Retrieves the visit frequency map for user's most frequently visited tabs
 */
export function getModuleVisits(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VISITS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Tracks a visit to a module tab to prioritize future idle prefetching
 */
export function trackModuleVisit(rawKey: string): void {
  const key = normalizeModuleKey(rawKey);
  if (!key || !MODULE_LOADERS[key]) return;
  try {
    const visits = getModuleVisits();
    visits[key] = (visits[key] || 0) + 1;
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Explicitly pre-fetches a single module bundle into browser cache
 */
export function prefetchModule(rawKey: string): Promise<ComponentModule> | null {
  const key = normalizeModuleKey(rawKey);
  if (!key || !MODULE_LOADERS[key]) return null;
  return getOrLoadModule(key).catch(() => null as any);
}

/**
 * Pre-fetches modules dynamically based on:
 * 1. User's most frequently visited tabs (from visit history)
 * 2. High-priority Tier 1 / Tier 2 core modules
 */
export function prefetchPriorityModules(tier: 'high' | 'medium' | 'low' | 'frequent' | 'all' = 'high'): void {
  const visits = getModuleVisits();
  const sortedByFrequency = Object.keys(MODULE_LOADERS).sort(
    (a, b) => (visits[b] || 0) - (visits[a] || 0)
  );

  let keysToPrefetch: string[] = [];

  if (tier === 'frequent') {
    keysToPrefetch = sortedByFrequency.filter((k) => (visits[k] || 0) > 0).slice(0, 5);
  } else if (tier === 'high') {
    const frequentHigh = sortedByFrequency.filter((k) => (visits[k] || 0) > 0).slice(0, 3);
    keysToPrefetch = Array.from(new Set([...frequentHigh, ...HIGH_PRIORITY_MODULES]));
  } else if (tier === 'medium') {
    keysToPrefetch = MEDIUM_PRIORITY_MODULES;
  } else if (tier === 'low') {
    keysToPrefetch = LOW_PRIORITY_MODULES;
  } else if (tier === 'all') {
    keysToPrefetch = Object.keys(MODULE_LOADERS);
  }

  keysToPrefetch.forEach((key) => {
    prefetchModule(key);
  });
}

let isIdleScheduled = false;

/**
 * Schedules non-blocking granular pre-fetching during app idle time
 */
export function scheduleIdlePrefetch(): void {
  if (isIdleScheduled || typeof window === 'undefined') return;
  isIdleScheduled = true;

  const runIdle = (callback: () => void, timeoutMs: number) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout: timeoutMs });
    } else {
      setTimeout(callback, timeoutMs);
    }
  };

  // Phase 1 (1.5s idle): Frequently visited tabs + High-priority core POS/Dashboard modules
  runIdle(() => {
    prefetchPriorityModules('high');

    // Phase 2 (4s idle): Medium priority analytics & logistics modules
    runIdle(() => {
      prefetchPriorityModules('medium');

      // Phase 3 (8s idle): Low priority admin & setup modules
      runIdle(() => {
        prefetchPriorityModules('low');
      }, 4000);
    }, 2500);
  }, 1500);
}

/**
 * Robust cleanup routine executed whenever activeTab transitions.
 * Aggressively tears down detached DOM references, focus trees, audio/speech synthesis,
 * floating popups, and dispatches lifecycle events for modules to release caches.
 */
export function performTabTransitionCleanup(fromTab: string, toTab: string): void {
  if (typeof window === 'undefined') return;

  // 1. Defocus active element to prevent the browser from holding detached DOM node references
  try {
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  } catch (_) {
    // Ignore DOM detachment errors
  }

  // 2. Terminate any active speech synthesis or media playback from inactive modules
  try {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  } catch (_) {
    // Ignore media errors
  }

  // 3. Dispatch system-wide transition cleanup event so active module subscriptions / timers / workers can dispose
  try {
    const cleanupEvent = new CustomEvent('tp_tab_transition_cleanup', {
      detail: {
        fromTab,
        toTab,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(cleanupEvent);
  } catch (_) {
    // Ignore dispatch errors
  }

  // 4. Force browser GC hint if exposed in runtime environment (e.g. Electron / Chromium flags)
  try {
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  } catch (_) {
    // Ignore GC call errors
  }
}
