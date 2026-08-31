/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoginModule } from "./components/LoginModule";
import { SetupModule } from "./components/SetupModule";
import { DbProvider, DbSnapshot, useDb } from "./context/DbContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queries/queryClient";
import { saveFileToBackup, verifyAndUnwrapBackup } from "./lib/fileBackupHelper";
import { User, UserRole } from "./types/db";

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
import { HeaderNavTabs } from "./components/HeaderNavTabs";
import { IdleScreen } from "./components/IdleScreen";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { OnboardingSetupWizard } from "./components/OnboardingSetupWizard";
import { PrivacyAccessibilityHub } from "./components/PrivacyAccessibilityHub";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { QuickModuleSwitcherModal } from "./components/QuickModuleSwitcherModal";
import { Sidebar } from "./components/Sidebar";
import { SystemLoadingOverlay } from "./components/SystemLoadingOverlay";
import { ToastNotification } from "./components/ToastNotification";
import { HeroSpinner } from "./components/common/ui/HeroSpinner";
import { HeroDropdownSelect } from "./components/common/ui/HeroDropdown";
import { HeroModal } from "./components/common/ui/HeroModal";
import { HeroButton } from "./components/common/ui/HeroButton";
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
  AlertTriangle,
  Building2,
  ChevronRight,
  Database,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Power,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Users as UsersIcon,
  Clock,
  HardDrive,
  Zap,
  Settings,
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
  const [backupActiveSubTab, setBackupActiveSubTab] = useState<"scheduler" | "ledger" | "import-export">("scheduler");
  const [manualSnapshotName, setManualSnapshotName] = useState("");
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);
  const [pendingUnsavedCartTargetTab, setPendingUnsavedCartTargetTab] = useState<string | null>(null);
  const [showUnsavedCartModal, setShowUnsavedCartModal] = useState(false);
  const isCompact = false;

  // Profile update modal state
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editProfilePicture, setEditProfilePicture] = useState<string | null>(null);
  const [profileModalError, setProfileModalError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.fullName || "");
      setEditUsername(currentUser.username || "");
      setEditProfilePicture(currentUser.profilePicture || null);
    }
  }, [currentUser, showAccountSettingsModal]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileModalError("");
    setIsUpdatingProfile(true);

    try {
      const passwordUpdates: Partial<User> = {};
      if (currentPasswordInput || newPasswordInput || confirmPasswordInput) {
        if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
          setProfileModalError("To change password, please fill out all password fields.");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPasswordInput.length < 8) {
          setProfileModalError("Security Policy: New password must be at least 8 characters.");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPasswordInput !== confirmPasswordInput) {
          setProfileModalError("Confirmation Error: New passwords do not match.");
          setIsUpdatingProfile(false);
          return;
        }

        const sessionTok = sessionStorage.getItem("tp_session_token") || localStorage.getItem("tp_session_token");
        const changeRes = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionTok ? { "Authorization": `Bearer ${sessionTok}` } : {})
          },
          body: JSON.stringify({
            currentPassword: currentPasswordInput,
            newPassword: newPasswordInput
          })
        });

        const changeData = await changeRes.json();
        if (!changeRes.ok || !changeData.success) {
          setProfileModalError(changeData.error || "Password update failed on server.");
          setIsUpdatingProfile(false);
          return;
        }
      }

      if (!editFullName.trim()) {
        setProfileModalError("Validation Error: Full Name is required.");
        setIsUpdatingProfile(false);
        return;
      }
      if (!editUsername.trim()) {
        setProfileModalError("Validation Error: Username is required.");
        setIsUpdatingProfile(false);
        return;
      }

      const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const initials = editFullName
        .split(" ")
        .map((p) => (p ? p[0] : ""))
        .join("")
        .toUpperCase()
        .slice(0, 2) || "AD";

      const updatedData: Partial<User> = {
        fullName: editFullName.trim(),
        username: cleanUsername,
        profilePicture: editProfilePicture || undefined,
        avatarInitials: initials,
        ...passwordUpdates,
      };

      if (currentUser?.id) {
        updateUser(currentUser.id, updatedData);
      }
      updateCurrentUser(updatedData);

      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowAccountSettingsModal(false);
      showToastMsg("Account details successfully updated!");
    } catch (err: any) {
      console.error(err);
      setProfileModalError("Dynamic crypt engine error: unable to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

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

  const activeCategory = sidebarCategoryTree.find(
    (cat) => cat.subItems.some((sub) => sub.id === activeTab) || cat.id === activeTab,
  );
  const isInventorySection = activeCategory?.id === "inventory";

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

        {/* CRITICAL LOUD PERSISTENT BANNER: DEGRADED ENGINE ALERT */}
        {serverDegradedState?.isDegraded && (
          <div className="fixed inset-x-0 top-0 z-[70] bg-gradient-to-r from-red-700 via-amber-700 to-red-800 text-white shadow-2xl border-b-2 border-amber-400/60 p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/30 rounded-xl border border-white/20 text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white flex items-center gap-2">
                    CRITICAL SYSTEM ALERT: DEGRADED DATABASE MODE ACTIVE
                  </h4>
                  <span className="bg-red-950/80 text-amber-300 border border-amber-400/40 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    MYSQL OFFLINE
                  </span>
                  {(serverDegradedState.queuedWritesCount ?? 0) > 0 && (
                    <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      {serverDegradedState.queuedWritesCount} Write(s) Queued
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-amber-100/90 mt-0.5 font-medium leading-tight max-w-3xl">
                  Primary MySQL database engine is disconnected. Transactions are buffered locally in temporary store and will auto-replay on reconnect.
                  {serverDegradedState.lastDegradedReason ? ` [${serverDegradedState.lastDegradedReason}]` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => refreshServerStatus()}
                className="flex items-center gap-1.5 bg-white text-red-900 hover:bg-amber-100 active:scale-95 transition-all text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer uppercase tracking-wider"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {apiErrorState && (
          <div className="fixed inset-x-0 top-0 z-[60] bg-content2/95 backdrop-blur-md border-b border-divider/35 shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  apiErrorState.statusCode === 429
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {apiErrorState.statusCode === 429 ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                  <span>System Response Indicator: HTTP {apiErrorState.statusCode}</span>
                  {apiErrorState.statusCode === 429 && (
                    <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      COOL-DOWN ACTIVE
                    </span>
                  )}
                </h4>
                <p className="text-xs text-default-500 mt-0.5 max-w-2xl leading-relaxed">
                  {apiErrorState.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {apiErrorState.statusCode === 429 ? (
                <div className="bg-amber-500/15 border border-amber-500/35 text-amber-500 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Retry in {apiErrorState.retryAfter || 0}s
                </div>
              ) : apiErrorState.statusCode === 500 ? (
                <>
                  <button
                    onClick={() => {
                      clearServerErrorState();
                      syncFromSharedServer();
                    }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Connection
                  </button>
                  <button
                    onClick={clearServerErrorState}
                    className="border border-default-200 hover:bg-default-100 text-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Use Offline Fallback
                  </button>
                </>
              ) : (
                <button
                  onClick={clearServerErrorState}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                >
                  Dismiss Warning
                </button>
              )}
            </div>
          </div>
        )}

        {percentProgress > 0 && (
          <div
            className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-500 lod-progress z-50 origin-left will-change-transform pointer-events-none transition-transform duration-75 ease-out"
            style={{
              transform: `scaleX(${Math.min(Math.max(percentProgress, 0), 100) / 100}) translateZ(0)`
            }}
          />
        )}

        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {isSidebarHidden && (
            <button
              onClick={() => setIsSidebarHidden(false)}
              className="fixed left-0 top-1/2 -translate-y-1/2 z-[45] p-2 bg-primary text-primary-foreground rounded-r-2xl border-y border-r border-divider/35 shadow-2xl hover:bg-primary/95 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
              title="Restore Navigation Sidebar"
            >
              <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          <Sidebar
            isSidebarExpanded={isSidebarExpanded}
            setIsSidebarExpanded={setIsSidebarExpanded}
            isSidebarHidden={isSidebarHidden}
            activeTab={activeTab}
            changeTab={handleChangeTab}
            currentUser={currentUser}
            branches={branches}
            darkMode={darkMode}
            handleToggleDarkMode={handleToggleDarkMode}
            setShowAccountSettingsModal={setShowAccountSettingsModal}
            setShowSystemSettingsModal={setShowSystemSettingsModal}
            setShowLogoutConfirmModal={setShowLogoutConfirmModal}
            parkedSales={parkedSales}
            deliveries={deliveries}
            stockTransfers={stockTransfers}
            getBranchName={getBranchName}
            categories={sidebarCategoryTree}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
            <div className="px-2.5 sm:px-4 md:px-6 pt-3 pb-0 shrink-0">
              <HeaderNavTabs
                activeTab={activeTab}
                onChangeTab={handleChangeTab}
                currentUser={currentUser}
                parkedSalesCount={parkedSales.length}
                pendingDeliveriesCount={deliveries.filter(
                  (d) => d.status === "Scheduled" || d.status === "Packed" || d.status === "Out For Delivery"
                ).length}
                pendingTransfersCount={stockTransfers.filter((t) => t.status === "Pending").length}
                categories={sidebarCategoryTree}
              />
            </div>

            <main
              className={`flex-1 relative flex flex-col text-foreground transition-all duration-300 overflow-x-hidden min-h-0 ${
                activeTab === "pos" || activeTab === "ledger"
                  ? "p-2 sm:p-4 md:p-5 pb-20 md:pb-5 overflow-y-auto lg:overflow-hidden h-full max-h-full"
                  : "p-2.5 sm:p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto scroll-smooth mobile-scroll-container"
              } ${isCompact || !isInventorySection ? "compact-fit" : ""}`}
            >
              <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{ willChange: "transform, opacity" }}
                    className="h-full flex flex-col min-h-0"
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
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>

        <MobileBottomNav
          activeTab={activeTab}
          changeTab={handleChangeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          hasInventoryAlert={showInventoryRedDot}
          hasSaleAlert={showSaleRedDot}
          hasTotalAlerts={showSaleRedDot || showDeliveriesRedDot || showInventoryRedDot}
        />

        {/* LOGOUT CONFIRMATION MODAL */}
        <HeroModal
          isOpen={showLogoutConfirmModal}
          onClose={() => setShowLogoutConfirmModal(false)}
          size="sm"
          zIndex={99999}
        >
          <HeroModal.Header className="pb-3 border-b border-divider/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-danger/10 text-danger shrink-0 border border-danger/20">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Confirm Sign Out</h3>
                <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">Session Termination Guard</p>
              </div>
            </div>
          </HeroModal.Header>

          <HeroModal.Body className="py-4">
            <p className="text-xs text-default-500 font-medium leading-relaxed">
              Are you sure you want to log out of TilePoint terminal? Any unsaved active checkout carts will be lost.
            </p>
          </HeroModal.Body>

          <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/20">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={() => setShowLogoutConfirmModal(false)}
              className="font-bold text-xs"
            >
              No, Keep Active
            </HeroButton>
            <HeroButton
              type="button"
              variant="solid"
              color="danger"
              size="sm"
              onClick={() => {
                setShowLogoutConfirmModal(false);
                logout();
              }}
              className="font-black text-xs uppercase tracking-wider"
            >
              Yes, Sign Out
            </HeroButton>
          </HeroModal.Footer>
        </HeroModal>

        {/* UNSAVED CART MODAL */}
        <HeroModal
          isOpen={showUnsavedCartModal}
          onClose={() => { setShowUnsavedCartModal(false); setPendingUnsavedCartTargetTab(null); }}
          size="sm"
          zIndex={60}
        >
          <HeroModal.Header className="pb-3 border-b border-divider/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-warning/10 text-warning shrink-0 border border-warning/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Unsaved Checkout Warning</h3>
                <p className="text-[10px] text-warning font-bold uppercase tracking-wider">Active Transaction Guard</p>
              </div>
            </div>
          </HeroModal.Header>

          <HeroModal.Body className="py-4 space-y-2">
            <p className="text-xs text-default-500 font-medium leading-relaxed">
              Are you sure you want to leave this site? Changes you made may not be saved.
            </p>
            <p className="text-xs text-default-500 font-medium leading-relaxed">
              Leaving the ERP OS terminal now will disrupt the current active customer checkout session and clear the basket.
            </p>
          </HeroModal.Body>

          <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/20">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={() => { setShowUnsavedCartModal(false); setPendingUnsavedCartTargetTab(null); }}
              className="font-bold text-xs"
            >
              Cancel, Keep Basket
            </HeroButton>
            <HeroButton
              type="button"
              variant="solid"
              color="warning"
              size="sm"
              onClick={() => {
                setShowUnsavedCartModal(false);
                if (pendingUnsavedCartTargetTab) handleSmoothTabChange(pendingUnsavedCartTargetTab);
                setPendingUnsavedCartTargetTab(null);
              }}
              className="font-black text-xs uppercase tracking-wider text-black"
            >
              Yes, Leave Mode
            </HeroButton>
          </HeroModal.Footer>
        </HeroModal>

        {/* DATABASE BACKUP & MAINTENANCE MODAL */}
        <HeroModal
          isOpen={showBackupModal}
          onClose={() => { setShowBackupModal(false); setBackupSuccessMsg(null); setBackupErrorMsg(null); setManualSnapshotName(""); }}
          size="2xl"
          zIndex={60}
        >
          <HeroModal.Header className="pb-4 border-b border-divider/15">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-success/10 text-success rounded-2xl">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  Database Core Management
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${dbSyncStatus === "syncing" ? "bg-warning/20 text-warning" : "bg-success/10 text-success"}`}>
                    {dbSyncStatus === "syncing" ? "● Sync active" : "● Connected"}
                  </span>
                </h3>
                <p className="text-[10px] text-default-500 uppercase tracking-widest font-bold">
                  Disaster Recovery & Automated Backup Engine
                </p>
              </div>
            </div>
          </HeroModal.Header>

          <HeroModal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              <div className="flex border-b border-divider/10 my-4 p-1 bg-content1/50 rounded-xl">
                <button
                  onClick={() => setBackupActiveSubTab("scheduler")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${backupActiveSubTab === "scheduler" ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-default-500 hover:bg-primary/10 hover:text-primary"}`}
                >
                  Auto-Backup Configuration
                </button>
                <button
                  onClick={() => setBackupActiveSubTab("ledger")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${backupActiveSubTab === "ledger" ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-default-500 hover:bg-primary/10 hover:text-primary"}`}
                >
                  Recovery Ledger
                  <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full font-sans">
                    {dbSnapshots.length}
                  </span>
                </button>
                <button
                  onClick={() => setBackupActiveSubTab("import-export")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${backupActiveSubTab === "import-export" ? "bg-primary text-primary-foreground shadow-sm font-black" : "text-default-500 hover:bg-primary/10 hover:text-primary"}`}
                >
                  Offline Backups & JSON
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh]">
                {backupActiveSubTab === "scheduler" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-extrabold text-primary uppercase text-[10px] tracking-wide">
                          Optimization Status
                        </div>
                        <div className="text-zinc-400 mt-1 font-sans">
                          Debounce cache buffer operates at{" "}
                          <span className="font-bold text-foreground">{debounceDelay}ms</span>.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-extrabold">{writeStatsCount.toLocaleString()}</div>
                        <div className="text-[9px] text-zinc-500 uppercase mt-0.5">Database Writes Saved</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-divider/20 p-4 space-y-4 bg-content1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">Automatic Background Scheduler</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">Hourly Data Preservation</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">Protect inventory journals and sales invoices against localStorage eviction.</div>
                        </div>
                        <button
                          type="button"
                          disabled={currentUser?.role !== UserRole.ADMIN}
                          onClick={() => {
                            if (currentUser?.role !== UserRole.ADMIN) {
                              showToastMsg("Access Denied: Admin authorization required.");
                              return;
                            }
                            setAutoBackupEnabled(!autoBackupEnabled);
                            showToastMsg(`Automated backup scheduler is now ${autoBackupEnabled ? "DISABLED" : "ENABLED"}`);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${autoBackupEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"}`}
                        >
                          {autoBackupEnabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-divider/10">
                        <div>
                          <div className="text-xs font-bold">Preservation Frequency Interval</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">Frequency for background state snapshots.</div>
                        </div>
                        <HeroDropdownSelect
                          isDisabled={currentUser?.role !== UserRole.ADMIN}
                          items={[
                            { key: '1', label: 'Every 1 Hour' },
                            { key: '3', label: 'Every 3 Hours' },
                            { key: '6', label: 'Every 6 Hours' },
                            { key: '12', label: 'Every 12 Hours' },
                            { key: '24', label: 'Every 24 Hours' },
                          ]}
                          selectedKey={String(backupIntervalHours)}
                          onSelectionChange={(val) => setBackupIntervalHours(Number(val))}
                          size="sm"
                          variant="pill"
                          className="min-w-[140px]"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-divider/20 p-4 space-y-4 bg-content1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                              Database Maintenance
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${dbMaintenanceEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                                {dbMaintenanceEnabled ? "● Active Idle Sweep" : "● Disabled"}
                              </span>
                            </h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              Daily index re-indexing and garbage collection sweep during idle periods to improve long-term system performance.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={currentUser?.role !== UserRole.ADMIN}
                          onClick={() => {
                            if (currentUser?.role !== UserRole.ADMIN) {
                              showToastMsg("Access Denied: Admin authorization required.");
                              return;
                            }
                            setDbMaintenanceEnabled(!dbMaintenanceEnabled);
                            showToastMsg(`Idle maintenance is now ${dbMaintenanceEnabled ? "DISABLED" : "ENABLED"}`);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${dbMaintenanceEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"}`}
                        >
                          {dbMaintenanceEnabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-divider/10">
                        <div>
                          <div className="text-xs font-bold">Last Database Sweep</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {lastMaintenanceTime ? new Date(lastMaintenanceTime).toLocaleString() : "Never executed on this client"}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isMaintenanceRunning}
                          onClick={async () => {
                            await runDatabaseMaintenance();
                            showToastMsg("Database re-indexed & maintenance completed!");
                          }}
                          className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          {isMaintenanceRunning ? "Optimizing..." : "Run Sweep Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {backupActiveSubTab === "ledger" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-divider/20 p-4 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">Instantiate Manual Backup Snapshot</h4>
                      <div className="flex gap-2 font-sans">
                        <input
                          type="text"
                          value={manualSnapshotName}
                          onChange={(e) => setManualSnapshotName(e.target.value)}
                          placeholder="Snapshot label (e.g. Pre-Audit Backup)"
                          className="flex-1 bg-content1 text-xs text-foreground border border-divider/30 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder-zinc-500 font-bold"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const name = manualSnapshotName.trim() || `Manual Snapshot ${new Date().toLocaleTimeString()}`;
                            await triggerSystemProcessing(`Generating Snapshot: ${name}...`, 1200, "db", undefined, "Dumping relational records to snapshot store...");
                            await createDbSnapshot(name);
                            setManualSnapshotName("");
                            showToastMsg(`Snapshot "${name}" generated successfully!`);
                          }}
                          className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shrink-0 shadow-md"
                        >
                          Create Snapshot
                        </button>
                      </div>
                    </div>

                    {dbSnapshots.length === 0 ? (
                      <div className="p-8 text-center bg-content1/40 rounded-2xl border border-dashed border-divider/20 space-y-2">
                        <HardDrive className="h-8 w-8 text-zinc-600 mx-auto" />
                        <p className="text-xs text-zinc-400 font-bold">No Database Snapshots Found</p>
                        <p className="text-[10px] text-zinc-500">Automated and manual snapshots will register here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                        {dbSnapshots.map((snap) => (
                          <div
                            key={snap.id}
                            className="p-3 bg-content1 hover:bg-primary/5 rounded-2xl border border-divider/15 flex items-center justify-between transition-all"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-black text-foreground">{snap.name}</div>
                              <div className="text-[9.5px] text-zinc-400 font-bold flex items-center gap-2 flex-wrap">
                                <span className="text-primary text-[10px]">{snap.creator}</span>
                                <span>•</span>
                                <span>{new Date(snap.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span className="text-zinc-500 bg-content1/55 px-1.5 rounded">
                                  {((snap.sizeBytes || 0) / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmRestoreSnap(snap)}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black uppercase rounded-lg border border-primary/20 cursor-pointer transition-all"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDbSnapshot(snap.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                                title="Delete Snapshot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {backupActiveSubTab === "import-export" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-divider/20 p-4 space-y-3 bg-content1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">Full Database JSON Export</h4>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Download a complete, offline snapshot containing all branch catalogs, member logs, transmittals, and historical sales transactions.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const dump = JSON.stringify(
                            {
                              version: "2.0",
                              timestamp: Date.now(),
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
                            },
                            null,
                            2
                          );
                          const filename = `tilepoint_full_backup_${Date.now()}.json`;
                          saveFileToBackup(dump, filename, "Database_Backups", "application/json")
                            .then((res) => {
                              showToastMsg(`Database backup exported to ${res.path || filename} successfully!`);
                            })
                            .catch(() => {
                              const blob = new Blob([dump], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.setAttribute("href", url);
                              a.setAttribute("download", filename);
                              a.style.display = "none";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              showToastMsg("Raw physical database JSON file downloaded successfully!");
                            });
                        }}
                        className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-extrabold uppercase tracking-wider rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="h-4 w-4" /> Export Complete Database JSON
                      </button>
                    </div>

                    <div className="rounded-2xl border border-divider/20 p-4 space-y-3 bg-content1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">Import Database Snapshot File</h4>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Upload a previously generated `.json` or `.backup` schema file to restore full database records.
                      </p>
                      <label className="w-full py-2.5 bg-background hover:bg-default-100 text-foreground text-xs font-extrabold uppercase tracking-wider rounded-xl border border-divider/20 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-primary" /> Select Backup JSON File
                        <input
                          type="file"
                          accept=".json,.backup"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              try {
                                const raw = event.target?.result as string;
                                const parsed = await verifyAndUnwrapBackup(raw);
                                if (!parsed || typeof parsed !== "object") {
                                  throw new Error("Invalid schema structure");
                                }
                                setBackupSuccessMsg("Database successfully imported! Reloading interface...");
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (err: any) {
                                setBackupErrorMsg(`ERROR: APPROVED FILE IS CORRUPTED OR INVALID SCHEMA: ${err.message}`);
                                showToastMsg("Import rejected due to structural validation faults.");
                              }
                            };
                            reader.readAsText(file);
                          }}
                        />
                      </label>
                    </div>

                    {backupSuccessMsg && (
                      <div className="p-3 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center">
                        {backupSuccessMsg}
                      </div>
                    )}
                    {backupErrorMsg && (
                      <div className="p-3 text-[10.5px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-xl text-center">
                        {backupErrorMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>

          </HeroModal.Body>

          <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/15">
            <HeroButton
              type="button"
              variant="solid"
              color="primary"
              size="sm"
              onClick={() => { setShowBackupModal(false); setBackupSuccessMsg(null); setBackupErrorMsg(null); setManualSnapshotName(""); }}
              className="font-bold text-xs uppercase tracking-wider"
            >
              Done
            </HeroButton>
          </HeroModal.Footer>
        </HeroModal>

        {/* ACCOUNT PROFILE & SECURITY CREDENTIALS MODAL */}
        <HeroModal
          isOpen={showAccountSettingsModal}
          onClose={() => {
            setCurrentPasswordInput("");
            setNewPasswordInput("");
            setConfirmPasswordInput("");
            setProfileModalError("");
            setShowAccountSettingsModal(false);
          }}
          size="md"
          zIndex={60}
        >
          <form onSubmit={handleSaveProfile} className="flex flex-col h-full overflow-hidden">
            <HeroModal.Header className="pb-4 border-b border-divider/15">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-warning/10 text-warning rounded-2xl">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-foreground">
                    Account Profile & Security
                  </h3>
                  <p className="text-[10px] text-default-500 uppercase tracking-widest font-bold">
                    Personal Credentials & Security Vault
                  </p>
                </div>
              </div>
            </HeroModal.Header>

            <HeroModal.Body className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2 text-default-400 text-xs select-none">@</span>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-background border border-divider/50 pl-7 pr-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-divider/15">
                <div className="text-[11px] font-black text-warning uppercase tracking-wider flex items-center gap-1 pl-1">
                  <span>Update Security Password (Optional)</span>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl pr-9 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-2 text-default-400 hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                    New Password (Min 6 Characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl pr-9 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2 text-default-400 hover:text-foreground cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-default-500 uppercase tracking-widest pl-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-background border border-divider/50 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="pt-1">
                {profileModalError ? (
                  <p className="text-[10px] font-bold text-danger px-1 leading-normal">
                    {profileModalError}
                  </p>
                ) : (
                  <p className="text-[10px] text-default-500 px-1 leading-normal font-medium">
                    Your account security credentials will be encrypted and updated securely.
                  </p>
                )}
              </div>

              {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER) && (
                <div className="pt-2 border-t border-divider/15">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountSettingsModal(false);
                      setShowSystemSettingsModal(true);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-content2/60 hover:bg-content2 border border-divider/30 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      <span>System Settings & Config</span>
                    </div>
                    <span className="text-[10px] text-default-400 group-hover:text-foreground">Configure &rarr;</span>
                  </button>
                </div>
              )}
            </HeroModal.Body>

            <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/15">
              <HeroButton
                type="button"
                variant="flat"
                size="sm"
                onClick={() => {
                  setCurrentPasswordInput("");
                  setNewPasswordInput("");
                  setConfirmPasswordInput("");
                  setProfileModalError("");
                  setShowAccountSettingsModal(false);
                }}
                className="font-bold text-xs"
              >
                Cancel
              </HeroButton>
              <HeroButton
                type="submit"
                variant="solid"
                color="warning"
                size="sm"
                isLoading={isUpdatingProfile}
                loadingText="Updating..."
                className="font-bold text-xs uppercase tracking-wider text-black"
              >
                Update Password
              </HeroButton>
            </HeroModal.Footer>
          </form>
        </HeroModal>

        {/* SYSTEM SETTINGS MODAL */}
        <HeroModal
          isOpen={showSystemSettingsModal}
          onClose={() => setShowSystemSettingsModal(false)}
          size="4xl"
          zIndex={99999}
          className="max-h-[92vh]"
        >
          <div className="p-4 sm:p-6">
            <SystemSettingsModule
              darkMode={darkMode}
              setDarkMode={handleToggleDarkMode}
              followSystemTheme={followSystemTheme}
              setFollowSystemTheme={setFollowSystemTheme}
              isModal={true}
              onClose={() => setShowSystemSettingsModal(false)}
            />
          </div>
        </HeroModal>

        {/* SESSION SUPERSEDED & DURATION EXPIRY MODAL */}
        <HeroModal
          isOpen={!!sessionSupersededNotice}
          onClose={clearSessionNotice}
          size="sm"
          zIndex={999999}
          className="border border-danger/30 text-center"
        >
          <HeroModal.Body className="p-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-danger/15 border border-danger/30 flex items-center justify-center text-danger">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-foreground">Single Active Terminal Security Alert</h3>
              <p className="text-xs text-default-600 leading-relaxed font-medium text-left bg-content2/60 p-3.5 rounded-2xl border border-divider/25">
                {sessionSupersededNotice}
              </p>
            </div>
            <div className="pt-2">
              <HeroButton
                type="button"
                color="primary"
                variant="solid"
                size="md"
                onClick={clearSessionNotice}
                className="w-full font-bold text-xs"
              >
                Acknowledge & Sign In
              </HeroButton>
            </div>
          </HeroModal.Body>
        </HeroModal>

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
