import React from 'react';

// Shared module type signature
type ComponentModule = { default: React.ComponentType<any> };
type ModuleLoader = () => Promise<ComponentModule>;

// Map of all dynamic module loaders indexed by canonical key and sub-tab IDs
const MODULE_LOADERS: Record<string, ModuleLoader> = {
  dashboard: () => import('./Dashboard').then((m) => ({ default: m.Dashboard })),
  'profit-analytics': () => import('./AdminProfitModule').then((m) => ({ default: m.AdminProfitModule })),
  pos: () => import('./PosModule').then((m) => ({ default: m.PosModule })),
  inventory: () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-stocks': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-adjustments': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-transfer': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-logistics': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-import': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-expiry': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  'inventory-branch-prices': () => import('./InventoryModule').then((m) => ({ default: m.InventoryModule })),
  procurement: () => import('./ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
  'procurement-po': () => import('./ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
  transmittal: () => import('./TransmittalModule').then((m) => ({ default: m.TransmittalModule })),
  shift: () => import('./ShiftModule').then((m) => ({ default: m.ShiftModule })),
  branches: () => import('./BranchModule').then((m) => ({ default: m.BranchModule })),
  users: () => import('./UsersModule').then((m) => ({ default: m.UsersModule })),
  'system-settings': () => import('./SystemSettingsModule').then((m) => ({ default: m.SystemSettingsModule })),
  calculator: () => import('./CalculatorModule').then((m) => ({ default: m.CalculatorModule })),
  'staff-portal': () => import('./StaffPortal').then((m) => ({ default: m.StaffPortal })),
  'atpos-extra': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  deliveries: () => import('./DeliveriesModule').then((m) => ({ default: m.DeliveriesModule })),
  'deliveries-panel': () => import('./DeliveriesModule').then((m) => ({ default: m.DeliveriesModule })),
  'sales-transmission': () => import('./SalesTransmissionModule').then((m) => ({ default: m.SalesTransmissionModule })),
  'daily-reconciliation': () => import('./DailyReconciliationModule').then((m) => ({ default: m.DailyReconciliationModule })),
  'reconciliation-transmission': () => import('./ReconciliationTransmissionModule').then((m) => ({ default: m.ReconciliationTransmissionModule })),
  'damage-register': () => import('./DamageRegisterModule').then((m) => ({ default: m.DamageRegisterModule })),
  'inventory-damage': () => import('./DamageRegisterModule').then((m) => ({ default: m.DamageRegisterModule })),
  'adjustments-void': () => import('./PosModule').then((m) => ({ default: m.PosModule })),
  'adjustments-return': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  adjustments: () => import('./AtposExtraModules') as Promise<ComponentModule>,
  members: () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'members-manage': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'members-receivables': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'members-loyalty': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'members-search-sales': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  expenses: () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'expenses-add': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'expenses-search': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  supplier: () => import('./ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
  'suppliers-manage': () => import('./ProcurementModule').then((m) => ({ default: m.ProcurementModule })),
  'suppliers-credits': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'suppliers-calendar': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  bir: () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-xz': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-summary': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-pwd': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-athletes': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-solo': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-senior20': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-senior5': () => import('./AtposExtraModules') as Promise<ComponentModule>,
  'bir-regular': () => import('./AtposExtraModules') as Promise<ComponentModule>,
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

  const promise = loader().catch((err) => {
    // Evict failed load attempt so subsequent retries can re-trigger dynamic import
    modulePromiseCache.delete(key);
    throw err;
  });

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
export const LazyUsersModule = React.lazy(() => getOrLoadModule('users'));
export const LazySystemSettingsModule = React.lazy(() => getOrLoadModule('system-settings'));
export const LazyCalculatorModule = React.lazy(() => getOrLoadModule('calculator'));
export const LazyStaffPortal = React.lazy(() => getOrLoadModule('staff-portal'));
export const LazyAtposExtraModules = React.lazy(() => getOrLoadModule('atpos-extra'));
export const LazyDeliveriesModule = React.lazy(() => getOrLoadModule('deliveries'));
export const LazySalesTransmissionModule = React.lazy(() => getOrLoadModule('sales-transmission'));
export const LazyDailyReconciliationModule = React.lazy(() => getOrLoadModule('daily-reconciliation'));
export const LazyReconciliationTransmissionModule = React.lazy(() => getOrLoadModule('reconciliation-transmission'));
export const LazyDamageRegisterModule = React.lazy(() => getOrLoadModule('damage-register'));

// Priority Tiers for pre-fetching during app idle time
export const HIGH_PRIORITY_MODULES = ['pos', 'dashboard', 'shift', 'calculator', 'inventory'];
export const MEDIUM_PRIORITY_MODULES = ['profit-analytics', 'deliveries', 'reconciliation-transmission', 'users', 'members-manage'];
export const LOW_PRIORITY_MODULES = [
  'branches',
  'system-settings',
  'atpos-extra',
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
