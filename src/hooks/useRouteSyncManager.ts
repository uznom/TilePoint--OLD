import { useCallback,useEffect,useState } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import { normalizeModuleKey,prefetchModule,trackModuleVisit } from '../components/LazyModules';
import { UserRole } from '../types/db';

export const TAB_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  'profit-analytics': '/analytics',
  pos: '/pos',
  ledger: '/ledger',
  inventory: '/inventory/stocks',
  procurement: '/procurement',
  'procurement-po': '/procurement/po',
  transmittal: '/transmittal',
  shift: '/shifts',
  calculator: '/calculator',
  branches: '/branches',
  archives: '/archives',
  'database-backups': '/archives',
  backups: '/archives',
  'system-settings': '/settings',
  users: '/users',
  'reconciliation-transmission': '/reconciliation-transmission',
  'deliveries-panel': '/deliveries',
  'inventory-damage': '/damage-register',
  tutorials: '/tutorials',
  'adjustments-void': '/adjustments-void',
  'suppliers-manage': '/suppliers-manage',
  'staff-portal': '/portal',
  'sales-transmission': '/sales-transmission',
  'daily-reconciliation': '/daily-reconciliation',
  'inventory-stocks': '/inventory/stocks',
  'inventory-adjustments': '/inventory/adjustments',
  'inventory-transfer': '/inventory/transfers',
  'inventory-logistics': '/inventory/logistics',
  'inventory-import': '/inventory/import',
  'inventory-branch-prices': '/inventory/branch-prices',
  'inventory-expiry': '/inventory/expiry',
  members: '/members',
  'members-manage': '/members/manage',
  'members-receivables': '/members/receivables',
  'members-loyalty': '/members/loyalty',
  'members-search-sales': '/members/search-sales',
  bir: '/bir',
  'bir-xz': '/bir/xz',
  'bir-summary': '/bir/summary',
  'bir-pwd': '/bir/pwd',
  'bir-athletes': '/bir/athletes',
  'bir-solo': '/bir/solo',
  'bir-senior20': '/bir/senior20',
  'bir-senior5': '/bir/senior5',
  'bir-regular': '/bir/regular',
  supplier: '/supplier',
  'suppliers-credits': '/suppliers/credits',
  'suppliers-calendar': '/suppliers/calendar',
  expenses: '/expenses',
  'expenses-add': '/expenses/add',
  'expenses-search': '/expenses/search',
  adjustments: '/adjustments',
  'adjustments-return': '/adjustments/return',
};

export const PATH_TO_TAB: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/analytics': 'profit-analytics',
  '/pos': 'pos',
  '/ledger': 'ledger',
  '/inventory': 'inventory-stocks',
  '/procurement': 'procurement',
  '/procurement/po': 'procurement-po',
  '/transmittal': 'transmittal',
  '/shifts': 'shift',
  '/calculator': 'calculator',
  '/branches': 'branches',
  '/archives': 'archives',
  '/backups': 'archives',
  '/database-backups': 'archives',
  '/database': 'archives',
  '/settings': 'system-settings',
  '/users': 'users',
  '/reconciliation-transmission': 'reconciliation-transmission',
  '/deliveries': 'deliveries-panel',
  '/damage-register': 'inventory-damage',
  '/tutorials': 'tutorials',
  '/adjustments-void': 'adjustments-void',
  '/suppliers-manage': 'suppliers-manage',
  '/portal': 'staff-portal',
  '/sales-transmission': 'sales-transmission',
  '/daily-reconciliation': 'daily-reconciliation',
  '/inventory/stocks': 'inventory-stocks',
  '/inventory/adjustments': 'inventory-adjustments',
  '/inventory/transfers': 'inventory-transfer',
  '/inventory/logistics': 'inventory-logistics',
  '/inventory/import': 'inventory-import',
  '/inventory/branch-prices': 'inventory-branch-prices',
  '/inventory/expiry': 'inventory-expiry',
  '/members': 'members-manage',
  '/members/manage': 'members-manage',
  '/members/receivables': 'members-receivables',
  '/members/loyalty': 'members-loyalty',
  '/members/search-sales': 'members-search-sales',
  '/bir': 'bir-xz',
  '/bir/xz': 'bir-xz',
  '/bir/summary': 'bir-summary',
  '/bir/pwd': 'bir-pwd',
  '/bir/athletes': 'bir-athletes',
  '/bir/solo': 'bir-solo',
  '/bir/senior20': 'bir-senior20',
  '/bir/senior5': 'bir-senior5',
  '/bir/regular': 'bir-regular',
  '/supplier': 'suppliers-manage',
  '/suppliers/manage': 'suppliers-manage',
  '/suppliers/credits': 'suppliers-credits',
  '/suppliers/calendar': 'suppliers-calendar',
  '/expenses': 'expenses-add',
  '/expenses/add': 'expenses-add',
  '/expenses/search': 'expenses-search',
  '/adjustments': 'adjustments-return',
  '/adjustments/return': 'adjustments-return',
};

export interface UseRouteSyncOptions {
  currentUser?: { role?: UserRole | string } | null;
  defaultTab?: string;
}

export interface RouteValidationResult {
  isValid: boolean;
  tab: string;
  path: string;
}

const CANONICAL_TAB_MAP: Record<string, string> = {
  inventory: 'inventory-stocks',
  'inventory-stocks': 'inventory-stocks',
  'inventory-adjustments': 'inventory-adjustments',
  'inventory-transfer': 'inventory-transfer',
  'inventory-logistics': 'inventory-logistics',
  'inventory-import': 'inventory-import',
  'inventory-branch-prices': 'inventory-branch-prices',
  'inventory-expiry': 'inventory-expiry',
  'inventory-damage': 'inventory-damage',
  'damage-register': 'inventory-damage',
  supplier: 'suppliers-manage',
  'suppliers-manage': 'suppliers-manage',
  'suppliers-credits': 'suppliers-credits',
  'suppliers-calendar': 'suppliers-calendar',
  expenses: 'expenses-add',
  'expenses-add': 'expenses-add',
  'expenses-search': 'expenses-search',
  bir: 'bir-xz',
  'bir-xz': 'bir-xz',
  'bir-summary': 'bir-summary',
  'bir-pwd': 'bir-pwd',
  'bir-athletes': 'bir-athletes',
  'bir-solo': 'bir-solo',
  'bir-senior20': 'bir-senior20',
  'bir-senior5': 'bir-senior5',
  'bir-regular': 'bir-regular',
  adjustments: 'adjustments-return',
  'adjustments-return': 'adjustments-return',
  'adjustments-void': 'adjustments-void',
  members: 'members-manage',
  'members-manage': 'members-manage',
  'members-receivables': 'members-receivables',
  'members-loyalty': 'members-loyalty',
  'members-search-sales': 'members-search-sales',
  deliveries: 'deliveries-panel',
  'deliveries-panel': 'deliveries-panel',
  analytics: 'profit-analytics',
  'profit-analytics': 'profit-analytics',
  shifts: 'shift',
  shift: 'shift',
  portal: 'staff-portal',
  'staff-portal': 'staff-portal',
  settings: 'system-settings',
  'system-settings': 'system-settings',
  archives: 'archives',
  backups: 'archives',
  'database-backups': 'archives',
  database: 'archives',
  procurement: 'procurement',
  'procurement-po': 'procurement-po',
  dashboard: 'dashboard',
  pos: 'pos',
  ledger: 'ledger',
  transmittal: 'transmittal',
  calculator: 'calculator',
  branches: 'branches',
  users: 'users',
  'reconciliation-transmission': 'reconciliation-transmission',
  'sales-transmission': 'sales-transmission',
  'daily-reconciliation': 'daily-reconciliation',
  tutorials: 'tutorials',
};

export function canonicalizeTab(rawTab: string): string {
  if (!rawTab) return 'dashboard';
  const clean = rawTab.startsWith('/') ? rawTab.substring(1) : rawTab;
  if (CANONICAL_TAB_MAP[clean]) return CANONICAL_TAB_MAP[clean];
  const normalized = normalizeModuleKey(clean) || clean;
  return CANONICAL_TAB_MAP[normalized] || normalized;
}

/**
 * Validates and normalizes any path or tab identifier into canonical route info
 */
export function validateAndNormalizeRoute(tabOrPath: string): RouteValidationResult {
  if (!tabOrPath) {
    return { isValid: false, tab: 'dashboard', path: '/dashboard' };
  }

  // Check if it's a path
  if (tabOrPath.startsWith('/')) {
    const rawTab = PATH_TO_TAB[tabOrPath] || tabOrPath.substring(1);
    const canonicalTab = canonicalizeTab(rawTab);
    const path = TAB_TO_PATH[canonicalTab] || tabOrPath;
    const isValid = Boolean(PATH_TO_TAB[tabOrPath] || TAB_TO_PATH[canonicalTab]);
    return { isValid, tab: canonicalTab, path };
  }

  // It's a tab key
  const canonicalTab = canonicalizeTab(tabOrPath);
  const path = TAB_TO_PATH[canonicalTab] || `/${canonicalTab}`;
  const isValid = Boolean(TAB_TO_PATH[canonicalTab] || PATH_TO_TAB[path]);
  return { isValid, tab: canonicalTab, path };
}

/**
 * Centralized Route Sync Manager hook for URL-to-state mapping, browser history/back-button handling,
 * and pre-emptive route validation & module prefetching.
 */
export function useRouteSyncManager(options: UseRouteSyncOptions = {}) {
  const { currentUser, defaultTab = 'dashboard' } = options;
  const location = useLocation();
  const navigate = useNavigate();

  // Initial tab resolution logic
  const resolveInitialTab = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== '/') {
        const routeValidation = validateAndNormalizeRoute(currentPath);
        if (routeValidation.isValid) {
          return routeValidation.tab;
        }
      }
      const savedTab = localStorage.getItem('tilepoint_active_tab');
      if (savedTab) {
        const savedValidation = validateAndNormalizeRoute(savedTab);
        if (savedValidation.isValid) return savedValidation.tab;
      }
    }

    const isFirstTime =
      typeof window !== 'undefined' &&
      localStorage.getItem('tp_first_login_done') !== 'true';

    const isAdminOrManager =
      currentUser?.role === UserRole.ADMIN ||
      currentUser?.role === UserRole.MANAGER;

    if (currentUser?.role === UserRole.CASHIER) return 'pos';
    if (currentUser?.role === UserRole.STAFF) return 'inventory-stocks';

    if (isFirstTime && isAdminOrManager) return 'tutorials';

    return defaultTab;
  }, [currentUser, defaultTab]);

  const [activeTab, setActiveTabState] = useState<string>(resolveInitialTab);

  // Pre-emptive route validation helper
  const isRouteValid = useCallback((tabOrPath: string): boolean => {
    return validateAndNormalizeRoute(tabOrPath).isValid;
  }, []);

  // Set active tab with URL navigation, storage persist and prefetch trigger
  const setActiveTab = useCallback((nextTab: string | ((prev: string) => string)) => {
    setActiveTabState((prev) => {
      const target = typeof nextTab === 'function' ? nextTab(prev) : nextTab;
      const canonical = canonicalizeTab(target);
      const targetPath = TAB_TO_PATH[canonical] || `/${canonical}`;

      if (typeof window !== 'undefined') {
        localStorage.setItem('tilepoint_active_tab', canonical);
      }

      // Pre-emptive route prefetch and visit tracking
      trackModuleVisit(canonical);
      prefetchModule(canonical);

      // Defer URL navigation to next microtask so BrowserRouter is not updated synchronously during render
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        queueMicrotask(() => {
          navigate(targetPath);
        });
      }

      return canonical;
    });
  }, [navigate]);

  // Unified Effect for URL -> Tab Syncing (handles Browser Back / Forward / Popstate / initial load)
  useEffect(() => {
    const currentPath = location.pathname;
    const urlRouteInfo = validateAndNormalizeRoute(currentPath);

    // Initial root redirect: if at root '/', replace with default active tab path
    if (currentPath === '/') {
      const activeRouteInfo = validateAndNormalizeRoute(activeTab);
      const rootTargetPath = activeRouteInfo.path || '/dashboard';
      navigate(rootTargetPath, { replace: true });
      return;
    }

    // When the browser URL matches a valid route and differs from activeTab state
    // (e.g. Browser Back/Forward button clicked or user entered URL directly)
    if (urlRouteInfo.isValid && urlRouteInfo.tab !== activeTab) {
      setActiveTabState(urlRouteInfo.tab);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tilepoint_active_tab', urlRouteInfo.tab);
      }
      trackModuleVisit(urlRouteInfo.tab);
      prefetchModule(urlRouteInfo.tab);
      return;
    }

    // Handle invalid URLs entered manually
    if (!urlRouteInfo.isValid && currentPath !== '/' && currentPath !== '/dashboard') {
      const fallbackTab = currentUser?.role === UserRole.CASHIER ? 'pos' : defaultTab;
      const fallbackPath = TAB_TO_PATH[fallbackTab] || '/dashboard';
      setActiveTabState(fallbackTab);
      navigate(fallbackPath, { replace: true });
    }
  }, [location.pathname, activeTab, currentUser?.role, defaultTab, navigate]);

  return {
    activeTab,
    setActiveTab,
    isRouteValid,
    getTabPath: (tabId: string) => TAB_TO_PATH[tabId] || `/${tabId}`,
    getPathTab: (path: string) => PATH_TO_TAB[path] || path.replace(/^\//, ''),
    validateAndNormalizeRoute,
  };
}
