import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trackModuleVisit, prefetchModule, normalizeModuleKey } from '../components/LazyModules';
import { UserRole } from '../types/db';

export const TAB_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  'profit-analytics': '/analytics',
  pos: '/pos',
  ledger: '/ledger',
  inventory: '/inventory',
  procurement: '/procurement',
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
};

export const PATH_TO_TAB: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/analytics': 'profit-analytics',
  '/pos': 'pos',
  '/ledger': 'ledger',
  '/inventory': 'inventory',
  '/procurement': 'procurement',
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
  const isNavigatingRef = useRef(false);

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

  // Synchronize internal state change to browser URL
  useEffect(() => {
    if (!activeTab || typeof activeTab !== 'string') return;

    const routeInfo = validateAndNormalizeRoute(activeTab);
    const targetPath = routeInfo.path;

    if (location.pathname !== targetPath && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      try {
        navigate(targetPath, { replace: true });
      } catch (err) {
        console.warn('[RouteSyncManager] Navigation error:', err);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 50);
      }
    }
  }, [activeTab, location.pathname, navigate]);

  // Synchronize browser URL changes (back/forward popstate) to internal state with pre-emptive route validation
  useEffect(() => {
    const rawPath = location.pathname;
    const routeInfo = validateAndNormalizeRoute(rawPath);

    if (routeInfo.isValid) {
      if (activeTab !== routeInfo.tab) {
        setActiveTabState(routeInfo.tab);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tilepoint_active_tab', routeInfo.tab);
        }
        trackModuleVisit(routeInfo.tab);
        prefetchModule(routeInfo.tab);
      }
    } else if (rawPath !== '/' && rawPath !== '/dashboard') {
      // Pre-emptive fallback for unknown/unrecognized routes
      console.warn(`[RouteSyncManager] Unrecognized route "${rawPath}", redirecting to fallback route.`);
      const fallbackTab = currentUser?.role === UserRole.CASHIER ? 'pos' : defaultTab;
      const fallbackPath = TAB_TO_PATH[fallbackTab] || '/dashboard';
      setActiveTabState(fallbackTab);
      navigate(fallbackPath, { replace: true });
    }
  }, [location.pathname, activeTab, currentUser, defaultTab, navigate]);

  return {
    activeTab,
    setActiveTab,
    isRouteValid,
    getTabPath: (tabId: string) => TAB_TO_PATH[tabId] || `/${tabId}`,
    getPathTab: (path: string) => PATH_TO_TAB[path] || path.replace(/^\//, ''),
    validateAndNormalizeRoute,
  };
}
