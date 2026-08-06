import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trackModuleVisit, prefetchModule, normalizeModuleKey } from '../components/LazyModules';
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

/**
 * Validates and normalizes any path or tab identifier into canonical route info
 */
export function validateAndNormalizeRoute(tabOrPath: string): RouteValidationResult {
  if (!tabOrPath) {
    return { isValid: false, tab: 'dashboard', path: '/dashboard' };
  }

  // Check if it's a path
  if (tabOrPath.startsWith('/')) {
    const tab = PATH_TO_TAB[tabOrPath] || tabOrPath.substring(1);
    const normalizedTab = normalizeModuleKey(tab) || tab;
    const path = TAB_TO_PATH[normalizedTab] || tabOrPath;
    const isValid = Boolean(PATH_TO_TAB[tabOrPath] || TAB_TO_PATH[normalizedTab]);
    return { isValid, tab: normalizedTab, path };
  }

  // It's a tab key
  const normalizedTab = normalizeModuleKey(tabOrPath) || tabOrPath;
  const path = TAB_TO_PATH[normalizedTab] || `/${normalizedTab}`;
  const isValid = Boolean(TAB_TO_PATH[normalizedTab] || PATH_TO_TAB[path]);
  return { isValid, tab: normalizedTab, path };
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

    if (isFirstTime) return 'tutorials';
    if (currentUser?.role === UserRole.CASHIER) return 'pos';

    return defaultTab;
  }, [currentUser, defaultTab]);

  const [activeTab, setActiveTabState] = useState<string>(resolveInitialTab);

  // Track the expected target path corresponding to activeTab state
  const initialRoute = validateAndNormalizeRoute(activeTab);
  const targetPathRef = useRef<string>(initialRoute.path);

  // Pre-emptive route validation helper
  const isRouteValid = useCallback((tabOrPath: string): boolean => {
    return validateAndNormalizeRoute(tabOrPath).isValid;
  }, []);

  // Set active tab with storage persist and prefetch trigger
  const setActiveTab = useCallback((nextTab: string | ((prev: string) => string)) => {
    setActiveTabState((prev) => {
      const target = typeof nextTab === 'function' ? nextTab(prev) : nextTab;
      const normalized = normalizeModuleKey(target) || target;

      if (typeof window !== 'undefined') {
        localStorage.setItem('tilepoint_active_tab', normalized);
      }

      // Pre-emptive route prefetch and visit tracking
      trackModuleVisit(normalized);
      prefetchModule(normalized);

      return normalized;
    });
  }, []);

  // Single unified Effect for bidirectional Route <-> Tab Syncing without race conditions or bouncing
  useEffect(() => {
    const currentPath = location.pathname;
    const activeRouteInfo = validateAndNormalizeRoute(activeTab);
    const expectedPath = activeRouteInfo.path;

    // Case 1: activeTab changed internally (via setActiveTab / changeTab)
    // We need to update the browser URL to match activeTab.
    if (currentPath !== expectedPath && targetPathRef.current !== expectedPath) {
      targetPathRef.current = expectedPath;
      navigate(expectedPath, { replace: true });
      return;
    }

    // Case 2: Browser URL changed externally (via browser Back/Forward or direct navigation)
    // We need to update activeTab to match the browser URL.
    if (currentPath !== expectedPath && currentPath !== targetPathRef.current) {
      const urlRouteInfo = validateAndNormalizeRoute(currentPath);
      if (urlRouteInfo.isValid) {
        targetPathRef.current = urlRouteInfo.path;
        setActiveTabState(urlRouteInfo.tab);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tilepoint_active_tab', urlRouteInfo.tab);
        }
        trackModuleVisit(urlRouteInfo.tab);
        prefetchModule(urlRouteInfo.tab);
      } else if (currentPath !== '/' && currentPath !== '/dashboard') {
        const fallbackTab = currentUser?.role === UserRole.CASHIER ? 'pos' : defaultTab;
        const fallbackPath = TAB_TO_PATH[fallbackTab] || '/dashboard';
        targetPathRef.current = fallbackPath;
        setActiveTabState(fallbackTab);
        navigate(fallbackPath, { replace: true });
      }
    }
  }, [activeTab, location.pathname, currentUser?.role, defaultTab, navigate]);

  return {
    activeTab,
    setActiveTab,
    isRouteValid,
    getTabPath: (tabId: string) => TAB_TO_PATH[tabId] || `/${tabId}`,
    getPathTab: (path: string) => PATH_TO_TAB[path] || path.replace(/^\//, ''),
    validateAndNormalizeRoute,
  };
}
