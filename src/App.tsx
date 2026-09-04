/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MotionConfig } from "motion/react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LoginModule } from "./components/LoginModule";
import { SetupModule } from "./components/SetupModule";
import { DbProvider, DbSnapshot, useDb } from "./context/DbContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queries/queryClient";
import { UserRole } from "./types/db";

// Modular lazy components imports for route-based code splitting
import {
  LazyAdminProfitModule as AdminProfitModule,
  LazyArchivesModule as ArchivesModule,
  LazyStoreOperationsModule as StoreOperationsModule,
  LazyBranchModule as BranchModule,
  LazyCalculatorModule as CalculatorModule,
  LazyDailyReconciliationModule as DailyReconciliationModule,
  LazyDamageRegisterModule as DamageRegisterModule,
  LazyDashboard as Dashboard,
  LazyDeliveriesModule as DeliveriesModule,
  LazyInventoryModule as InventoryModule,
  LazyPosModule as PosModule,
  LazyProcurementModule as ProcurementModule,
  LazyReconciliationTransmissionModule as ReconciliationTransmissionModule,
  LazySalesTransmissionModule as SalesTransmissionModule,
  LazyShiftModule as ShiftModule,
  LazyStaffPortal as StaffPortal,
  LazySystemSettingsModule as SystemSettingsModule,
  LazyTransmittalModule as TransmittalModule,
  LazyTutorialOnboarding as TutorialOnboarding,
  LazyUsersModule as UsersModule,
  performTabTransitionCleanup,
  scheduleIdlePrefetch,
  trackModuleVisit,
} from "./components/LazyModules";
import { PageLoadingFallback } from "./components/PageLoadingFallback";

import { ConfirmationModal } from "./components/ConfirmationModal";
import { DesktopKeyboardShortcutsModal } from "./components/DesktopKeyboardShortcutsModal";
import { TransactionOutboxModal } from "./components/TransactionOutboxModal";
import { IdleScreen } from "./components/IdleScreen";
import { OnboardingSetupWizard } from "./components/OnboardingSetupWizard";
import { PrivacyAccessibilityHub } from "./components/PrivacyAccessibilityHub";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { QuickModuleSwitcherModal } from "./components/QuickModuleSwitcherModal";
import { SystemLoadingOverlay } from "./components/SystemLoadingOverlay";
import { ToastNotification } from "./components/ToastNotification";
import { AppShell } from "./components/layout/AppShell";
import { LogoutConfirmModal } from "./components/modals/LogoutConfirmModal";
import { UnsavedCartModal } from "./components/modals/UnsavedCartModal";
import { UserProfileModal } from "./components/modals/UserProfileModal";
import { DatabaseBackupModal } from "./components/modals/DatabaseBackupModal";
import { SystemSettingsModal } from "./components/modals/SystemSettingsModal";
import { SessionSupersededModal } from "./components/modals/SessionSupersededModal";
import { HeroSpinner } from "./components/common/ui/HeroSpinner";
import { HeroAvatarSyncStatus } from "./components/common/ui/HeroAvatar";
import { PATH_TO_TAB, useRouteSyncManager } from "./hooks";
import { isSameBranch } from "./lib/branchUtils";

import {
  applyHeroUIThemeToDOM,
  getStoredHeroUIConfig,
  saveHeroUIConfig,
} from "./lib/herouiThemeEngine";
import {
  applyHeroThemeToDOM,
  generateThemeFromSeed,
  resetHeroThemeOverride,
} from "./lib/themeGenerator";

import {
  Building2,
  DollarSign,
  FileText,
  Layers,
  LayoutDashboard,
  RefreshCw,
  ShoppingCart,
  Truck,
  Users as UsersIcon,
} from "lucide-react";

const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.STAFF,
];
const ADMIN_MANAGER = [UserRole.ADMIN, UserRole.MANAGER];
const ADMIN_MANAGER_CASHIER = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
];
const ADMIN_ONLY = [UserRole.ADMIN];

// Definitive Directory Hierarchical Categories and Sub-items with RBAC configuration
const sidebarCategoryTree = [
  {
    id: "sale",
    name: "Sale",
    icon: ShoppingCart,
    subItems: [
      { id: "pos", name: "ERP OS Checkout Mode", roles: ALL_ROLES },
      { id: "shift", name: "Shift drawer", roles: ADMIN_MANAGER_CASHIER },
      { id: "calculator", name: "Tile Coverage Calc", roles: ALL_ROLES },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    icon: Layers,
    subItems: [
      { id: "inventory-stocks", name: "Catalog Stock Ledger", roles: ALL_ROLES },
      { id: "inventory-adjustments", name: "Adjustments Logs", roles: ALL_ROLES },
      { id: "inventory-transfer", name: "Stock Transfers", roles: ALL_ROLES },
      { id: "inventory-logistics", name: "Logistics Ledger & Heatmap", roles: ALL_ROLES },
      { id: "inventory-import", name: "Migration & Import/Export Tool", roles: ADMIN_MANAGER },
      { id: "inventory-damage", name: "Broken & BOA Register", roles: ALL_ROLES },
      { id: "inventory-expiry", name: "Shelf-Life & Expiry Calendar", roles: ALL_ROLES },
      { id: "inventory-branch-prices", name: "Branch MSRP & SRP Suggestions", roles: ADMIN_MANAGER },
    ],
  },
  {
    id: "bir",
    name: "BIR & Sales Transmission",
    icon: FileText,
    subItems: [
      { id: "reconciliation-transmission", name: "Reconciliation & Transmission", roles: ADMIN_MANAGER },
      { id: "bir-xz", name: "Search X&Z Reading", roles: ADMIN_MANAGER },
      { id: "bir-summary", name: "BIR Summary Report", roles: ADMIN_MANAGER },
      { id: "bir-pwd", name: "PWD Book (20%)", roles: ADMIN_MANAGER },
      { id: "bir-senior20", name: "Senior Citizen (20%)", roles: ADMIN_MANAGER },
      { id: "bir-senior5", name: "Senior Citizen (5%)", roles: ADMIN_MANAGER },
      { id: "bir-solo", name: "Solo Parent (10%)", roles: ADMIN_MANAGER },
      { id: "bir-athletes", name: "National Athletes", roles: ADMIN_MANAGER },
      { id: "bir-regular", name: "Regular Promos", roles: ADMIN_MANAGER },
    ],
  },
  {
    id: "deliveries",
    name: "Cargo Deliveries",
    icon: Truck,
    subItems: [
      { id: "deliveries-panel", name: "Delivery Center", roles: ALL_ROLES },
    ],
  },
  {
    id: "members",
    name: "Members",
    icon: UsersIcon,
    subItems: [
      { id: "members-manage", name: "Manage Members", roles: ALL_ROLES },
      { id: "members-receivables", name: "Account Receivables", roles: ADMIN_MANAGER },
      { id: "members-loyalty", name: "Member Loyalty Points", roles: ALL_ROLES },
    ],
  },
  {
    id: "supplier",
    name: "Supplier",
    icon: Building2,
    subItems: [
      { id: "suppliers-manage", name: "Manage Suppliers", roles: ADMIN_ONLY },
      { id: "suppliers-credits", name: "Active Credits", roles: ADMIN_ONLY },
      { id: "suppliers-calendar", name: "Payment Calendar", roles: ADMIN_ONLY },
    ],
  },
  {
    id: "expenses",
    name: "Expenses",
    icon: DollarSign,
    subItems: [
      { id: "expenses-add", name: "Add Expenses", roles: ADMIN_MANAGER },
      { id: "expenses-search", name: "Search Expenses", roles: ADMIN_MANAGER },
    ],
  },
  {
    id: "adjustments",
    name: "Sale Adjustments",
    icon: RefreshCw,
    subItems: [
      { id: "adjustments-void", name: "Search Voided Sales", roles: ALL_ROLES },
      { id: "adjustments-return", name: "Search Returned Products", roles: ALL_ROLES },
    ],
  },
  {
    id: "admin-bi",
    name: "Business Intelligence",
    icon: LayoutDashboard,
    subItems: [
      { id: "dashboard", name: "Branch Dashboard", roles: ADMIN_MANAGER },
      { id: "profit-analytics", name: "P&L Accounting Desk", roles: ADMIN_MANAGER },
    ],
  },
  {
    id: "admin-org",
    name: "Staff & Organization",
    icon: UsersIcon,
    subItems: [
      { id: "branches", name: "Branches Profile", roles: ADMIN_MANAGER },
      { id: "users", name: "Employee Directory", roles: ADMIN_MANAGER },
      { id: "archives", name: "Database & Backups", roles: ADMIN_MANAGER },
    ],
  },
];

// Centralized flat list of all submodules derived from sidebarCategoryTree
const allSubModules = sidebarCategoryTree.flatMap((category) => category.subItems);

function AppContent() {
  const {
    currentUser,
    updateCurrentUser,
    updateUser,
    users,
    branches,
    isLoggedIn,
    logout,
    isConfigured,
    isHydrating,
    isSystemHydrating,
    dbSnapshots,
    createDbSnapshot,
    restoreDbSnapshot,
    deleteDbSnapshot,
    serverConnected,
    serverDegradedState,
    refreshServerStatus,
    autoBackupEnabled,
    setAutoBackupEnabled,
    backupIntervalHours,
    setBackupIntervalHours,
    triggerSystemProcessing,
    dbSyncStatus,
    writeStatsCount,
    debounceDelay,
    suppliers,
    products,
    purchaseOrders,
    poItems,
    transmittals,
    shifts,
    sales,
    saleItems,
    movements,
    auditLogs,
    parkedSales,
    holdSale,
    stockTransfers,
    branchStock,
    ledgerEntries,
    branchSalesReports,
    deliveries,
    lowPerformanceMode,
    apiErrorState,
    clearServerErrorState,
    syncFromSharedServer,
    dbMaintenanceEnabled,
    setDbMaintenanceEnabled,
    lastMaintenanceTime,
    isMaintenanceRunning,
    runDatabaseMaintenance,
    sessionSupersededNotice,
    clearSessionNotice,
    outboxStats,
    isOutboxModalOpen,
    setIsOutboxModalOpen,
  } = useDb();

  const showSaleRedDot = parkedSales.some((p: any) => {
    const pBranch = p.heldByBranchId || (p as any).branchId;
    if (!pBranch) return false;
    return isSameBranch(pBranch, currentUser?.branchAssignmentId || "B1", branches);
  });

  const showDeliveriesRedDot = deliveries.some(
    (d) => d.status === "Scheduled" || d.status === "Packed" || d.status === "Out For Delivery"
  );

  let showInventoryRedDot: boolean;
  try {
    const cached = localStorage.getItem("tp_batch_expirations");
    if (cached) {
      const parsed = JSON.parse(cached);
      const today = new Date();
      showInventoryRedDot = parsed.some((b: any) => {
        if (!b.expiryDate) return false;
        const exp = new Date(b.expiryDate);
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      });
    } else {
      showInventoryRedDot = true;
    }
  } catch (_) {
    showInventoryRedDot = true;
  }

  const initialSavedTabRef = useRef<string | null>(null);
  if (initialSavedTabRef.current === null && typeof window !== "undefined") {
    initialSavedTabRef.current =
      localStorage.getItem("tilepoint_active_tab") || "none";
  }

  const { activeTab, setActiveTab, isRouteValid } = useRouteSyncManager({ currentUser });

  const [confirmRestoreSnap, setConfirmRestoreSnap] = useState<DbSnapshot | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToastMsg = useCallback((msg: string, _type?: "success" | "info" | "error") => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Compute canonical DB sync status for HeroAvatar display
  const avatarSyncStatus: HeroAvatarSyncStatus = useMemo(() => {
    if (serverDegradedState?.isDegraded || serverConnected === false) {
      return 'not connected';
    }
    if (dbSyncStatus === 'syncing' || dbSyncStatus === 'queued') {
      return 'syncing';
    }
    return 'connected';
  }, [serverDegradedState?.isDegraded, serverConnected, dbSyncStatus]);

  // Dynamic automatic routing on login/identity-switch to ensure Cashier goes to pos, Admin/Manager goes to dashboard
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      if (prevUserIdRef.current !== currentUser.id) {
        prevUserIdRef.current = currentUser.id;

        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          if (currentPath && currentPath !== "/") {
            const routeTab = PATH_TO_TAB[currentPath] || currentPath.replace(/^\//, "");
            if (routeTab && isRouteValid(routeTab)) {
              setActiveTab(routeTab);
              return;
            }
          }
        }

        // Direct Cashiers to checkout mode (pos), Admin & Manager to dashboard
        if (currentUser.role === UserRole.CASHIER) {
          setActiveTab("pos");
          localStorage.setItem("tilepoint_active_tab", "pos");
        } else if (
          currentUser.role === UserRole.ADMIN ||
          currentUser.role === UserRole.MANAGER
        ) {
          setActiveTab("dashboard");
          localStorage.setItem("tilepoint_active_tab", "dashboard");
        } else {
          setActiveTab("inventory-stocks");
          localStorage.setItem("tilepoint_active_tab", "inventory-stocks");
        }
      }
    } else {
      prevUserIdRef.current = null;
    }
  }, [isLoggedIn, currentUser, isRouteValid, setActiveTab]);

  // Synchronize full database state from server upon login
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      syncFromSharedServer(true).catch(() => {});
    }
  }, [isLoggedIn, currentUser, syncFromSharedServer]);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    return localStorage.getItem("tilepoint_sidebar_expanded") !== "false";
  });

  const isSidebarMinimized = !isSidebarExpanded;

  const [, setIsTabChanging] = useState(false);
  const [percentProgress, setPercentProgress] = useState(0);

  // Safety Watchdog: Ensure the top progress indicator never gets stuck or freezes under any condition
  useEffect(() => {
    if (percentProgress > 0) {
      const watchdogTimer = setTimeout(() => {
        setPercentProgress(0);
        setIsTabChanging(false);
      }, 500);
      return () => clearTimeout(watchdogTimer);
    }
  }, [percentProgress]);

  useEffect(() => {
    localStorage.setItem("tilepoint_sidebar_expanded", String(isSidebarExpanded));
    localStorage.setItem(
      "tilepoint_sidebar_minimized",
      String(isSidebarMinimized),
    );
  }, [isSidebarExpanded, isSidebarMinimized]);

  const [followSystemTheme, setFollowSystemTheme] = useState(() => {
    const saved = localStorage.getItem("tilepoint_follow_system_theme");
    return saved !== null ? saved === "true" : true;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const savedFollow = localStorage.getItem("tilepoint_follow_system_theme");
    const isFollow = savedFollow !== null ? savedFollow === "true" : true;
    if (isFollow) {
      return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    const saved = localStorage.getItem("tilepoint_dark_theme");
    return saved !== null ? saved === "true" : true;
  });

  const darkModeRef = useRef(darkMode);
  const isTogglingDarkModeRef = useRef(false);

  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

  // Handle manual dark mode toggling, disabling "follow system"
  const handleToggleDarkMode = (targetVal?: boolean) => {
    if (isTogglingDarkModeRef.current) return;
    const nextVal = targetVal !== undefined ? targetVal : !darkModeRef.current;
    
    setFollowSystemTheme(false);
    localStorage.setItem("tilepoint_follow_system_theme", "false");
    setDarkMode(nextVal);
    darkModeRef.current = nextVal;

    if (nextVal) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tilepoint_dark_theme", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tilepoint_dark_theme", "false");
    }

    // Explicitly save config and update HeroUI CSS variables
    try {
      saveHeroUIConfig({ mode: nextVal ? "dark" : "light" });
      applyHeroUIThemeToDOM({ ...getStoredHeroUIConfig(), mode: nextVal ? "dark" : "light" });
    } catch (e) {
      console.warn("Failed to apply HeroUI theme variables:", e);
    }
    const savedSeed = localStorage.getItem("tilepoint_custom_theme_primary");
    if (savedSeed) {
      try {
        const rawC = localStorage.getItem("tilepoint-color-contrast");
        const contrast = (rawC === "small" || rawC === "default") ? "small" : ((rawC as any) || "medium");
        const scheme = generateThemeFromSeed(savedSeed, nextVal, contrast);
        applyHeroThemeToDOM(scheme, nextVal);
      } catch (err) {
        console.error("[HeroUI Dynamic Theme] Failed to apply color theme:", err);
      }
    } else {
      resetHeroThemeOverride();
    }

    isTogglingDarkModeRef.current = true;
    try {
      window.dispatchEvent(new CustomEvent("tilepoint-dark-mode-toggle", { detail: nextVal }));
      window.dispatchEvent(new CustomEvent("tilepoint-theme-updated", { detail: { darkMode: nextVal, cssVariablesUpdated: true } }));
      window.dispatchEvent(new CustomEvent("tilepoint-css-vars-updated", { detail: { darkMode: nextVal, timestamp: Date.now() } }));
    } finally {
      isTogglingDarkModeRef.current = false;
    }
  };

  useEffect(() => {
    scheduleIdlePrefetch();
  }, []);

  useEffect(() => {
    localStorage.setItem("tilepoint_follow_system_theme", String(followSystemTheme));
  }, [followSystemTheme]);

  useEffect(() => {
    if (!followSystemTheme) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    setDarkMode(mediaQuery.matches);
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, [followSystemTheme]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (document.documentElement.classList.contains("accessibility-no-animation")) return;
    document.documentElement.classList.add("theme-transition");
    const t = setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 1000);
    return () => clearTimeout(t);
  }, [darkMode]);

  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const prevTabRef = useRef(activeTab);
  const progressIntervalRef = useRef<any>(null);
  const progressTimeoutRef = useRef<any>(null);
  const finishTimeoutRef = useRef<any>(null);
  const progressRafRef = useRef<number | null>(null);

  const cleanupProgressTimers = useCallback(() => {
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    setPercentProgress(0);
    setIsTabChanging(false);
  }, []);

  useEffect(() => {
    const prev = prevTabRef.current;
    if (prev !== activeTab) {
      performTabTransitionCleanup(prev, activeTab);
      trackModuleVisit(activeTab);
    }
    prevTabRef.current = activeTab;

    return () => {
      cleanupProgressTimers();
    };
  }, [activeTab, cleanupProgressTimers]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [disableAnimations] = useState(
    () => localStorage.getItem("tilepoint-disable-animations") === "true",
  );

  useLayoutEffect(() => {
    const handleSync = () => {
      const contrast = localStorage.getItem("tilepoint-color-contrast");
      const contrastMode: "default" | "small" | "medium" | "high" = (contrast === "small" || contrast === "default" || contrast === "high") ? (contrast as "small" | "default" | "high") : "medium";
      const maxTextContrast =
        localStorage.getItem("tilepoint-maximize-text-contrast") === "true";
      const seed = localStorage.getItem("tilepoint_custom_theme_primary");
      const noAnim =
        localStorage.getItem("tilepoint-disable-animations") === "true";
      const savedUiNoBlur = localStorage.getItem("tilepoint-disable-ui-blurs");
      const savedBackdropNoBlur = localStorage.getItem("tilepoint-disable-backdrop-blurs");
      const legacyNoBlur = localStorage.getItem("tilepoint-disable-blurs") === "true";
      const noUiBlur = savedUiNoBlur !== null ? savedUiNoBlur === "true" : legacyNoBlur;
      const noBackdropBlur = savedBackdropNoBlur !== null ? savedBackdropNoBlur === "true" : legacyNoBlur;
      
      const storedHeroConfig = getStoredHeroUIConfig();
      const savedUiStyle = localStorage.getItem("tilepoint-ui-style") || storedHeroConfig.uiStyle;
      const resolvedUiStyle =
        savedUiStyle === "translucent" || savedUiStyle === "frosted" || savedUiStyle === "opaque"
          ? savedUiStyle
          : storedHeroConfig.uiStyle || (noUiBlur && noBackdropBlur ? "opaque" : "frosted");

      const textSize = localStorage.getItem("tilepoint-text-size") || "normal";
      const dyslexic =
        localStorage.getItem("tilepoint-dyslexic-font") === "true";
      const enhancedOutlines =
        localStorage.getItem("tilepoint-enhanced-outlines") === "true";

      try {
        applyHeroUIThemeToDOM();
      } catch (e) {
        console.warn("Failed to apply HeroUI theme in App sync", e);
      }

      if (seed) {
        try {
          const isDark =
            document.documentElement.classList.contains("dark") ||
            localStorage.getItem("tilepoint_dark_theme") === "true";
          const scheme = generateThemeFromSeed(seed, isDark, contrastMode);
          applyHeroThemeToDOM(scheme, isDark);
        } catch (e) {
          console.error("[HeroUI Dynamic Theme] Failed to apply color theme:", e);
        }
      } else {
        resetHeroThemeOverride();
      }

      document.documentElement.setAttribute("data-ui-style", resolvedUiStyle);
      document.documentElement.classList.remove("ui-style-translucent", "ui-style-frosted", "ui-style-opaque");
      document.documentElement.classList.add(`ui-style-${resolvedUiStyle}`);

      document.documentElement.classList.remove(
        "accessibility-small-text",
        "accessibility-large-text",
        "accessibility-xlarge-text",
      );
      if (textSize === "small")
        document.documentElement.classList.add("accessibility-small-text");
      else if (textSize === "large")
        document.documentElement.classList.add("accessibility-large-text");
      else if (textSize === "xlarge")
        document.documentElement.classList.add("accessibility-xlarge-text");

      if (dyslexic) {
        document.documentElement.classList.add("accessibility-dyslexic-font");
      } else {
        document.documentElement.classList.remove("accessibility-dyslexic-font");
      }

      if (enhancedOutlines) {
        document.documentElement.classList.add(
          "accessibility-enhanced-outlines",
        );
      } else {
        document.documentElement.classList.remove(
          "accessibility-enhanced-outlines",
        );
      }

      if (contrastMode === "high") {
        document.documentElement.classList.add("accessibility-high-contrast");
      } else {
        document.documentElement.classList.remove(
          "accessibility-high-contrast",
        );
      }

      if (maxTextContrast) {
        document.documentElement.classList.add(
          "accessibility-maximize-text-contrast",
        );
      } else {
        document.documentElement.classList.remove(
          "accessibility-maximize-text-contrast",
        );
      }

      if (noAnim) {
        document.documentElement.classList.add("accessibility-no-animation");
      } else {
        document.documentElement.classList.remove("accessibility-no-animation");
      }

      if (noUiBlur || resolvedUiStyle === "opaque") {
        document.documentElement.classList.add("accessibility-no-ui-blur");
      } else {
        document.documentElement.classList.remove("accessibility-no-ui-blur");
      }

      if (noBackdropBlur || resolvedUiStyle === "opaque") {
        document.documentElement.classList.add("accessibility-no-backdrop-blur");
      } else {
        document.documentElement.classList.remove("accessibility-no-backdrop-blur");
      }

      if ((noUiBlur && noBackdropBlur) || resolvedUiStyle === "opaque") {
        document.documentElement.classList.add("accessibility-no-blur");
      } else {
        document.documentElement.classList.remove("accessibility-no-blur");
      }
    };

    const handleDarkModeEvent = (e: Event) => {
      if (isTogglingDarkModeRef.current) return;
      const customEvent = e as CustomEvent<boolean>;
      const target = typeof customEvent.detail === "boolean" ? customEvent.detail : !darkModeRef.current;
      if (target !== darkModeRef.current) {
        handleToggleDarkMode(target);
      }
    };

    window.addEventListener("tilepoint-theme-updated", handleSync);
    window.addEventListener("tilepoint-dark-mode-toggle", handleDarkModeEvent);
    handleSync();
    return () => {
      window.removeEventListener("tilepoint-theme-updated", handleSync);
      window.removeEventListener("tilepoint-dark-mode-toggle", handleDarkModeEvent);
    };
  }, [darkMode]);

  useEffect(() => {
    if (lowPerformanceMode) {
      document.documentElement.classList.add("accessibility-no-blur");
      document.documentElement.classList.add("accessibility-no-ui-blur");
      document.documentElement.classList.add("accessibility-no-backdrop-blur");
      document.documentElement.classList.add("accessibility-no-animation");
    } else {
      const noAnim = localStorage.getItem("tilepoint-disable-animations") === "true";
      const savedUiNoBlur = localStorage.getItem("tilepoint-disable-ui-blurs");
      const savedBackdropNoBlur = localStorage.getItem("tilepoint-disable-backdrop-blurs");
      const legacyNoBlur = localStorage.getItem("tilepoint-disable-blurs") === "true";
      const noUiBlur = savedUiNoBlur !== null ? savedUiNoBlur === "true" : legacyNoBlur;
      const noBackdropBlur = savedBackdropNoBlur !== null ? savedBackdropNoBlur === "true" : legacyNoBlur;

      if (!noUiBlur)
        document.documentElement.classList.remove("accessibility-no-ui-blur");
      if (!noBackdropBlur)
        document.documentElement.classList.remove("accessibility-no-backdrop-blur");
      if (!noUiBlur || !noBackdropBlur)
        document.documentElement.classList.remove("accessibility-no-blur");
      if (!noAnim)
        document.documentElement.classList.remove("accessibility-no-animation");
    }
  }, [lowPerformanceMode]);

  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [showSystemSettingsModal, setShowSystemSettingsModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [pendingUnsavedCartTargetTab, setPendingUnsavedCartTargetTab] = useState<string | null>(null);
  const [showUnsavedCartModal, setShowUnsavedCartModal] = useState(false);
  const isCompact = false;

  const handleSmoothTabChange = useCallback((nextTab: string) => {
    cleanupProgressTimers();
    setIsTabChanging(true);
    setPercentProgress(15);

    const startTime = performance.now();
    const duration = 120; // ms for initial smooth simulated progress to ~85-90%

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      // Fast ease-out cubic curve from 15% to 88%
      const currentProgress = 15 + (88 - 15) * (1 - Math.pow(1 - progressRatio, 3));
      
      setPercentProgress(Math.round(currentProgress));

      if (progressRatio < 1) {
        progressRafRef.current = requestAnimationFrame(step);
      } else {
        progressRafRef.current = null;
      }
    };

    progressRafRef.current = requestAnimationFrame(step);

    progressTimeoutRef.current = setTimeout(() => {
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
      setActiveTab(nextTab);
      setPercentProgress(100);

      finishTimeoutRef.current = setTimeout(() => {
        setIsTabChanging(false);
        setPercentProgress(0);
        finishTimeoutRef.current = null;
      }, 90);
      progressTimeoutRef.current = null;
    }, 110);
  }, [cleanupProgressTimers, setActiveTab]);

  const handleChangeTab = useCallback((tabId: string) => {
    if (tabId === activeTab) return;
    const targetItem = allSubModules.find((sub) => sub.id === tabId);
    if (targetItem && currentUser && targetItem.roles && !targetItem.roles.includes(currentUser.role)) {
      showToastMsg(`Access Restricted: ${currentUser.role} role cannot view ${targetItem.name}.`);
      return;
    }

    if (activeTab === "pos") {
      const activeCart = localStorage.getItem("tp_active_cart");
      if (activeCart) {
        try {
          const parsed = JSON.parse(activeCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const custName = localStorage.getItem("tp_active_customer_name") || "Walk-in Customer";
            const custNotes = localStorage.getItem("tp_active_customer_notes") || "";
            holdSale(parsed, custName, custNotes);
            localStorage.setItem("tp_active_cart", JSON.stringify([]));
            localStorage.setItem("tp_active_customer_name", "Walk-in Customer");
            localStorage.setItem("tp_active_customer_notes", "");
            showToastMsg("Active transaction automatically held in safe hold registers.");
          }
        } catch (holdErr) {
          console.error("[Tab Transition] Failed to auto-hold active cart during tab switch:", holdErr);
        }
      }
    }

    handleSmoothTabChange(tabId);
  }, [activeTab, currentUser, holdSale, showToastMsg, handleSmoothTabChange]);

  useEffect(() => {
    const handleStorageFailure = (e: any) => {
      const msg = e.detail?.message || "Local storage quota auto-managed. Data synced with server.";
      showToastMsg(msg);
    };
    window.addEventListener("tp_storage_failure", handleStorageFailure);
    return () => window.removeEventListener("tp_storage_failure", handleStorageFailure);
  }, [showToastMsg]);

  const [showImmersiveControls, setShowImmersiveControls] = useState(true);
  useEffect(() => {
    setShowImmersiveControls(true);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") return;
      const isCmdOrCtrl = e.ctrlKey || e.metaKey || e.altKey;
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isCmdOrCtrl && (e.key.toLowerCase() === "k" || e.key === "/")) {
        e.preventDefault();
        setIsQuickSwitcherOpen((prev) => !prev);
        return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (isSidebarHidden) {
          setIsSidebarHidden(false);
          setIsSidebarExpanded(true);
        } else {
          setIsSidebarExpanded((prev) => !prev);
        }
        return;
      }
      if (!isInput && !isCmdOrCtrl && (e.key === "?" || (e.shiftKey && e.key === "?"))) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      const shortcutMap: Record<string, { id: string; label: string }> = {
        "1": { id: "dashboard", label: "Branch Dashboard" },
        "2": { id: "pos", label: "ERP POS Checkout Mode" },
        "3": { id: "inventory-stocks", label: "Catalog Stock Ledger" },
        "4": { id: "procurement-po", label: "Procurement & PO" },
        "5": { id: "reconciliation-transmission", label: "Reconciliation & Transmission" },
        "6": { id: "shift", label: "Shift Drawer & Cash Register" },
        "7": { id: "deliveries-panel", label: "Cargo Delivery Center" },
        "8": { id: "calculator", label: "Tile Coverage Calculator" },
        "9": { id: "profit-analytics", label: "P&L Accounting Desk" },
        "0": { id: "tutorials", label: "Operational Walkthrough" },
      };

      if (isCmdOrCtrl && shortcutMap[e.key]) {
        e.preventDefault();
        const target = shortcutMap[e.key];
        const targetItem = allSubModules.find((sub) => sub.id === target.id);
        if (targetItem && currentUser && targetItem.roles && !targetItem.roles.includes(currentUser.role)) {
          showToastMsg(`Shortcut [Ctrl+${e.key}]: Access restricted for ${currentUser.role} role.`);
          return;
        }
        handleChangeTab(target.id);
        showToastMsg(`Switched to ${target.label} [Ctrl+${e.key}]`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentUser, activeTab, isSidebarHidden, handleChangeTab, showToastMsg]);



  if (isHydrating || isSystemHydrating) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground animate-fade-in z-50">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-content1/60 border border-divider/40 shadow-sm backdrop-blur-md">
          <HeroSpinner size="lg" color="primary" />
          <div className="text-center space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">TilePoint ERP</h2>
            <p className="text-xs text-default-500">Initializing workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return <SetupModule />;
  }

  if (!isLoggedIn || !currentUser) {
    return <LoginModule />;
  }

  if (
    !(
      currentUser &&
      (currentUser.role === UserRole.STAFF || currentUser.role === UserRole.CASHIER)
    ) &&
    !(typeof window !== "undefined" && localStorage.getItem("tilepoint_onboarded_setup") === "true")
  ) {
    return (
      <>
        <OnboardingSetupWizard />
        <PrivacyAccessibilityHub
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      </>
    );
  }

  if (currentUser.role === UserRole.STAFF) {
    return (
      <>
        <StaffPortal darkMode={darkMode} setDarkMode={handleToggleDarkMode} />
        <PrivacyAccessibilityHub
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          hideFloatingButton={true}
        />
      </>
    );
  }

  const getBranchName = (bId?: string | null) => {
    if (!bId || bId === "B1" || bId === "main") {
      const saved = localStorage.getItem("tilepoint_company_name_v1");
      if (saved) return saved;
    }
    const found = branches.find((b) => b.id === bId);
    if (!found) {
      const saved = localStorage.getItem("tilepoint_company_name_v1");
      return saved || branches[0]?.name || "Main Branch";
    }
    return found.name;
  };

  return (
    <MotionConfig
      reducedMotion={disableAnimations || lowPerformanceMode ? "always" : "never"}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.6,
        restDelta: 0.001,
        restSpeed: 0.001,
      }}
    >
      <div
        className={`h-screen max-h-screen w-screen overflow-hidden flex flex-col font-sans transition-all duration-300 relative ${
          darkMode ? "dark bg-background text-foreground" : "bg-background text-foreground"
        }`}
      >
        <SystemLoadingOverlay />

        <AppShell
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          currentUser={currentUser}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          getBranchName={getBranchName}
          categories={sidebarCategoryTree}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onOpenKeyboardShortcuts={() => setIsShortcutsModalOpen(true)}
          onOpenAccountSettings={() => setShowAccountSettingsModal(true)}
          onOpenSystemSettings={() => setShowSystemSettingsModal(true)}
          onOpenLogoutConfirm={() => setShowLogoutConfirmModal(true)}
          isSidebarExpanded={isSidebarExpanded}
          setIsSidebarExpanded={setIsSidebarExpanded}
          isSidebarHidden={isSidebarHidden}
          setIsSidebarHidden={setIsSidebarHidden}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          syncStatus={avatarSyncStatus}
          alertBannersProps={{
            serverDegradedState,
            refreshServerStatus,
            apiErrorState,
            clearServerErrorState,
            syncFromSharedServer,
            percentProgress,
          }}
          parkedSalesCount={parkedSales.length}
          pendingDeliveriesCount={deliveries.filter(
            (d) => d.status === "Scheduled" || d.status === "Packed" || d.status === "Out For Delivery"
          ).length}
          pendingTransfersCount={stockTransfers.filter((t) => t.status === "Pending").length}
          parkedSales={parkedSales}
          deliveries={deliveries}
          stockTransfers={stockTransfers}
          hasInventoryAlert={showInventoryRedDot}
          hasSaleAlert={showSaleRedDot}
          hasTotalAlerts={showSaleRedDot || showDeliveriesRedDot || showInventoryRedDot}
        >
                    <Suspense fallback={<PageLoadingFallback activeTab={activeTab} />}>
                      {activeTab === "tutorials" &&
                        (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER ? (
                          <TutorialOnboarding darkMode={darkMode} onNavigate={handleChangeTab} />
                        ) : (
                          <div className="p-8 text-center text-foreground">
                            <p className="text-sm font-bold text-danger">Access Restricted to Admin and Manager.</p>
                          </div>
                        ))}

                      {activeTab === "dashboard" && (
                        <Dashboard darkMode={darkMode} onNavigate={handleChangeTab} />
                      )}

                      {activeTab === "profit-analytics" && (
                        <AdminProfitModule
                          darkMode={darkMode}
                          selectedBranchId={selectedBranchId}
                          setSelectedBranchId={setSelectedBranchId}
                          getBranchName={getBranchName}
                          showToastMsg={showToastMsg}
                        />
                      )}

                      {activeTab === "pos" && (
                        <PosModule
                          darkMode={darkMode}
                          onNavigate={handleChangeTab}
                          viewMode="checkout"
                          showImmersiveControls={showImmersiveControls}
                        />
                      )}

                      {activeTab === "ledger" && (
                        <PosModule
                          darkMode={darkMode}
                          onNavigate={handleChangeTab}
                          viewMode="ledger"
                          showImmersiveControls={showImmersiveControls}
                        />
                      )}

                      {activeTab === "inventory" && (
                        <InventoryModule
                          darkMode={darkMode}
                          initialSubTab="catalog"
                          hideTabHeader={true}
                          isCompactGlobal={isCompact}
                          onSubTabChange={(newSub: string) => {
                            const revMap: Record<string, string> = {
                              catalog: "inventory-stocks",
                              movements: "inventory-adjustments",
                              transfers: "inventory-transfer",
                              ledger: "inventory-logistics",
                              import: "inventory-import",
                              "branch-prices": "inventory-branch-prices",
                              expiry: "inventory-expiry",
                            };
                            if (revMap[newSub]) handleChangeTab(revMap[newSub]);
                          }}
                        />
                      )}

                      {activeTab === "procurement" && <ProcurementModule darkMode={darkMode} />}

                      {activeTab === "transmittal" && <TransmittalModule darkMode={darkMode} />}

                      {activeTab === "shift" && <ShiftModule darkMode={darkMode} />}

                      {activeTab === "calculator" && <CalculatorModule darkMode={darkMode} />}

                      {activeTab === "branches" && <BranchModule darkMode={darkMode} />}

                      {activeTab === "archives" && <ArchivesModule darkMode={darkMode} />}

                      {activeTab === "system-settings" && (
                        <SystemSettingsModule
                          darkMode={darkMode}
                          setDarkMode={handleToggleDarkMode}
                          followSystemTheme={followSystemTheme}
                          setFollowSystemTheme={setFollowSystemTheme}
                        />
                      )}

                      {activeTab === "users" && <UsersModule darkMode={darkMode} />}

                      {activeTab === "reconciliation-transmission" && (
                        <ReconciliationTransmissionModule darkMode={darkMode} />
                      )}

                      {activeTab === "sales-transmission" && (
                        <SalesTransmissionModule darkMode={darkMode} />
                      )}

                      {activeTab === "daily-reconciliation" && (
                        <DailyReconciliationModule darkMode={darkMode} />
                      )}

                      {activeTab === "deliveries-panel" && (
                        <DeliveriesModule darkMode={darkMode} />
                      )}

                      {activeTab === "inventory-damage" && (
                        <DamageRegisterModule darkMode={darkMode} />
                      )}

                      {activeTab.startsWith("inventory-") && activeTab !== "inventory-damage" && (() => {
                        const subMap: Record<string, string> = {
                          "inventory-stocks": "catalog",
                          "inventory-adjustments": "movements",
                          "inventory-transfer": "transfers",
                          "inventory-logistics": "ledger",
                          "inventory-import": "import",
                          "inventory-branch-prices": "branch-prices",
                          "inventory-expiry": "expiry",
                        };
                        const targetSub = subMap[activeTab] || "catalog";
                        return (
                          <InventoryModule
                            darkMode={darkMode}
                            initialSubTab={targetSub}
                            hideTabHeader={true}
                            isCompactGlobal={isCompact}
                            onSubTabChange={(newSub: string) => {
                              const revMap: Record<string, string> = {
                                catalog: "inventory-stocks",
                                movements: "inventory-adjustments",
                                transfers: "inventory-transfer",
                                ledger: "inventory-logistics",
                                import: "inventory-import",
                                "branch-prices": "inventory-branch-prices",
                                expiry: "inventory-expiry",
                              };
                              if (revMap[newSub]) handleChangeTab(revMap[newSub]);
                            }}
                          />
                        );
                      })()}

                      {activeTab === "adjustments-void" && (
                        <PosModule darkMode={darkMode} onNavigate={handleChangeTab} viewMode="ledger" />
                      )}

                      {(activeTab === "suppliers-manage" || activeTab === "procurement-po") && (
                        <ProcurementModule darkMode={darkMode} />
                      )}

                      {[
                        "members",
                        "members-manage",
                        "members-receivables",
                        "members-loyalty",
                        "members-search-sales",
                        "expenses",
                        "expenses-add",
                        "expenses-search",
                        "supplier",
                        "suppliers-credits",
                        "suppliers-calendar",
                        "bir",
                        "bir-xz",
                        "bir-summary",
                        "bir-pwd",
                        "bir-athletes",
                        "bir-solo",
                        "bir-senior20",
                        "bir-senior5",
                        "bir-regular",
                        "adjustments",
                        "adjustments-return",
                      ].includes(activeTab) && (
                        <StoreOperationsModule
                          activeSubTab={
                            activeTab === "members"
                              ? "members-manage"
                              : activeTab === "expenses"
                              ? "expenses-add"
                              : activeTab === "supplier"
                              ? "suppliers-credits"
                              : activeTab === "bir"
                              ? "bir-xz"
                              : activeTab === "adjustments"
                              ? "adjustments-return"
                              : activeTab
                          }
                          darkMode={darkMode}
                          onNavigate={handleChangeTab}
                        />
                      )}
                    </Suspense>
        </AppShell>

        {/* LOGOUT CONFIRMATION MODAL */}
        <LogoutConfirmModal
          isOpen={showLogoutConfirmModal}
          onClose={() => setShowLogoutConfirmModal(false)}
          onConfirm={logout}
        />

        {/* UNSAVED CART MODAL */}
        <UnsavedCartModal
          isOpen={showUnsavedCartModal}
          onClose={() => {
            setShowUnsavedCartModal(false);
            setPendingUnsavedCartTargetTab(null);
          }}
          onConfirmLeave={() => {
            if (pendingUnsavedCartTargetTab) handleSmoothTabChange(pendingUnsavedCartTargetTab);
            setPendingUnsavedCartTargetTab(null);
          }}
        />

        {/* DATABASE BACKUP & MAINTENANCE MODAL */}
        <DatabaseBackupModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          currentUser={currentUser}
          dbSyncStatus={dbSyncStatus}
          debounceDelay={debounceDelay}
          writeStatsCount={writeStatsCount}
          autoBackupEnabled={autoBackupEnabled}
          setAutoBackupEnabled={setAutoBackupEnabled}
          backupIntervalHours={backupIntervalHours}
          setBackupIntervalHours={setBackupIntervalHours}
          dbMaintenanceEnabled={dbMaintenanceEnabled}
          setDbMaintenanceEnabled={setDbMaintenanceEnabled}
          lastMaintenanceTime={lastMaintenanceTime}
          isMaintenanceRunning={isMaintenanceRunning}
          runDatabaseMaintenance={runDatabaseMaintenance}
          dbSnapshots={dbSnapshots}
          createDbSnapshot={createDbSnapshot}
          deleteDbSnapshot={deleteDbSnapshot}
          onSelectRestoreSnapshot={(snap) => setConfirmRestoreSnap(snap)}
          triggerSystemProcessing={triggerSystemProcessing}
          showToastMsg={showToastMsg}
          fullDbState={{
            users,
            branches,
            suppliers,
            products,
            purchaseOrders,
            poItems,
            transmittals,
            shifts,
            sales,
            saleItems,
            movements,
            auditLogs,
            parkedSales,
            stockTransfers,
            branchStock,
            ledgerEntries,
            branchSalesReports,
            deliveries,
          }}
        />

        {/* ACCOUNT PROFILE & SECURITY CREDENTIALS MODAL */}
        <UserProfileModal
          isOpen={showAccountSettingsModal}
          onClose={() => setShowAccountSettingsModal(false)}
          currentUser={currentUser}
          updateUser={updateUser}
          updateCurrentUser={updateCurrentUser}
          onOpenSystemSettings={() => setShowSystemSettingsModal(true)}
          showToastMsg={showToastMsg}
        />

        {/* SYSTEM SETTINGS MODAL */}
        <SystemSettingsModal
          isOpen={showSystemSettingsModal}
          onClose={() => setShowSystemSettingsModal(false)}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          followSystemTheme={followSystemTheme}
          setFollowSystemTheme={setFollowSystemTheme}
        />

        {/* SESSION SUPERSEDED & DURATION EXPIRY MODAL */}
        <SessionSupersededModal
          sessionNotice={sessionSupersededNotice}
          onClearNotice={clearSessionNotice}
        />

        {/* FLOATING TOAST NOTIFICATION */}
        <ToastNotification
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />

        <PrivacyAccessibilityHub
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          hideFloatingButton={true}
        />

        <QuickModuleSwitcherModal
          isOpen={isQuickSwitcherOpen}
          onClose={() => setIsQuickSwitcherOpen(false)}
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleChangeTab(tabId)}
        />

        <DesktopKeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
          userRole={currentUser?.role}
        />

        {/* Transaction Outbox Floating Indicator */}
        {(outboxStats.pending > 0 || outboxStats.failed > 0 || outboxStats.deadLetter > 0) && (
          <button
            type="button"
            id="outbox-floating-trigger"
            onClick={() => setIsOutboxModalOpen(true)}
            className="fixed bottom-20 right-4 sm:right-6 md:bottom-6 z-40 flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-card border border-amber-500/40 text-foreground shadow-2xl hover:scale-105 transition-all cursor-pointer group"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-xs font-bold">
              Outbox: {outboxStats.pending + outboxStats.failed}
            </span>
            {outboxStats.failed > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                {outboxStats.failed} retry
              </span>
            )}
          </button>
        )}

        <TransactionOutboxModal
          isOpen={isOutboxModalOpen}
          onClose={() => setIsOutboxModalOpen(false)}
        />

        <PwaInstallPrompt />
        <IdleScreen />

        {confirmRestoreSnap && (
          <ConfirmationModal
            isOpen={!!confirmRestoreSnap}
            title="Restore Database Snapshot"
            alertType="danger"
            confirmText="Yes, Restore Snapshot"
            cancelText="Cancel"
            message={`Are you sure you want to restore all tables to the state in snap "${confirmRestoreSnap?.name || ""}"? This replaces current data in local storage.`}
            onConfirm={async () => {
              if (!confirmRestoreSnap) return;
              const snap = confirmRestoreSnap;
              setConfirmRestoreSnap(null);
              await triggerSystemProcessing(`Restoring Database State: ${snap.name}...`, 1800, "db", undefined, "Shutting down write engines, swapping table pointers, and updating local indices...");
              const success = await restoreDbSnapshot(snap.id);
              if (success) {
                showToastMsg(`Snapshot ${snap.id} restored successfully! Reloading UI...`);
                setTimeout(() => window.location.reload(), 250);
              } else {
                showToastMsg("Corruption Error: Snapshot load failure!");
              }
            }}
            onCancel={() => setConfirmRestoreSnap(null)}
          />
        )}
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DbProvider>
        <AppContent />
      </DbProvider>
    </QueryClientProvider>
  );
}
