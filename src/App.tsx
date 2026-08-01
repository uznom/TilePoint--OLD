/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { DbProvider, useDb, DbSnapshot } from "./context/DbContext";
import { UserRole, User } from "./types/db";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { SkeletalLoader } from "./components/SkeletalLoader";
import { LoginModule } from "./components/LoginModule";
import { SetupModule } from "./components/SetupModule";
import {
 createSaltedHash,
 formatHashToken,
 verifyPasswordWithToken,
} from "./lib/crypto";
import { verifyAndUnwrapBackup, saveFileToBackup } from "./lib/fileBackupHelper";

// Modular components imports
import { Dashboard } from "./components/Dashboard";
import { AdminProfitModule } from "./components/AdminProfitModule";
import { PosModule } from "./components/PosModule";
import { InventoryModule } from "./components/InventoryModule";
import { ProcurementModule } from "./components/ProcurementModule";
import { TransmittalModule } from "./components/TransmittalModule";
import { ShiftModule } from "./components/ShiftModule";
import { BranchModule } from "./components/BranchModule";
import { UsersModule } from "./components/UsersModule";
import { SystemSettingsModule } from "./components/SystemSettingsModule";
import { CalculatorModule } from "./components/CalculatorModule";
import { StaffPortal } from "./components/StaffPortal";
import AtposExtraModules from "./components/AtposExtraModules";
import { DeliveriesModule } from "./components/DeliveriesModule";
import { SalesTransmissionModule } from "./components/SalesTransmissionModule";
import { DailyReconciliationModule } from "./components/DailyReconciliationModule";
import { ReconciliationTransmissionModule } from "./components/ReconciliationTransmissionModule";
import { TutorialOnboarding } from "./components/TutorialOnboarding";
import { PrivacyAccessibilityHub } from "./components/PrivacyAccessibilityHub";
import { OnboardingSetupWizard } from "./components/OnboardingSetupWizard";
import { SystemLoadingOverlay } from "./components/SystemLoadingOverlay";
import { IdleScreen } from "./components/IdleScreen";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { DamageRegisterModule } from "./components/DamageRegisterModule";
import { MobilePcOnlyBlocker } from "./components/MobilePcOnlyBlocker";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { QuickModuleSwitcherModal } from "./components/QuickModuleSwitcherModal";

import {
 generateThemeFromSeed,
 applyM3ThemeToDOM,
 resetM3ThemeOverride,
} from "./lib/themeGenerator";

import {
 LayoutDashboard,
 ShoppingCart,
 Layers,
 FileText,
 Send,
 LockKeyhole,
 Building2,
 Users as UsersIcon,
 Calculator,
 Moon,
 Sun,
 User as LucideUser,
 Power,
 Package,
 Building,
 Menu,
 X,
 Sparkles,
 ChevronLeft,
 ChevronDown,
 ChevronRight,
 Database,
 History,
 Eye,
 EyeOff,
 RefreshCw,
 DollarSign,
 Truck,
 BookOpen,
 Accessibility,
 Shield,
 CalendarDays,
 Trash2,
 Download,
 Upload,
 Sliders,
 AlertTriangle,
 Palette,
 Settings,
 ShieldAlert,
 Smartphone,
 Clock,
} from "lucide-react";

// Flat list of All Submodules for global routing, role-mapping and mobile navigation anchors
const menuItems = [
 {
 id: "tutorials",
 name: "Operational Walkthrough",
 icon: BookOpen,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "dashboard",
 name: "Branch Dashboard",
 icon: LayoutDashboard,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "profit-analytics",
 name: "P&L Accounting Desk",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "pos",
 name: "ERP OS Checkout Mode",
 icon: ShoppingCart,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "shift",
 name: "Shift drawer",
 icon: LockKeyhole,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
 },
 {
 id: "calculator",
 name: "Tile Coverage Calc",
 icon: Calculator,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "branches",
 name: "Branches Profile",
 icon: Building2,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "users",
 name: "Employee Directory",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "system-settings",
 name: "System Settings",
 icon: Sliders,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 // ATPOS v2 Submodules
 {
 id: "inventory-stocks",
 name: "Catalog Stock Ledger",
 icon: Layers,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "inventory-adjustments",
 name: "Adjustments Logs",
 icon: Layers,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "inventory-transfer",
 name: "Stock Transfers",
 icon: Send,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-logistics",
 name: "Logistics Ledger & Heatmap",
 icon: Layers,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-import",
 name: "Migration & Import/Export Tool",
 icon: Layers,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "inventory-damage",
 name: "Broken & BOA Register",
 icon: AlertTriangle,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-expiry",
 name: "Shelf-Life & Expiry Calendar",
 icon: Clock,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-branch-prices",
 name: "Branch MSRP & SRP Suggestions",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 {
 id: "adjustments-void",
 name: "Search Voided Sales",
 icon: History,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "adjustments-return",
 name: "Search Returned Products",
 icon: RefreshCw,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },

 {
 id: "members-manage",
 name: "Manage Members",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "members-receivables",
 name: "Account Receivables",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "members-loyalty",
 name: "Member Loyalty Points",
 icon: Sparkles,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },

 {
 id: "expenses-add",
 name: "Add Expenses",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "expenses-search",
 name: "Search Expenses",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 {
 id: "suppliers-manage",
 name: "Manage Suppliers",
 icon: Building2,
 roles: [UserRole.ADMIN],
 },
 {
 id: "suppliers-credits",
 name: "Active Credits",
 icon: Building2,
 roles: [UserRole.ADMIN],
 },
 {
 id: "suppliers-calendar",
 name: "Payment Calendar",
 icon: CalendarDays,
 roles: [UserRole.ADMIN],
 },

 {
 id: "bir-xz",
 name: "Search X&Z Reading",
 icon: FileText,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "bir-summary",
 name: "BIR Summary Report",
 icon: FileText,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "reconciliation-transmission",
 name: "Reconciliation & Transmission",
 icon: RefreshCw,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "deliveries-panel",
 name: "Delivery Center",
 icon: Truck,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
];

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
 autoBackupEnabled,
 setAutoBackupEnabled,
 backupIntervalHours,
 setBackupIntervalHours,
 lastAutoBackupTime,
 setLastAutoBackupTime,
 triggerSystemProcessing,
 dbSyncStatus,
 writeStatsCount,
 resetWriteStats,
 forceSyncAll,
 debounceDelay,
 setDebounceDelay,
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
 serverConnected,
 lowPerformanceMode,
 setLowPerformanceMode,
 apiErrorState,
 clearServerErrorState,
 invalidateLocalCache,
 syncFromSharedServer,
 } = useDb();
 const showSaleRedDot = parkedSales.length > 0; const showDeliveriesRedDot = deliveries.some(d => d.status === 'Scheduled' || d.status === 'Packed' || d.status === 'Out For Delivery'); let showInventoryRedDot = false; try { const cached = localStorage.getItem("tp_batch_expirations"); if (cached) { const parsed = JSON.parse(cached); const today = new Date(); showInventoryRedDot = parsed.some((b: any) => { if (!b.expiryDate) return false; const exp = new Date(b.expiryDate); const diffTime = exp.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return diffDays <= 30; }); } else { showInventoryRedDot = true; } } catch (_) { showInventoryRedDot = true; } const showTransferRedDot = stockTransfers.some(t => { if (t.status !== 'Pending') return false; return t.fromBranchId !== t.toBranchId; }); const showExpiryRedDot = showInventoryRedDot; const initialSavedTabRef = useRef<string | null>(null);
 if (initialSavedTabRef.current === null && typeof window !== "undefined") {
 initialSavedTabRef.current =
 localStorage.getItem("tilepoint_active_tab") || "none";
 }

 const [activeTab, setActiveTab] = useState(() => {
 if (typeof window !== "undefined") {
 const savedTab = localStorage.getItem("tilepoint_active_tab");
 if (savedTab) return savedTab;
 }
 const isFirstTime =
 typeof window !== "undefined" &&
 localStorage.getItem("tp_first_login_done") !== "true";
 if (isFirstTime) return "tutorials";
 if (currentUser && currentUser.role === UserRole.CASHIER) {
 return "pos";
 }
 return "dashboard";
 });

 const [confirmRestoreSnap, setConfirmRestoreSnap] = useState<DbSnapshot | null>(null);

 const [previousTab, setPreviousTab] = useState("dashboard");
 const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
 const [isMobileViewport, setIsMobileViewport] = useState(false);
 const [developerBypassTabs, setDeveloperBypassTabs] = useState<string[]>([]);

 const [viewportBreakpoint, setViewportBreakpoint] = useState<"mobile" | "tablet" | "desktop" | "wide">("desktop");
 const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
 const [windowHeight, setWindowHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
 const [showBreakpointModal, setShowBreakpointModal] = useState(false);
 const [simulatedBreakpoint, setSimulatedBreakpoint] = useState<"none" | "mobile" | "tablet" | "desktop" | "wide">("none");

 useEffect(() => {
 const handleResize = () => {
 if (simulatedBreakpoint !== "none") return;
 const width = window.innerWidth;
 const height = window.innerHeight;
 setWindowWidth(width);
 setWindowHeight(height);
 setIsMobileViewport(width < 1024);
 
 if (width < 640) {
 setViewportBreakpoint("mobile");
 } else if (width < 1024) {
 setViewportBreakpoint("tablet");
 } else if (width < 1536) {
 setViewportBreakpoint("desktop");
 } else {
 setViewportBreakpoint("wide");
 }
 };
 handleResize();
 window.addEventListener("resize", handleResize);
 return () => window.removeEventListener("resize", handleResize);
 }, [simulatedBreakpoint]);

 useEffect(() => {
 if (simulatedBreakpoint !== "none") {
 if (simulatedBreakpoint === "mobile") {
 setWindowWidth(480);
 setWindowHeight(800);
 setIsMobileViewport(true);
 setViewportBreakpoint("mobile");
 } else if (simulatedBreakpoint === "tablet") {
 setWindowWidth(800);
 setWindowHeight(1024);
 setIsMobileViewport(true);
 setViewportBreakpoint("tablet");
 } else if (simulatedBreakpoint === "desktop") {
 setWindowWidth(1280);
 setWindowHeight(800);
 setIsMobileViewport(false);
 setViewportBreakpoint("desktop");
 } else if (simulatedBreakpoint === "wide") {
 setWindowWidth(1680);
 setWindowHeight(1050);
 setIsMobileViewport(false);
 setViewportBreakpoint("wide");
 }
 } else {
 const width = window.innerWidth;
 const height = window.innerHeight;
 setWindowWidth(width);
 setWindowHeight(height);
 setIsMobileViewport(width < 1024);
 if (width < 640) {
 setViewportBreakpoint("mobile");
 } else if (width < 1024) {
 setViewportBreakpoint("tablet");
 } else if (width < 1536) {
 setViewportBreakpoint("desktop");
 } else {
 setViewportBreakpoint("wide");
 }
 }
 }, [simulatedBreakpoint]);

 const showToastMsg = (msg: string, type: "success" | "info" | "error") => {
 showToast(msg);
 };

 useEffect(() => {
 if (activeTab) {
 localStorage.setItem("tilepoint_active_tab", activeTab);
 }
 if (activeTab !== "pos") {
 setPreviousTab(activeTab);
 }
 }, [activeTab]);

 // Dynamic automatic routing on login/identity-switch to ensure Admin sees dashboard first
 useEffect(() => {
 if (isLoggedIn && currentUser) {
 const savedTab =
 initialSavedTabRef.current && initialSavedTabRef.current !== "none"
 ? initialSavedTabRef.current
 : localStorage.getItem("tilepoint_active_tab");
 if (savedTab && savedTab !== "none") {
 const savedItem = menuItems.find((m) => m.id === savedTab);
 if (savedItem && savedItem.roles.includes(currentUser.role)) {
 setActiveTab(savedTab);
 return;
 }
 }
 const isFirstTime =
 typeof window !== "undefined" &&
 localStorage.getItem("tp_first_login_done") !== "true";
 if (isFirstTime) {
 setActiveTab("tutorials");
 localStorage.setItem("tp_first_login_done", "true");
 } else if (currentUser.role === UserRole.CASHIER) {
 setActiveTab("pos");
 } else if (
 currentUser.role === UserRole.ADMIN ||
 currentUser.role === UserRole.MANAGER
 ) {
 setActiveTab("dashboard");
 } else {
 setActiveTab("inventory-stocks");
 }
 }
 }, [isLoggedIn, currentUser?.id, currentUser?.role]);
 const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
 return localStorage.getItem("tilepoint_sidebar_expanded") !== "false";
 });

 const isSidebarMinimized = !isSidebarExpanded;
 const setIsSidebarMinimized = (val?: any) => {
 if (typeof val === "boolean") {
 setIsSidebarExpanded(!val);
 } else {
 setIsSidebarExpanded((prev) => !prev);
 }
 };
 const [isTabChanging, setIsTabChanging] = useState(false);
 const [percentProgress, setPercentProgress] = useState(0);

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

 // Handle manual dark mode toggling, disabling "follow system"
 const handleToggleDarkMode = (targetVal?: boolean) => {
 setFollowSystemTheme(false);
 if (targetVal !== undefined) {
 setDarkMode(targetVal);
 } else {
 setDarkMode((prev) => !prev);
 }
 };

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
 mediaQuery.addListener(handleChange);
 }

 setDarkMode(mediaQuery.matches);

 return () => {
 if (mediaQuery.removeEventListener) {
 mediaQuery.removeEventListener("change", handleChange);
 } else {
 mediaQuery.removeListener(handleChange);
 }
 };
 }, [followSystemTheme]);

 // Smoothly transition all elements when changing dark/light theme
 const isFirstThemeRender = React.useRef(true);
 useEffect(() => {
 if (isFirstThemeRender.current) {
 isFirstThemeRender.current = false;
 return;
 }
 if (
 document.documentElement.classList.contains("accessibility-no-animation")
 ) {
 return;
 }
 document.documentElement.classList.add("theme-transition");
 const timer = setTimeout(() => {
 document.documentElement.classList.remove("theme-transition");
 }, 1000);
 return () => clearTimeout(timer);
 }, [darkMode]);
 const [isSubMenuCollapsed, setIsSubMenuCollapsed] = useState(false);
 const [isSidebarProfileDropdownOpen, setIsSidebarProfileDropdownOpen] =
 useState(false);

 const [wasSidebarExpandedBeforeCheckout, setWasSidebarExpandedBeforeCheckout] = useState(false);
 const prevTabRef = useRef(activeTab);

 // Auto-minimize the sidebar when tab is ERP OS Mode (checkout mode) and restore when exiting
 useEffect(() => {
 const prevTab = prevTabRef.current;
 prevTabRef.current = activeTab;

 if (activeTab === "pos" && prevTab !== "pos") {
 // Entering checkout mode
 if (!isSidebarMinimized) {
 setWasSidebarExpandedBeforeCheckout(true);
 setIsSidebarMinimized(true);
 } else {
 setWasSidebarExpandedBeforeCheckout(false);
 }
 } else if (activeTab !== "pos" && prevTab === "pos") {
 // Exiting checkout mode
 if (wasSidebarExpandedBeforeCheckout) {
 setIsSidebarMinimized(false);
 setWasSidebarExpandedBeforeCheckout(false);
 }
 }
 }, [activeTab, isSidebarMinimized, wasSidebarExpandedBeforeCheckout]);
  // Auto-minimize the sidebar when a large modal or dialog is open in the DOM
  const [isModalActive, setIsModalActive] = useState(false);
  const wasSidebarExpandedBeforeModal = useRef(false);
  const isSidebarMinimizedRef = useRef(isSidebarMinimized);

  useEffect(() => {
    isSidebarMinimizedRef.current = isSidebarMinimized;
  }, [isSidebarMinimized]);

  useEffect(() => {
    const checkForModal = () => {
      const elements = document.querySelectorAll(
        '.fixed, [role="dialog"], [data-modal="true"], [id*="modal"], [class*="modal"], [class*="dialog"], [class*="backdrop"]'
      );
      let foundModal = false;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
        if (
          el.id === "sidebar-nav" ||
          el.id === "mobile-sidebar" ||
          el.closest("#sidebar-nav") ||
          el.closest("aside")
        ) {
          continue;
        }

        // Ignore small toast notifications, bottom alerts, floating action buttons
        if (
          el.classList.contains("animate-bounce") ||
          el.classList.contains("animate-slide-left") ||
          el.querySelector(".animate-bounce")
        ) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        // Ignore small toast popups (< 300px width AND < 150px height)
        if (rect.width < 300 && rect.height < 150) continue;

        // Ignore pure dropdown backdrops or tooltips without modal content
        if (el.childElementCount === 0 && !el.getAttribute("role") && !el.classList.contains("fixed")) {
          continue;
        }

        const isFixedCover =
          (el.classList.contains("fixed") || el.classList.contains("absolute")) &&
          (el.classList.contains("inset-0") || rect.width > 300) &&
          rect.height > 200;

        const hasModalCard = el.querySelector(
          '[role="dialog"], form, table, input, textarea, button, [class*="max-w-"], [class*="rounded-"], [class*="bg-"]'
        );
        const isDialogRole = el.getAttribute("role") === "dialog";
        const isModalDataAttr = el.getAttribute("data-modal") === "true";

        if (isFixedCover || isDialogRole || isModalDataAttr || hasModalCard) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
            foundModal = true;
            break;
          }
        }
      }

      setIsModalActive((prev) => (prev !== foundModal ? foundModal : prev));
    };

    checkForModal();

    const observer = new MutationObserver(() => {
      checkForModal();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "role", "data-modal"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isModalActive) {
      if (!isSidebarMinimizedRef.current) {
        wasSidebarExpandedBeforeModal.current = true;
        setIsSidebarMinimized(true);
      }
    } else {
      if (wasSidebarExpandedBeforeModal.current) {
        setIsSidebarMinimized(false);
        wasSidebarExpandedBeforeModal.current = false;
      }
    }
  }, [isModalActive]);

 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

 // ATPOS v2 Collapsible Folder States
 const [expandedFolders, setExpandedFolders] = useState<
 Record<string, boolean>
 >({
 inventory: true,
 sale: false,
 adjustments: false,
 members: false,
 expenses: false,
 supplier: false,
 bir: false,
 "admin-bi": false,
 "admin-org": false,
 "admin-data": false,
 });

 const toggleFolder = (folderId: string) => {
 setExpandedFolders((prev) => ({
 ...prev,
 [folderId]: !prev[folderId],
 }));
 };

 // Account settings states & Logout confirmatory dialogs
 const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
 const [colorContrast, setColorContrast] = useState<
 "default" | "medium" | "high"
 >(() => {
 return (
 (localStorage.getItem("tilepoint-color-contrast") as
 | "default"
 | "medium"
 | "high") || "medium"
 );
 });

 const [maximizeTextContrast, setMaximizeTextContrast] = useState<boolean>(
 () => {
 return (
 localStorage.getItem("tilepoint-maximize-text-contrast") === "true"
 );
 },
 );

 const [disableAnimations, setDisableAnimations] = useState(() => {
 return localStorage.getItem("tilepoint-disable-animations") === "true";
 });

 const [disableBlurs, setDisableBlurs] = useState(() => {
 return localStorage.getItem("tilepoint-disable-blurs") === "true";
 });

 useEffect(() => {
 const handleSync = () => {
 const contrast =
 (localStorage.getItem("tilepoint-color-contrast") as
 | "default"
 | "medium"
 | "high") || "medium";
 const maxText =
 localStorage.getItem("tilepoint-maximize-text-contrast") === "true";
 const savedSeed = localStorage.getItem("tilepoint_custom_theme_primary");
 const noAnim =
 localStorage.getItem("tilepoint-disable-animations") === "true";
 const noBlur = localStorage.getItem("tilepoint-disable-blurs") === "true";
 const textSize =
 (localStorage.getItem("tilepoint-text-size") as
 | "normal"
 | "large"
 | "xlarge") || "normal";
 const dyslexic =
 localStorage.getItem("tilepoint-dyslexic-font") === "true";
 const outlines =
 localStorage.getItem("tilepoint-enhanced-outlines") === "true";

 setColorContrast(contrast);
 setMaximizeTextContrast(maxText);
 setDisableAnimations(noAnim);
 setDisableBlurs(noBlur);

 // Apply the theme with latest contrast settings
 // If there is a saved custom seed, or if contrast is medium/high (even on the default sapphire theme), generate and apply the dynamic theme.
 if (savedSeed || contrast !== "default") {
 try {
 const activeSeed = savedSeed || "#155EEF";
 const scheme = generateThemeFromSeed(activeSeed, darkMode, contrast);
 applyM3ThemeToDOM(scheme);
 } catch (err) {
 console.error(
 "[M3 Dynamic Theme] Failed to apply color theme:",
 err,
 );
 }
 } else {
 resetM3ThemeOverride();
 }

 // Sync Font Size classes
 document.documentElement.classList.remove(
 "accessibility-large-text",
 "accessibility-xlarge-text"
 );
 if (textSize === "large") {
 document.documentElement.classList.add("accessibility-large-text");
 } else if (textSize === "xlarge") {
 document.documentElement.classList.add("accessibility-xlarge-text");
 }

 // Sync Dyslexic Font class
 if (dyslexic) {
 document.documentElement.classList.add("accessibility-dyslexic-font");
 } else {
 document.documentElement.classList.remove("accessibility-dyslexic-font");
 }

 // Sync Enhanced Outlines class
 if (outlines) {
 document.documentElement.classList.add("accessibility-enhanced-outlines");
 } else {
 document.documentElement.classList.remove("accessibility-enhanced-outlines");
 }

 // Sync CSS accessibility high contrast and maximize text contrast flag classes
 if (contrast === "high") {
 document.documentElement.classList.add("accessibility-high-contrast");
 } else {
 document.documentElement.classList.remove(
 "accessibility-high-contrast",
 );
 }

 if (maxText) {
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

 if (noBlur) {
 document.documentElement.classList.add("accessibility-no-blur");
 } else {
 document.documentElement.classList.remove("accessibility-no-blur");
 }
 };
 window.addEventListener("tilepoint-theme-updated", handleSync);
 handleSync();
 return () => {
 window.removeEventListener("tilepoint-theme-updated", handleSync);
 };
 }, [darkMode]);

 useEffect(() => {
 if (lowPerformanceMode) {
 document.documentElement.classList.add("accessibility-no-blur");
 document.documentElement.classList.add("accessibility-no-animation");
 } else {
 const noAnim =
 localStorage.getItem("tilepoint-disable-animations") === "true";
 const noBlur = localStorage.getItem("tilepoint-disable-blurs") === "true";
 if (!noBlur)
 document.documentElement.classList.remove("accessibility-no-blur");
 if (!noAnim)
 document.documentElement.classList.remove("accessibility-no-animation");
 }
 }, [lowPerformanceMode]);

 const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
 const [showAccountSettingsModal, setShowAccountSettingsModal] =
 useState(false);
 const [showSetupWizard, setShowSetupWizard] = useState(false);
 const [showPosExitConfirmModal, setShowPosExitConfirmModal] = useState(false);
 const [showQuickSwitcherModal, setShowQuickSwitcherModal] = useState(false);
 const [pendingTabId, setPendingTabId] = useState<string | null>(null);



 useEffect(() => {
 const handleOpenWizard = () => {
 setShowSetupWizard(true);
 };
 window.addEventListener("open-setup-wizard", handleOpenWizard);
 return () => {
 window.removeEventListener("open-setup-wizard", handleOpenWizard);
 };
 }, []);

 const [isCompactColumns, setIsCompactColumns] = useState<boolean>(() => {
 const saved = localStorage.getItem("tilepoint_compact_columns");
 return saved !== "false";
 });

 const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
 const saved = localStorage.getItem("tilepoint_sidebar_hidden");
 return saved === "true";
 });

 useEffect(() => {
 localStorage.setItem("tilepoint_compact_columns", String(isCompactColumns));
 }, [isCompactColumns]);

 useEffect(() => {
 localStorage.setItem("tilepoint_sidebar_hidden", String(isSidebarHidden));
 }, [isSidebarHidden]);

 const [showDatabaseCoreModal, setShowDatabaseCoreModal] = useState(false);
 const [dbCoreTab, setDbCoreTab] = useState<
 "scheduler" | "ledger" | "import-export"
 >("scheduler");
 const [manualSnapshotName, setManualSnapshotName] = useState("");
 const [deleteSnapshotConfirm, setDeleteSnapshotConfirm] = useState<{ [snapId: string]: number }>({});
 const [clearAllConfirm, setClearAllConfirm] = useState<number>(0);
 const [dbBackupFileMessage, setDbBackupFileMessage] = useState<string | null>(
 null,
 );
 const [dbBackupFileError, setDbBackupFileError] = useState<string | null>(
 null,
 );
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 // Password reset/update form localized states
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [showCurrentPassword, setShowCurrentPassword] = useState(false);
 const [showNewPassword, setShowNewPassword] = useState(false);
 const [settingsError, setSettingsError] = useState("");
 const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

 // Profile customisation edit states
 const [editFullName, setEditFullName] = useState("");
 const [editUsername, setEditUsername] = useState("");
 const [editProfilePicture, setEditProfilePicture] = useState("");

 useEffect(() => {
 if (showAccountSettingsModal && currentUser) {
 setEditFullName(currentUser.fullName);
 setEditUsername(currentUser.username);
 setEditProfilePicture(currentUser.profilePicture || "");
 }
 }, [showAccountSettingsModal, currentUser]);

  useEffect(() => {
  const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (
  isAccountDropdownOpen &&
  !target.closest("#account-dropdown-container") &&
  !target.closest("#account-dropdown-trigger")
  ) {
  setIsAccountDropdownOpen(false);
  }
  if (
  isSidebarProfileDropdownOpen &&
  !target.closest("#sidebar-profile-dropdown-container") &&
  !target.closest("#sidebar-profile-dropdown-trigger")
  ) {
  setIsSidebarProfileDropdownOpen(false);
  }
  };

  if (isAccountDropdownOpen || isSidebarProfileDropdownOpen) {
  document.addEventListener("mousedown", handleOutsideClick);
  document.addEventListener("touchstart", handleOutsideClick);
  }

  return () => {
  document.removeEventListener("mousedown", handleOutsideClick);
  document.removeEventListener("touchstart", handleOutsideClick);
  };
  }, [isAccountDropdownOpen, isSidebarProfileDropdownOpen]);

 const showToast = (msg: string) => {
 setToastMessage(msg);
 setTimeout(() => {
 setToastMessage(null);
 }, 4000);
 };

 const proceedWithTabChange = (tabId: string) => {
 if (disableAnimations || lowPerformanceMode) {
 setActiveTab(tabId);
 setIsTabChanging(false);
 setPercentProgress(0);
 return;
 }

 setIsTabChanging(true);
 setPercentProgress(15);

 // Simulate progression loader
 const interval = setInterval(() => {
 setPercentProgress((prev) => {
 if (prev >= 90) {
 clearInterval(interval);
 return 90;
 }
 return prev + 18;
 });
 }, 60);

 setTimeout(() => {
 clearInterval(interval);
 setPercentProgress(100);
 setActiveTab(tabId);
 setTimeout(() => {
 setIsTabChanging(false);
 setPercentProgress(0);
 }, 100);
 }, 400);
 };

 // Tab change simulator timer with active linear progress
 const changeTab = (tabId: string) => {
 if (tabId === activeTab) return;

 // Safety role clearance checker
 const targetItem = menuItems.find((item) => item.id === tabId);
 if (targetItem && currentUser && !targetItem.roles.includes(currentUser.role)) {
 return;
 }

 // INTERCEPT ACTIVE ERP OS CHECKOUT EXIT: If we are in 'pos' and there is an active checkout (cart contains items), auto-hold/park the current order and clear the cart.
 if (activeTab === "pos") {
 const activeCartRaw = localStorage.getItem("tp_active_cart");
 if (activeCartRaw) {
 try {
 const parsedCart = JSON.parse(activeCartRaw);
 if (Array.isArray(parsedCart) && parsedCart.length > 0) {
 const customerName = localStorage.getItem("tp_active_customer_name") || "Walk-in Customer";
 const customerNotes = localStorage.getItem("tp_active_customer_notes") || "";
 // Auto hold current order!
 holdSale(parsedCart, customerName, customerNotes);
 
 // Clear current cart so that POS is closed & reset
 localStorage.setItem("tp_active_cart", JSON.stringify([]));
 localStorage.setItem("tp_active_customer_name", "Walk-in Customer");
 localStorage.setItem("tp_active_customer_notes", "");
 
 showToast("Active transaction automatically held in safe hold registers.");
 }
 } catch (_) {
 // ignore
 }
 }
 }

 proceedWithTabChange(tabId);
 };


 useEffect(() => {
 const handleStorageFailure = (e: Event) => {
 const customEvent = e as CustomEvent;
 const message = customEvent.detail?.message || "Local storage full. Transaction not saved to drive!";
 showToast(message);
 };

 window.addEventListener("tp_storage_failure", handleStorageFailure);
 return () => {
 window.removeEventListener("tp_storage_failure", handleStorageFailure);
 };
 }, []);

 // Immersive ERP OS terminal distraction-free mode state
 const [showImmersiveControls, setShowImmersiveControls] = useState(true);

 useEffect(() => {
 setShowImmersiveControls(true);
 }, [activeTab]);

 // Global Keyboard Shortcut Listener for Cashiers & Managers (Ctrl+1..0 module switcher & Ctrl+K palette)
 useEffect(() => {
 const handleGlobalKeyboardShortcuts = (e: KeyboardEvent) => {
 // Do not block F12 or browser DevTools
 if (e.key === "F12") return;

 const isModifier = e.ctrlKey || e.metaKey || e.altKey;

 // Toggle Command Palette Quick Switcher Modal: Ctrl+K / Cmd+K / Ctrl+/ / Alt+/
 if (isModifier && (e.key.toLowerCase() === "k" || e.key === "/")) {
 e.preventDefault();
 setShowQuickSwitcherModal((prev) => !prev);
 return;
 }

 // Module Jump Map for Ctrl+1 through Ctrl+9 and Ctrl+0
 const numberShortcutMap: { [key: string]: { id: string; label: string } } = {
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

 if (isModifier && numberShortcutMap[e.key]) {
 e.preventDefault();
 const target = numberShortcutMap[e.key];
 
 // Verify RBAC permissions for the logged in user
 const masterItem = menuItems.find((m) => m.id === target.id);
 if (masterItem && currentUser && !masterItem.roles.includes(currentUser.role)) {
 showToast(`Shortcut [Ctrl+${e.key}]: Access restricted for ${currentUser.role} role.`);
 return;
 }

 changeTab(target.id);
 showToast(`Switched to ${target.label} [Ctrl+${e.key}]`);
 }
 };

 window.addEventListener("keydown", handleGlobalKeyboardShortcuts);
 return () => window.removeEventListener("keydown", handleGlobalKeyboardShortcuts);
 }, [currentUser?.role, activeTab]);

 const handleUpdatePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setSettingsError("");
 setIsUpdatingPassword(true);

 try {
 let passwordUpdates: Partial<User> = {};

 // Parse password updates if any of the fields are populated
 if (currentPassword || newPassword || confirmPassword) {
 if (!currentPassword || !newPassword || !confirmPassword) {
 setSettingsError(
 "To change password, please fill out all password fields.",
 );
 setIsUpdatingPassword(false);
 return;
 }

 // Verify current password match using our PBKDF2 hash
 const isMatch = await verifyPasswordWithToken(
 currentPassword,
 currentUser.passwordHash || "",
 );
 if (!isMatch) {
 setSettingsError(
 "Verification Failed: Current password is incorrect.",
 );
 setIsUpdatingPassword(false);
 return;
 }

 if (newPassword.length < 6) {
 setSettingsError(
 "Security Policy: New password must be at least 6 characters.",
 );
 setIsUpdatingPassword(false);
 return;
 }

 if (newPassword !== confirmPassword) {
 setSettingsError("Confirmation Error: New passwords do not match.");
 setIsUpdatingPassword(false);
 return;
 }

 // Create new salted PBKDF2 bcrypt hash token
 const salt = (editUsername || currentUser.username) + "_salt_tok";
 const hashedVal = await createSaltedHash(newPassword, salt, 2500);
 const formattedToken = formatHashToken(salt, hashedVal, 2500);
 passwordUpdates.passwordHash = formattedToken;
 }

 // Check name/username validations
 if (!editFullName.trim()) {
 setSettingsError("Validation Error: Full Name is required.");
 setIsUpdatingPassword(false);
 return;
 }

 if (!editUsername.trim()) {
 setSettingsError("Validation Error: Username is required.");
 setIsUpdatingPassword(false);
 return;
 }

 const cleanUsername = editUsername
 .trim()
 .toLowerCase()
 .replace(/[^a-z0-9_]/g, "");

 // Recalculate initials
 const newInitials =
 editFullName
 .split(" ")
 .map((n) => (n ? n[0] : ""))
 .join("")
 .toUpperCase()
 .slice(0, 2) || "AD";

 // Combine general updates
 const generalUpdates: Partial<User> = {
 fullName: editFullName.trim(),
 username: cleanUsername,
 profilePicture: editProfilePicture || undefined,
 avatarInitials: newInitials,
 ...passwordUpdates,
 };

 // Mutate database structure states
 updateUser(currentUser.id, generalUpdates);
 updateCurrentUser(generalUpdates);

 // Clean success flow
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setShowCurrentPassword(false);
 setShowNewPassword(false);
 setShowAccountSettingsModal(false);
 showToast("Account details successfully updated!");
 } catch (err) {
 console.error(err);
 setSettingsError("Dynamic crypt engine error: unable to update profile.");
 } finally {
 setIsUpdatingPassword(false);
 }
 };

 useEffect(() => {
 localStorage.setItem("tilepoint_dark_theme", String(darkMode));
 if (darkMode) {
 document.documentElement.classList.add("dark");
 } else {
 document.documentElement.classList.remove("dark");
 }

 // Auto-apply saved custom dynamic M3 theme color seed if exists
 const savedSeed = localStorage.getItem("tilepoint_custom_theme_primary");
 if (savedSeed) {
 try {
 const contrast =
 (localStorage.getItem("tilepoint-color-contrast") as
 | "default"
 | "medium"
 | "high") || "medium";
 const scheme = generateThemeFromSeed(savedSeed, darkMode, contrast);
 applyM3ThemeToDOM(scheme);
 } catch (err) {
 console.error(
 "[M3 Dynamic Theme] Failed to auto-apply saved color theme:",
 err,
 );
 }
 } else {
 resetM3ThemeOverride();
 }
 }, [darkMode]);

 if (isHydrating || isSystemHydrating) {
 return (
 <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 z-[9999] select-none text-center">
 <div className="w-full max-w-md space-y-6">
 <div className="flex justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-m3-primary" />
 </div>
 <div className="space-y-2">
 <h2 className="text-sm font-black text-white tracking-widest uppercase font-mono">
 TilePoint Secure Core
 </h2>
 <p className="text-xs text-zinc-400 font-medium">
 Resolving decentralized offline database states...
 </p>
 </div>
 <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
 <div className="h-4 bg-zinc-800 rounded-lg animate-pulse w-3/4" />
 <div className="h-3 bg-zinc-800/60 rounded-lg animate-pulse w-5/6" />
 <div className="h-3 bg-zinc-800/40 rounded-lg animate-pulse w-2/3" />
 </div>
 </div>
 </div>
 );
 }

 if (!isConfigured) {
 return (
 <>
 <SetupModule />
 </>
 );
 }

 if (!isLoggedIn || !currentUser) {
 return (
 <>
 <LoginModule />
 </>
 );
 }

 const isEmployee = currentUser && (currentUser.role === UserRole.STAFF || currentUser.role === UserRole.CASHIER);
 const isOnboarded =
 isEmployee ||
 (typeof window !== "undefined" &&
 localStorage.getItem("tilepoint_onboarded_setup") === "true");

 if (!isOnboarded) {
 return (
 <>
 <OnboardingSetupWizard />
 <PrivacyAccessibilityHub darkMode={darkMode} />
 </>
 );
 }

 if (currentUser.role === UserRole.STAFF) {
 return (
 <>
 <StaffPortal darkMode={darkMode} setDarkMode={setDarkMode} />
 <PrivacyAccessibilityHub
 darkMode={darkMode}
 hideFloatingButton={true}
 />
 </>
 );
 }

 // Flat list of All Submodules for global routing, role-mapping and mobile navigation anchors
 const _unusedMenuItems = [
 {
 id: "tutorials",
 name: "Operational Walkthrough",
 icon: BookOpen,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "dashboard",
 name: "Branch Dashboard",
 icon: LayoutDashboard,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "profit-analytics",
 name: "P&L Accounting Desk",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "pos",
 name: "ERP OS Checkout Mode",
 icon: ShoppingCart,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "shift",
 name: "Shift drawer",
 icon: LockKeyhole,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
 },
 {
 id: "calculator",
 name: "Tile Coverage Calc",
 icon: Calculator,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "branches",
 name: "Branches Profile",
 icon: Building2,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "users",
 name: "Employee Directory",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "system-settings",
 name: "System Settings",
 icon: Sliders,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 // ATPOS v2 Submodules
 {
 id: "inventory-stocks",
 name: "Catalog Stock Ledger",
 icon: Layers,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "inventory-adjustments",
 name: "Adjustments Logs",
 icon: Layers,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 {
 id: "inventory-transfer",
 name: "Stock Transfers",
 icon: Send,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-logistics",
 name: "Logistics Ledger & Heatmap",
 icon: Layers,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-import",
 name: "Migration & Import/Export Tool",
 icon: Layers,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "inventory-damage",
 name: "Broken & BOA Register",
 icon: AlertTriangle,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-expiry",
 name: "Shelf-Life & Expiry Calendar",
 icon: Clock,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "inventory-branch-prices",
 name: "Branch MSRP & SRP Suggestions",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 {
 id: "adjustments-void",
 name: "Search Voided Sales",
 icon: History,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "adjustments-return",
 name: "Search Returned Products",
 icon: RefreshCw,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },

 {
 id: "members-manage",
 name: "Manage Members",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },
 {
 id: "members-receivables",
 name: "Account Receivables",
 icon: UsersIcon,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "members-loyalty",
 name: "Member Loyalty Points",
 icon: Sparkles,
 roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
 },

 {
 id: "expenses-add",
 name: "Add Expenses",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "expenses-search",
 name: "Search Expenses",
 icon: DollarSign,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },

 {
 id: "suppliers-manage",
 name: "Manage Suppliers",
 icon: Building2,
 roles: [UserRole.ADMIN],
 },
 {
 id: "suppliers-credits",
 name: "Active Credits",
 icon: Building2,
 roles: [UserRole.ADMIN],
 },
 {
 id: "suppliers-calendar",
 name: "Payment Calendar",
 icon: CalendarDays,
 roles: [UserRole.ADMIN],
 },

 {
 id: "bir-xz",
 name: "Search X&Z Reading",
 icon: FileText,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "bir-summary",
 name: "BIR Summary Report",
 icon: FileText,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "reconciliation-transmission",
 name: "Reconciliation & Transmission",
 icon: RefreshCw,
 roles: [UserRole.ADMIN, UserRole.MANAGER],
 },
 {
 id: "deliveries-panel",
 name: "Delivery Center",
 icon: Truck,
 roles: [
 UserRole.ADMIN,
 UserRole.MANAGER,
 UserRole.CASHIER,
 UserRole.STAFF,
 ],
 },
 ];

 // ATPOS v2 Directory Hierarchical Folders
 const sidebarCategoryTree = [
 {
 id: "sale",
 name: "Sale",
 icon: ShoppingCart,
 subItems: [
 { id: "pos", name: "ERP OS Checkout Mode" },
 ],
 },
 {
 id: "inventory",
 name: "Inventory",
 icon: Layers,
 subItems: [
 { id: "inventory-stocks", name: "Catalog Stock Ledger" },
 { id: "inventory-adjustments", name: "Adjustments Logs" },
 { id: "inventory-transfer", name: "Stock Transfers" },
 { id: "inventory-logistics", name: "Logistics Ledger & Heatmap" },
 { id: "inventory-import", name: "Migration & Import/Export Tool" },
 { id: "inventory-damage", name: "Broken & BOA Register" },
 { id: "inventory-expiry", name: "Shelf-Life & Expiry Calendar" },
 { id: "inventory-branch-prices", name: "Branch MSRP & SRP Suggestions" },
 ],
 },
 {
 id: "bir",
 name: "BIR & Sales Transmission",
 icon: FileText,
 subItems: [
 { id: "reconciliation-transmission", name: "Reconciliation & Transmission" },
 { id: "bir-xz", name: "Search X&Z Reading" },
 { id: "bir-summary", name: "BIR Summary Report" },
 ],
 },
 {
 id: "deliveries",
 name: "Cargo Deliveries",
 icon: Truck,
 subItems: [{ id: "deliveries-panel", name: "Delivery Center" }],
 },
 {
 id: "members",
 name: "Members",
 icon: UsersIcon,
 subItems: [
 { id: "members-manage", name: "Manage Members" },
 { id: "members-receivables", name: "Account Receivables" },
 { id: "members-loyalty", name: "Member Loyalty Points" },
 ],
 },
 {
 id: "supplier",
 name: "Supplier",
 icon: Building2,
 subItems: [
 { id: "suppliers-manage", name: "Manage Suppliers" },
 { id: "suppliers-credits", name: "Active Credits" },
 { id: "suppliers-calendar", name: "Payment Calendar" },
 ],
 },
 {
 id: "expenses",
 name: "Expenses",
 icon: DollarSign,
 subItems: [
 { id: "expenses-add", name: "Add Expenses" },
 { id: "expenses-search", name: "Search Expenses" },
 ],
 },
 {
 id: "adjustments",
 name: "Sale Adjustments",
 icon: RefreshCw,
 subItems: [
 { id: "adjustments-void", name: "Search Voided Sales" },
 { id: "adjustments-return", name: "Search Returned Products" },
 ],
 },
 {
 id: "admin-bi",
 name: "Business Intelligence",
 icon: LayoutDashboard,
 subItems: [
 { id: "dashboard", name: "Branch Dashboard" },
 { id: "profit-analytics", name: "P&L Accounting Desk" },
 ],
 },
 {
 id: "admin-org",
 name: "Staff & Settings",
 icon: UsersIcon,
 subItems: [
 { id: "branches", name: "Branches Profile" },
 { id: "users", name: "Employee Directory" },
 { id: "system-settings", name: "System Settings" },
 ],
 },
 ];

 const getBranchName = (id: string | null) => {
 if (!id || id === "B1" || id === "main") {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 }
 const b = branches.find((br) => br.id === id);
 if (!b) {
 const stored = localStorage.getItem("tilepoint_company_name_v1");
 if (stored) return stored;
 return "ETC_DIPOLOG MAIN";
 }
 return b.name;
 };

 const currentCategory = sidebarCategoryTree.find(
 (cat) =>
 cat.subItems.some((sub) => sub.id === activeTab) ||
 cat.id === activeTab,
 );
 const isInventoryCategory = currentCategory?.id === "inventory";

 return (
 <MotionConfig 
 reducedMotion={(disableAnimations || lowPerformanceMode) ? "always" : "never"}
 transition={{
 type: "spring",
 stiffness: 300,
 damping: 30,
 mass: 0.6,
 restDelta: 0.001,
 restSpeed: 0.001
 }}
 >
 {/* FIXED: STRETCH-PROOING COMPONENT CORE WITH ABSOLUTE VIEWPORT CONSTRAINTS */}
 <div
 className={`h-screen max-h-screen w-screen overflow-hidden flex flex-col font-sans transition-all duration-300 relative ${
 darkMode
 ? "dark bg-m3-surface text-m3-on-surface"
 : "bg-m3-surface text-m3-on-surface"
 }`}
 >
 {/* Dynamic Ambient Background Color Accent Glow using core M3 primary color token */}
 <div className="absolute top-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-m3-primary/[0.04] dark:bg-m3-primary/[0.07] blur-[130px] pointer-events-none z-0 transition-colors duration-500" />
 <div className="absolute bottom-[-10%] left-[-10%] w-[48vw] h-[48vw] rounded-full bg-m3-primary/[0.03] dark:bg-m3-primary/[0.05] blur-[110px] pointer-events-none z-0 transition-colors duration-500" />

 {/* GLOBAL STATUS CODE ERROR OVERLAYS & ACTIONS */}
 {apiErrorState && (
 <div className="fixed inset-x-0 top-0 z-[60] bg-m3-surface-container/95 backdrop-blur-md border-b border-m3-outline-variant/35 shadow-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-xl ${
 apiErrorState.statusCode === 429 
 ? "bg-amber-500/10 text-amber-500" 
 : apiErrorState.statusCode === 403 
 ? "bg-red-500/10 text-red-500" 
 : "bg-red-500/10 text-red-500"
 }`}>
 {apiErrorState.statusCode === 429 ? (
 <AlertTriangle className="w-5 h-5 animate-pulse" />
 ) : (
 <ShieldAlert className="w-5 h-5" />
 )}
 </div>
 <div className="text-left">
 <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 text-m3-on-surface">
 <span>System Response Indicator: HTTP {apiErrorState.statusCode}</span>
 {apiErrorState.statusCode === 429 && (
 <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
 COOL-DOWN ACTIVE
 </span>
 )}
 </h4>
 <p className="text-xs text-m3-on-surface-variant mt-0.5 max-w-2xl leading-relaxed">
 {apiErrorState.message}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
 {apiErrorState.statusCode === 429 ? (
 <div className="bg-amber-500/15 border border-amber-500/35 text-amber-500 rounded-lg px-3 py-1.5 text-xs font-mono font-medium flex items-center gap-2">
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
 className="flex items-center gap-2 bg-m3-primary text-m3-on-primary hover:bg-m3-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Retry Connection
 </button>
 <button
 onClick={clearServerErrorState}
 className="border border-m3-outline hover:bg-m3-surface-variant text-m3-on-surface text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
 >
 Use Offline Fallback
 </button>
 </>
 ) : (
 <button
 onClick={clearServerErrorState}
 className="bg-m3-primary text-m3-on-primary hover:bg-m3-primary-hover active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-xl shadow-md cursor-pointer"
 >
 Dismiss Warning
 </button>
 )}
 </div>
 </div>
 )}

 {/* TOP LINEAR HIGH-VIS PROGRESS BAR */}
 {percentProgress > 0 && (
 <div
 className="fixed top-0 left-0 h-1 bg-gradient-to-r from-m3-primary to-amber-500 lod-progress z-50 transition-all duration-[80ms]"
 style={{ width: `${percentProgress}%` }}
 />
 )}

 {/* HEADER SECTION with custom horizontal glowing accent bar & ambient overlay tint */}
 <header
 className={`py-4 px-6 border-b border-m3-outline-variant/15 flex justify-between items-center android-glass-header shadow-sm bg-m3-surface/75 dark:bg-m3-surface-low/80 backdrop-blur-md transition-all duration-300 overflow-visible md:hidden ${
 isAccountDropdownOpen ? "z-[9999]" : "z-[35]"
 } ${
 activeTab === "pos"
 ? `sticky top-0 md:fixed md:top-0 md:left-0 md:right-0 md:transform ${showImmersiveControls ? "md:translate-y-0 md:opacity-100 md:shadow-xl" : "md:-translate-y-full md:opacity-0 md:pointer-events-none"}`
 : "sticky top-0"
 }`}
 >
 {/* Subtle header brand overlay reflecting user custom color choice */}
 <div className="absolute inset-0 bg-gradient-to-b from-m3-primary/[0.03] to-transparent pointer-events-none z-[-1]" />
 {/* Horizontal glowing accent line reflecting selected color */}
 <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-m3-primary/35 via-m3-primary/10 to-transparent pointer-events-none" />
 <div className="flex items-center gap-3">
 {/* Logo */}
 <div className="flex items-center gap-2.5">
 <img
 src="/icon.svg"
 alt="TilePoint Favicon Logo"
 className="h-9 w-9 rounded-lg"
 referrerPolicy="no-referrer"
 />
 <div>
 <h1 className="text-base font-bold tracking-wide leading-none uppercase font-sans text-m3-primary">
 TilePoint
 </h1>
 <span className="text-[9px] text-m3-on-surface-variant font-bold block uppercase mt-0.5 tracking-widest leading-none">
 HQ ERP OS
 </span>
 </div>
 </div>

 {/* Branch tag indicator */}
 <span className="hidden sm:inline-block px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-m3-secondary-container text-m3-on-secondary-container border border-m3-outline-variant/40">
 {getBranchName(currentUser.branchAssignmentId)}
 </span>
 </div>

 {/* Right side controls with Dropdown Menu following strict user intent */}
 <div className="flex items-center gap-3 relative">


 <div className="relative animate-fade-in">
 <button
 id="account-dropdown-trigger"
 onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
 className="flex items-center gap-2 md:gap-3 p-1.5 pr-3 rounded-xl border border-m3-outline-variant/40 hover:bg-m3-primary/5 transition-all cursor-pointer text-left focus:outline-none bg-m3-surface-low select-none active:scale-[0.98]"
 >
 <div className="h-8 w-8 rounded-xl bg-m3-primary font-black text-xs items-center justify-center flex text-m3-on-primary shadow-sm m3-shape-asymmetric relative overflow-hidden">
 {(() => {
 const isErica =
 currentUser.fullName.toLowerCase().includes("erica") ||
 currentUser.username?.toLowerCase().includes("erica");
 if (isErica) {
 return "E";
 }

 const avatarSrc = currentUser.profilePicture || "";

 return (
 <>
 {avatarSrc ? (
 <img
 src={avatarSrc}
 alt={currentUser.fullName}
 className="h-full w-full object-cover"
 referrerPolicy="no-referrer"
 />
 ) : (
 currentUser.avatarInitials
 )}
 <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-m3-surface animate-pulse" />
 </>
 );
 })()}
 </div>
 <div className="hidden sm:block">
 <div className="text-xs font-extrabold leading-none text-m3-on-surface flex items-center gap-1">
 <span>{currentUser.fullName}</span>
 </div>
 <span className="text-[9px] text-m3-on-surface-variant font-mono capitalize leading-none font-medium block mt-0.5">
 {currentUser.role} Account
 </span>
 </div>
 <svg
 className={`h-3 w-3 text-m3-on-surface-variant transition-transform duration-200 ${isAccountDropdownOpen ? "rotate-180" : ""}`}
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth="2.5"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M19 9l-7 7-7-7"
 />
 </svg>
 </button>

 <AnimatePresence>
 {isAccountDropdownOpen && (
 <>
 {/* Backdrop overlay for dismissing dropdown on click-away */}
 <div
 className="fixed inset-0 z-[9998] bg-transparent"
 onClick={() => setIsAccountDropdownOpen(false)}
 />
 <motion.div
 id="account-dropdown-container"
 initial={{ opacity: 0, scale: 0.95, y: -8 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -8 }}
 transition={{ duration: 0.15, ease: "easeOut" }}
 className="absolute right-0 mt-2 w-56 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/40 text-m3-on-surface shadow-2xl z-[9999] p-2 space-y-1.5 font-sans"
 >
 <div className="px-3 py-2 border-b border-m3-outline-variant/15 bg-m3-surface-high/10 rounded-xl flex items-center justify-between">
 <div className="min-w-0 flex-1 pr-2">
 <div className="text-xs font-black text-m3-on-surface truncate">
 {currentUser.fullName}
 </div>
 <div className="text-[9.5px] text-zinc-400 font-mono font-bold mt-0.5 uppercase tracking-wider">
 {currentUser.role} Mode
 </div>
 </div>
 <button
 type="button"
 onClick={() => setIsAccountDropdownOpen(false)}
 className="p-1 rounded-lg text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-outline-variant/20 transition-colors cursor-pointer shrink-0"
 title="Close account menu"
 aria-label="Close account menu"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>

 {/* Dark / Light Toggle */}
 <button
 type="button"
 onClick={() => {
 handleToggleDarkMode();
 setIsAccountDropdownOpen(false);
 }}
 className="w-full flex items-center justify-between text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <div className="flex items-center gap-2">
 {darkMode ? (
 <Sun className="h-4 w-4 text-amber-500" />
 ) : (
 <Moon className="h-4 w-4 text-m3-primary" />
 )}
 <span>{darkMode ? "Light Theme" : "Dark Theme"}</span>
 </div>
 <span className="text-[9px] font-black uppercase text-zinc-400 px-1.5 py-0.5 bg-m3-outline-variant/20 rounded font-mono">
 {darkMode ? "LIGHT" : "DARK"}
 </span>
 </button>

 {/* Account Settings (Guarded password change Only) */}
 <button
 type="button"
 onClick={() => {
 setIsAccountDropdownOpen(false);
 setShowAccountSettingsModal(true);
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <LockKeyhole className="h-4 w-4 text-amber-500" />
 <span>Account Settings</span>
 </button>

 {/* Operational Walkthrough */}
 <button
 type="button"
 onClick={() => {
 setIsAccountDropdownOpen(false);
 changeTab("tutorials");
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <BookOpen className="h-4 w-4 text-m3-primary" />
 <span>Operational Walkthrough</span>
 </button>

 {/* System Settings trigger */}
 <button
 type="button"
 onClick={() => {
 setIsAccountDropdownOpen(false);
 window.dispatchEvent(new Event("open-privacy-hub"));
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <Settings className="h-4 w-4 text-m3-primary" />
 <span>Settings</span>
 </button>

 <div className="h-px bg-m3-outline-variant/10 !my-1" />

 {/* Logout command trigger */}
 <button
 type="button"
 onClick={() => {
 setIsAccountDropdownOpen(false);
 setShowLogoutConfirmModal(true);
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer transition-colors"
 >
 <Power className="h-4 w-4 text-rose-500" />
 <span>Logout Account</span>
 </button>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 </div>
 </div>
 </header>

 {/* BODY CONTENT: Sidebar + Dynamic tab target */}
 <div className="flex-1 flex overflow-hidden min-h-0 relative">
 {/* FLOATING RESTORE SIDEBAR TRIGGER */}
 {isSidebarHidden && (
 <button
 onClick={() => setIsSidebarHidden(false)}
 className="fixed left-0 top-1/2 -translate-y-1/2 z-[45] p-2 bg-m3-primary text-m3-on-primary rounded-r-2xl border-y border-r border-m3-outline-variant/35 shadow-2xl hover:bg-m3-primary/95 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
 title="Restore Navigation Sidebar"
 >
 <ChevronRight className="h-5 w-5 animate-pulse group-hover:translate-x-0.5 transition-transform" />
 </button>
 )}

 {/* SIDEBAR NAVIGATION: Desktop (Unified with Brand Header & Profile) */}
 <motion.aside
 initial={false}
 animate={{
 width: isSidebarHidden ? 0 : isSidebarExpanded ? 288 : 80,
 }}
 transition={{
 type: "spring",
 stiffness: 340,
 damping: 28,
 mass: 0.8,
 }}
 className={`border-r border-m3-outline-variant/15 select-none android-glass-sidebar py-5 px-3 sticky top-0 flex flex-col justify-between h-screen transition-all ${
 isSidebarProfileDropdownOpen ? "z-[9999] overflow-visible" : "z-40 overflow-hidden"
 } ${
 isSidebarHidden ? "hidden" : "hidden md:flex"
 }`}
 >
 {/* TOP SECTION: Brand Logo, Name and Branch assignment */}
 <div className="flex flex-col gap-4 min-w-0">
 {/* Brand Logo & Name */}
 <div
 className={`flex items-center gap-3 ${isSidebarExpanded ? "pl-2" : "justify-center"}`}
 >
 <img
 src="/icon.svg"
 alt="TilePoint Favicon Logo"
 className="h-9 w-9 rounded-xl shrink-0 shadow-sm"
 referrerPolicy="no-referrer"
 />
 <AnimatePresence initial={false}>
 {isSidebarExpanded && (
 <motion.div
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -10 }}
 transition={{ duration: 0.18, ease: [0.05, 0.7, 0.1, 1.0] }}
 className="truncate min-w-0"
 >
 <h1 className="text-sm font-black tracking-wide leading-none uppercase font-sans text-m3-primary">
 TilePoint
 </h1>
 <span className="text-[8px] text-m3-on-surface-variant font-bold block uppercase mt-1 tracking-widest leading-none">
 HQ ERP OS
 </span>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Branch Assignment tag badge */}
 {isSidebarExpanded ? (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.18, ease: [0.05, 0.7, 0.1, 1.0] }}
 className="px-1"
 >
 <div className="w-full text-center px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase bg-m3-secondary-container text-m3-on-secondary-container border border-m3-outline-variant/35 tracking-wider truncate">
 {getBranchName(currentUser.branchAssignmentId)}
 </div>
 </motion.div>
 ) : (
 <div
 className="flex justify-center py-1"
 title={getBranchName(currentUser.branchAssignmentId)}
 >
 <span className="h-2.5 w-2.5 rounded-full bg-m3-primary animate-pulse" />
 </div>
 )}

 <div className="h-px bg-m3-outline-variant/10" />

 {/* Modules Label and Toggle Expand indicator */}
 <div
 className={`flex items-center ${isSidebarExpanded ? "justify-between pl-2 mb-1" : "justify-center mb-1"}`}
 >
 <AnimatePresence initial={false}>
 {isSidebarExpanded && (
 <motion.div
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -8 }}
 transition={{ duration: 0.18, ease: [0.05, 0.7, 0.1, 1.0] }}
 className="flex items-center gap-1.5 truncate"
 >
 <span className="text-[10px] font-black tracking-widest text-m3-on-surface-variant uppercase font-mono">
 Modules
 </span>
 </motion.div>
 )}
 </AnimatePresence>
 <button
 type="button"
 onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
 className={`p-1.5 text-m3-on-surface-variant rounded-xl opacity-80 hover:opacity-100 hover:bg-m3-outline-variant/10 transition-all duration-200 cursor-pointer ${
 !isSidebarExpanded ? "scale-105 text-m3-primary" : ""
 }`}
 title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
 >
 <ChevronLeft
 className={`h-4 w-4 transition-transform duration-300 ${!isSidebarExpanded ? "rotate-180" : ""}`}
 />
 </button>
 </div>

 {/* Navigation item lists */}
 {(() => {
  const showSaleRedDot = parkedSales.length > 0;
  const showDeliveriesRedDot = deliveries.some(d => d.status === 'Scheduled' || d.status === 'Packed' || d.status === 'Out For Delivery');
  
  let showInventoryRedDot = false;
  try {
   const cached = localStorage.getItem("tp_batch_expirations");
   if (cached) {
    const parsed = JSON.parse(cached);
    const today = new Date("2026-07-18");
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
  
  const showTransferRedDot = stockTransfers.some(t => {
   if (t.status !== 'Pending') return false;
   return t.fromBranchId !== t.toBranchId;
  });
  
  const showExpiryRedDot = showInventoryRedDot;

  return (
   <nav
   id="sidebar-nav"
   className="space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-250px)] p-1 scrollbar-thin"
   >
   {sidebarCategoryTree.map((category) => {
   const CategoryIcon = category.icon;

   // Strong dynamic RBAC: Filter sub-items to only those this user has permission to see
   const authorizedSubItems = category.subItems.filter((sub) => {
   const masterItem = menuItems.find((m) => m.id === sub.id);
   return masterItem
   ? masterItem.roles.includes(currentUser.role)
   : false;
   });

   // Under strong RBAC, if there are no authorized sub-items, do not show the category folder at all
   if (authorizedSubItems.length === 0) return null;

   const hasActiveSubItem =
   authorizedSubItems.some((sub) => activeTab === sub.id) ||
   activeTab === category.id;

   return (
   <button
   key={category.id}
   onClick={() => {
   const firstSub = authorizedSubItems[0]?.id || category.id;
   changeTab(firstSub);
   }}
   className={`w-full flex items-center ${
   isSidebarExpanded ? "justify-between px-3.5 py-2.5" : "justify-center h-11"
   } rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer relative group ${
   hasActiveSubItem
   ? "bg-m3-primary text-m3-on-primary shadow-md shadow-m3-primary/10 font-black"
   : "hover:bg-m3-primary/10 text-m3-on-surface-variant hover:text-m3-primary"
   }`}
   >
   <div className="flex items-center gap-3 min-w-0">
   <div className="relative shrink-0 flex items-center justify-center">
   <CategoryIcon
   className={`h-4.5 w-4.5 ${hasActiveSubItem ? "text-m3-on-primary" : "text-m3-on-surface-variant"}`}
   />
   {((category.id === "sale" && showSaleRedDot) ||
   (category.id === "deliveries" && showDeliveriesRedDot) ||
   (category.id === "inventory" && showInventoryRedDot)) && (
   <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 border border-m3-surface" />
   )}
   </div>
   <AnimatePresence initial={false}>
   {isSidebarExpanded && (
   <motion.span
   initial={{ opacity: 0, x: -8 }}
   animate={{ opacity: 1, x: 0 }}
   exit={{ opacity: 0, x: -8 }}
   transition={{ duration: 0.18, ease: [0.05, 0.7, 0.1, 1.0] }}
   className="truncate font-bold text-xs"
   >
   {category.name}
   </motion.span>
   )}
   </AnimatePresence>
   </div>
   {!isSidebarExpanded && (
   <div className="absolute left-14 scale-0 group-hover:scale-100 transition-all duration-200 origin-left bg-m3-on-surface text-m3-surface text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-m3-outline-variant/30">
   {category.name}
   </div>
   )}
   </button>
   );
   })}
   </nav>
  );
 })()}
 </div>

 {/* BOTTOM SECTION: Profile card & Upward-opening popup Menu */}
 <div className="pt-3 border-t border-m3-outline-variant/15 relative z-50">


 <button
 id="sidebar-profile-dropdown-trigger"
 onClick={() =>
 setIsSidebarProfileDropdownOpen(!isSidebarProfileDropdownOpen)
 }
 className={`w-full flex items-center gap-2.5 p-2 rounded-xl border border-m3-outline-variant/40 hover:bg-m3-primary/5 transition-all cursor-pointer text-left focus:outline-none bg-m3-surface-low select-none active:scale-[0.98] ${
 isSidebarExpanded ? "" : "justify-center"
 }`}
 >
 <div className="h-8.5 w-8.5 rounded-xl bg-m3-primary font-black text-xs items-center justify-center flex text-m3-on-primary shadow-sm m3-shape-asymmetric relative overflow-hidden shrink-0">
 {(() => {
 const isErica =
 currentUser.fullName.toLowerCase().includes("erica") ||
 currentUser.username?.toLowerCase().includes("erica");
 if (isErica) {
 return "E";
 }

 const avatarSrc = currentUser.profilePicture || "";

 return (
 <>
 {avatarSrc ? (
 <img
 src={avatarSrc}
 alt={currentUser.fullName}
 className="h-full w-full object-cover"
 referrerPolicy="no-referrer"
 />
 ) : (
 currentUser.avatarInitials
 )}
 <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-m3-surface animate-pulse" />
 </>
 );
 })()}
 </div>

 <AnimatePresence initial={false}>
 {isSidebarExpanded && (
 <motion.div
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -8 }}
 transition={{ duration: 0.18, ease: [0.05, 0.7, 0.1, 1.0] }}
 className="flex-1 min-w-0"
 >
 <div className="text-[11px] font-extrabold leading-none text-m3-on-surface truncate">
 {currentUser.fullName}
 </div>
 <span className="text-[8.5px] text-m3-on-surface-variant font-mono capitalize leading-none font-bold block mt-1 truncate">
 {currentUser.role} Account
 </span>
 </motion.div>
 )}
 </AnimatePresence>

 {isSidebarExpanded && (
 <ChevronDown
 className={`h-3.5 w-3.5 text-m3-on-surface-variant transition-transform duration-200 shrink-0 ${isSidebarProfileDropdownOpen ? "rotate-180" : ""}`}
 />
 )}
 </button>

 {/* Upward Dropdown Menu */}
 <AnimatePresence>
 {isSidebarProfileDropdownOpen && (
 <>
 <div
 className="fixed inset-0 z-[9998] bg-transparent"
 onClick={() => setIsSidebarProfileDropdownOpen(false)}
 />
 <motion.div
 id="sidebar-profile-dropdown-container"
 initial={{ opacity: 0, scale: 0.95, y: 8 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 8 }}
 transition={{ duration: 0.15, ease: "easeOut" }}
 className={`absolute bottom-full mb-2 w-56 rounded-2xl bg-m3-surface-low border border-m3-outline-variant/40 text-m3-on-surface shadow-2xl z-[9999] p-2 space-y-1.5 font-sans ${
 isSidebarMinimized ? "left-0" : "left-0 right-0"
 }`}
 >
 <div className="px-3 py-2 border-b border-m3-outline-variant/15 bg-m3-surface-high/10 rounded-xl flex items-center justify-between">
 <div className="min-w-0 flex-1 pr-2">
 <div className="text-xs font-black text-m3-on-surface truncate">
 {currentUser.fullName}
 </div>
 <div className="text-[9.5px] text-zinc-400 font-mono font-bold mt-0.5 uppercase tracking-wider">
 {currentUser.role} Mode
 </div>
 </div>
 <button
 type="button"
 onClick={() => setIsSidebarProfileDropdownOpen(false)}
 className="p-1 rounded-lg text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-outline-variant/20 transition-colors cursor-pointer shrink-0"
 title="Close account menu"
 aria-label="Close account menu"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>

 {/* Theme Toggle */}
 <button
 type="button"
 onClick={() => {
 handleToggleDarkMode();
 setIsSidebarProfileDropdownOpen(false);
 }}
 className="w-full flex items-center justify-between text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <div className="flex items-center gap-2">
 {darkMode ? (
 <Sun className="h-4 w-4 text-amber-500" />
 ) : (
 <Moon className="h-4 w-4 text-m3-primary" />
 )}
 <span>{darkMode ? "Light Theme" : "Dark Theme"}</span>
 </div>
 <span className="text-[9px] font-black uppercase text-zinc-400 px-1.5 py-0.5 bg-m3-outline-variant/20 rounded font-mono">
 {darkMode ? "LIGHT" : "DARK"}
 </span>
 </button>

 {/* Account Settings */}
 <button
 type="button"
 onClick={() => {
 setIsSidebarProfileDropdownOpen(false);
 setShowAccountSettingsModal(true);
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <LockKeyhole className="h-4 w-4 text-amber-500" />
 <span>Account Settings</span>
 </button>

 {/* Operational Walkthrough */}
 <button
 type="button"
 onClick={() => {
 setIsSidebarProfileDropdownOpen(false);
 changeTab("tutorials");
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <BookOpen className="h-4 w-4 text-m3-primary" />
 <span>Walkthrough</span>
 </button>

 {/* System Settings */}
 <button
 type="button"
 onClick={() => {
 setIsSidebarProfileDropdownOpen(false);
 window.dispatchEvent(new Event("open-privacy-hub"));
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-m3-primary/10 text-m3-on-surface cursor-pointer transition-colors"
 >
 <Settings className="h-4 w-4 text-m3-primary" />
 <span>Settings</span>
 </button>

 <div className="h-px bg-m3-outline-variant/10 !my-1" />

 {/* Logout */}
 <button
 type="button"
 onClick={() => {
 setIsSidebarProfileDropdownOpen(false);
 setShowLogoutConfirmModal(true);
 }}
 className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer transition-colors"
 >
 <Power className="h-4 w-4 text-rose-500" />
 <span>Logout Account</span>
 </button>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 </div>
 </motion.aside>

 {/* FIXED: ENFORCED RIGID VIEWPORT CONTAINER HEIGHT LIMITS ON COMPONENT MAIN MOUNT */}
 <main
  className={`flex-1 relative flex flex-col text-m3-on-surface transition-all duration-300 overflow-x-hidden min-h-0 ${
   activeTab === "pos" || activeTab === "ledger"
    ? "p-4 md:p-5 overflow-hidden h-full max-h-full"
    : "p-4 md:p-6 pb-26 md:pb-6 overflow-y-auto scroll-smooth"
  } ${isCompactColumns || !isInventoryCategory ? "compact-fit" : ""}`}
 >
 {/* Elegant Collapsible Horizontal Sub-menu Navigation Pill Bar with Dynamic RBAC */}
 {(() => {
  const activeCategory = sidebarCategoryTree.find(
  (cat) =>
  cat.subItems.some((sub) => sub.id === activeTab) ||
  cat.id === activeTab,
  );
  if (!activeCategory) return null;

  // Enforce RBAC filtering for sub-pages so they match exactly what is authorized
  const authorizedSubItems = activeCategory.subItems.filter(
  (sub) => {
  const masterItem = menuItems.find((m) => m.id === sub.id);
  return masterItem
  ? masterItem.roles.includes(currentUser.role)
  : false;
  },
  );

  if (authorizedSubItems.length <= 1 || activeTab === "pos")
  return null;

  // Submenu alert conditions
  let showExpirySubRedDot = false;
  try {
   const cached = localStorage.getItem("tp_batch_expirations");
   if (cached) {
    const parsed = JSON.parse(cached);
    const today = new Date();
    showExpirySubRedDot = parsed.some((b: any) => {
     if (!b.expiryDate) return false;
     const exp = new Date(b.expiryDate);
     const diffTime = exp.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     return diffDays <= 30;
    });
   } else {
    showExpirySubRedDot = true;
   }
  } catch (_) {
   showExpirySubRedDot = true;
  }
  
  const showTransferSubRedDot = stockTransfers.some(t => {
   if (t.status !== 'Pending') return false;
   return t.fromBranchId !== t.toBranchId;
  });

  return (
  <div className={`mb-4 bg-m3-surface-low border border-m3-outline-variant/15 flex flex-col shrink-0 ${
  isInventoryCategory ? "rounded-2xl p-2.5" : "rounded-xl p-1.5 pb-2"
  }`}>
  <div className={`flex items-center justify-between px-1.5 block ${isInventoryCategory ? "pb-1" : "pb-0.5"}`}>
  <div className="flex items-center justify-between w-full">
  <div className="flex items-center gap-2">
  <span className="text-[10px] font-black tracking-widest text-m3-on-surface-variant uppercase font-mono">
  {activeCategory.name} Sub-navigation
  </span>
  <span className="h-1.5 w-1.5 rounded-full bg-m3-primary animate-pulse" />
  </div>
  <div className="flex items-center gap-2">
  {(activeTab === "inventory" || activeTab === "inventory-stocks") && (
  <button
  onClick={() => setIsCompactColumns(!isCompactColumns)}
  className="p-1 px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-lg transition-all cursor-pointer border border-m3-outline-variant/15 bg-m3-surface flex items-center gap-1.5 shadow-sm"
  title={
  isCompactColumns
  ? "Switch to Spacious mode for expanded tables and wider panels"
  : "Switch to Compact mode for dense screen layouts"
  }
  >
  <Sliders className="h-3.5 w-3.5" />
  <span>{isCompactColumns ? "Spacious Layout" : "Compact Layout"}</span>
  </button>
  )}
  <button
  onClick={() =>
  setIsSubMenuCollapsed(!isSubMenuCollapsed)
  }
  className="p-1 px-2 text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
  title={
  isSubMenuCollapsed
  ? "Expand Sub-menu"
  : "Collapse Sub-menu"
  }
  >
  <span>
  {isSubMenuCollapsed ? "Show Options" : "Hide Options"}
  </span>
  <ChevronDown
  className={`h-3.5 w-3.5 transition-transform duration-300 ${isSubMenuCollapsed ? "" : "rotate-180"}`}
  />
  </button>
  </div>
  </div>
  </div>

  <AnimatePresence initial={false}>
  {!isSubMenuCollapsed && (
  <motion.div
  initial={{ height: 0, opacity: 0, scaleY: 0.95 }}
  animate={{ height: "auto", opacity: 1, scaleY: 1 }}
  exit={{ height: 0, opacity: 0, scaleY: 0.95 }}
  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
  style={{ originY: 0 }}
  className={`overflow-y-hidden w-full flex flex-nowrap overflow-x-auto pt-2 pb-1.5 whitespace-nowrap scrollbar-thin scroll-smooth touch-pan-x shrink-0 ${
  isInventoryCategory ? "gap-2.5" : "gap-1.5"
  }`}
  >
  {authorizedSubItems.map((sub) => {
  const isSelected = activeTab === sub.id;
  return (
  <button
  key={sub.id}
  onClick={() => changeTab(sub.id)}
  className={`text-xs font-bold tracking-wide transition-all cursor-pointer shrink-0 relative ${
  isInventoryCategory
  ? "px-4.5 py-2 rounded-2xl"
  : "px-3 py-1.5 rounded-xl"
  } ${
  isSelected
  ? "bg-m3-primary text-m3-on-primary shadow-md shadow-m3-primary/10 font-black"
  : "bg-m3-surface border border-m3-outline-variant/15 text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary"
  }`}
  >
  <span>{sub.name}</span>
  {((sub.id === "inventory-expiry" && showExpirySubRedDot) ||
    (sub.id === "inventory-transfer" && showTransferSubRedDot)) && (
    <span className="absolute -top-1.5 -right-1 h-2 w-2 rounded-full bg-rose-500 border border-m3-surface" />
  )}
  </button>
  );
  })}
  </motion.div>
  )}
  </AnimatePresence>
  </div>
 );
 })()}

 <div className="flex-1 min-h-0">
 <AnimatePresence mode="wait">
 {isTabChanging ? (
 <motion.div
 key="skeleton"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15 }}
 style={{ willChange: "opacity" }}
 >
 <SkeletalLoader />
 </motion.div>
 ) : (
 <motion.div
 key={activeTab}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.22, ease: "easeInOut" }}
 style={{ willChange: "opacity" }}
 className="h-full"
 >
 {isMobileViewport && ["dashboard", "profit-analytics", "procurement", "branches"].includes(activeTab) && !developerBypassTabs.includes(activeTab) ? (
 <MobilePcOnlyBlocker
 tabId={activeTab}
 onForceEnable={() => setDeveloperBypassTabs((prev) => [...prev, activeTab])}
 />
 ) : (
 <>
 {activeTab === "tutorials" && <TutorialOnboarding />}
 {activeTab === "dashboard" && (
 <Dashboard darkMode={darkMode} onNavigate={changeTab} />
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
 onNavigate={changeTab}
 viewMode="checkout"
 showImmersiveControls={showImmersiveControls}
 />
 )}
 {activeTab === "ledger" && (
 <PosModule
 darkMode={darkMode}
 onNavigate={changeTab}
 viewMode="ledger"
 showImmersiveControls={showImmersiveControls}
 />
 )}
 {activeTab === "inventory" && (
 <InventoryModule
 darkMode={darkMode}
 isCompactGlobal={isCompactColumns}
 />
 )}
 {activeTab === "procurement" && (
 <ProcurementModule darkMode={darkMode} />
 )}
 {activeTab === "transmittal" && (
 <TransmittalModule darkMode={darkMode} />
 )}
 {activeTab === "shift" && (
 <ShiftModule darkMode={darkMode} />
 )}
 {activeTab === "calculator" && (
 <CalculatorModule darkMode={darkMode} />
 )}
 {activeTab === "branches" && (
 <BranchModule darkMode={darkMode} />
 )}
 {activeTab === "system-settings" && (
 <SystemSettingsModule
 darkMode={darkMode}
 setDarkMode={handleToggleDarkMode}
 followSystemTheme={followSystemTheme}
 setFollowSystemTheme={setFollowSystemTheme}
 />
 )}
 {activeTab === "users" && (
 <UsersModule darkMode={darkMode} />
 )}
 {activeTab === "reconciliation-transmission" && (
 <ReconciliationTransmissionModule darkMode={darkMode} />
 )}
 {activeTab === "deliveries-panel" && (
 <DeliveriesModule darkMode={darkMode} />
 )}
 {activeTab === "inventory-damage" && (
 <DamageRegisterModule darkMode={darkMode} />
 )}

 {/* ATPOS v2 Sub-items routing to standard Core Modules */}
 {activeTab.startsWith("inventory-") && activeTab !== "inventory-damage" &&
 (() => {
 const map: Record<
 string,
 | "catalog"
 | "movements"
 | "transfers"
 | "ledger"
 | "import"
 | "branch-prices"
 | "expiry"
 > = {
 "inventory-stocks": "catalog",
 "inventory-adjustments": "movements",
 "inventory-transfer": "transfers",
 "inventory-logistics": "ledger",
 "inventory-import": "import",
 "inventory-branch-prices": "branch-prices",
 "inventory-expiry": "expiry",
 };
 const subTab = map[activeTab] || "catalog";
 return (
 <InventoryModule
 darkMode={darkMode}
 initialSubTab={subTab}
 hideTabHeader={true}
 isCompactGlobal={isCompactColumns}
 onSubTabChange={(sub) => {
 const rMap: Record<string, string> = {
 catalog: "inventory-stocks",
 movements: "inventory-adjustments",
 transfers: "inventory-transfer",
 ledger: "inventory-logistics",
 import: "inventory-import",
 "branch-prices": "inventory-branch-prices",
 expiry: "inventory-expiry",
 };
 if (rMap[sub]) {
 setActiveTab(rMap[sub]);
 }
 }}
 />
 );
 })()}

 {activeTab === "adjustments-void" && (
 <PosModule
 darkMode={darkMode}
 onNavigate={changeTab}
 viewMode="ledger"
 />
 )}
 {activeTab === "suppliers-manage" && (
 <ProcurementModule darkMode={darkMode} />
 )}

 {/* Integration of ATPOS v2 Specific Submodules */}
 {[
 "members-manage",
 "members-receivables",
 "members-loyalty",
 "members-search-sales",
 "expenses-add",
 "expenses-search",
 "suppliers-credits",
 "suppliers-calendar",
 "bir-xz",
 "bir-summary",
 "bir-pwd",
 "bir-athletes",
 "bir-solo",
 "bir-senior20",
 "bir-senior5",
 "bir-regular",
 "adjustments-return",
 ].includes(activeTab) && (
 <AtposExtraModules
 activeSubTab={activeTab}
 darkMode={darkMode}
 onNavigate={changeTab}
 />
 )}
 </>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </main>
 </div>

 {/* BOTTOM NAVIGATION: Unified premium horizontal scrollbar across the system (Mobile Only) */}
 <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-m3-surface-low/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-m3-outline-variant/25 px-4 py-2 flex flex-row flex-nowrap items-center justify-start gap-3 rounded-t-[20px] shadow-2xl transition-all duration-300 overflow-x-auto scrollbar-none scroll-smooth touch-pan-x whitespace-nowrap">
 {/* Brand Modules badge */}
 <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-m3-outline-variant/20 font-sans">
 <span className="h-2 w-2 rounded-full bg-m3-primary animate-pulse" />
 <span className="text-[10px] font-black uppercase text-m3-primary tracking-widest font-mono">
 Modules
 </span>
 </div>

 {sidebarCategoryTree.map((category) => {
 // Dynamic RBAC filtering
 const authorizedSubItems = category.subItems.filter((sub) => {
 const masterItem = menuItems.find((m) => m.id === sub.id);
 return masterItem
 ? masterItem.roles.includes(currentUser.role)
 : false;
 });

 // Branch authorization filter
 const filteredSubItems = authorizedSubItems.filter((sub) => {
 const currentBranch = branches.find(
 (b) => b.id === currentUser.branchAssignmentId,
 );
 const isAuthorizedBranch =
 currentUser.branchAssignmentId === "B1" ||
 !!currentBranch?.isDistributionBranch ||
 currentUser.role === "Admin";
 if (sub.id === "transmittal" && !isAuthorizedBranch) return false;
 return true;
 });

 if (filteredSubItems.length === 0) return null;

 // Routing goes to first authorized sub-item of category
 const firstSubTabId = filteredSubItems[0].id;
 const Icon = category.icon;
 const isSelected =
 filteredSubItems.some((sub) => sub.id === activeTab) ||
 activeTab === category.id;

 // Short friendly labels for bottom bar
 let shortLabel = category.name;
 if (category.id === "sale") shortLabel = "Sale";
 else if (category.id === "inventory") shortLabel = "Inventory";
 else if (category.id === "bir") shortLabel = "Reports";
 else if (category.id === "deliveries") shortLabel = "Cargo";
 else if (category.id === "members") shortLabel = "Members";
 else if (category.id === "supplier") shortLabel = "Suppliers";
 else if (category.id === "expenses") shortLabel = "Expenses";
 else if (category.id === "adjustments") shortLabel = "Voids";
 else if (category.id === "admin-bi") shortLabel = "BI";
 else if (category.id === "admin-org") shortLabel = "Staff";

 return (
 <button
 key={category.id}
 onClick={() => changeTab(firstSubTabId)}
 className="flex flex-col items-center gap-0.5 focus:outline-none cursor-pointer shrink-0 py-1 px-2.5 min-w-[58px] group transition-transform active:scale-95"
 >
 {/* Visual state capsule indicator */}
 <div
 className={`px-4 py-1 rounded-2xl transition-[background-color,color,transform] duration-200 relative ${
 isSelected
 ? "bg-m3-primary text-m3-on-primary shadow-sm shadow-m3-primary/10 "
 : "text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/5"
 }`}
 >
 <Icon className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
 {((category.id === "sale" && showSaleRedDot) ||
   (category.id === "deliveries" && showDeliveriesRedDot) ||
   (category.id === "inventory" && showInventoryRedDot)) && (
   <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 border border-m3-surface" />
 )}
 </div>
 <span
 className={`text-[9px] font-black tracking-tight text-center leading-none mt-1 whitespace-nowrap ${
 isSelected
 ? "text-m3-primary font-black"
 : "text-zinc-400 dark:text-zinc-500 group-hover:text-m3-primary"
 }`}
 >
 {shortLabel}
 </span>
 </button>
 );
 })}
 </div>

 {/* CONFIRMATORY DIALOG: Logout verification check trigger */}
 {showLogoutConfirmModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[99999] p-4 animate-fade-in">
 <div
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => setShowLogoutConfirmModal(false)}
 />
 <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left font-sans">
 <div className="flex items-center gap-3 border-b border-m3-outline-variant/15 pb-3">
 <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
 <Power className="h-5 w-5 animate-pulse" />
 </div>
 <div>
 <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
 Confirm Sign Out
 </h3>
 <p className="text-[10px] text-zinc-400 font-bold font-mono">
 TILEPOINT SESSION CONTROL
 </p>
 </div>
 </div>

 <p className="text-xs text-zinc-300 font-medium leading-relaxed">
 Are you sure you want to log out of TilePoint terminal? Any
 unsaved active checkout carts will be lost.
 </p>

 <div className="flex gap-3 pt-2 font-sans">
 <button
 type="button"
 onClick={() => setShowLogoutConfirmModal(false)}
 className="flex-1 py-2.5 rounded-full bg-m3-surface hover:bg-m3-outline-variant/15 text-m3-on-surface font-extrabold text-xs uppercase tracking-wide border border-m3-outline-variant/10 cursor-pointer active:scale-95 transition-all text-center"
 >
 No, Keep Active
 </button>
 <button
 type="button"
 onClick={() => {
 setShowLogoutConfirmModal(false);
 logout();
 }}
 className="flex-1 py-2.5 rounded-full bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs uppercase tracking-wide cursor-pointer active:scale-95 transition-all text-center shadow-lg shadow-rose-500/10"
 >
 Yes, Sign Out
 </button>
 </div>
 </div>
 </div>
 )}

 {/* CONFIRMATORY DIALOG: ERP OS Exit Prevention */}
 {showPosExitConfirmModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
 <div
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => {
 setShowPosExitConfirmModal(false);
 setPendingTabId(null);
 }}
 />
 <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left font-sans">
 <div className="flex items-center gap-3 border-b border-m3-outline-variant/15 pb-3">
 <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
 <ShieldAlert className="h-5 w-5 animate-pulse" />
 </div>
 <div>
 <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
 Unsaved Checkout Warning
 </h3>
 <p className="text-[10px] text-amber-500 font-bold font-mono uppercase tracking-wider">
 Active Transaction Guard
 </p>
 </div>
 </div>

 <p className="text-xs text-zinc-300 font-medium leading-relaxed">
 Are you sure you want to leave this site? Changes you made may
 not be saved.
 <br />
 <br />
 Leaving the ERP OS terminal now will disrupt the current
 active customer checkout session and clear the basket.
 </p>

 <div className="flex gap-3 pt-2 font-sans">
 <button
 type="button"
 onClick={() => {
 setShowPosExitConfirmModal(false);
 setPendingTabId(null);
 }}
 className="flex-1 py-2.5 rounded-full bg-m3-surface hover:bg-m3-outline-variant/15 text-m3-on-surface font-extrabold text-xs uppercase tracking-wide border border-m3-outline-variant/10 cursor-pointer active:scale-95 transition-all text-center"
 >
 Cancel, Keep Basket
 </button>
 <button
 type="button"
 onClick={() => {
 setShowPosExitConfirmModal(false);
 if (pendingTabId) {
 proceedWithTabChange(pendingTabId);
 }
 setPendingTabId(null);
 }}
 className="flex-1 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wide cursor-pointer active:scale-95 transition-all text-center shadow-lg shadow-amber-500/10"
 >
 Yes, Leave Mode
 </button>
 </div>
 </div>
 </div>
 )}


 {/* MODAL: Database Core & Disaster Recovery Settings */}
 {showDatabaseCoreModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
 <div
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => {
 setShowDatabaseCoreModal(false);
 setDbBackupFileMessage(null);
 setDbBackupFileError(null);
 setManualSnapshotName("");
 }}
 />

 <div className="relative w-full max-w-2xl rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface flex flex-col max-h-[90vh] text-left">
 {/* Modal Header */}
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
 <Database className="h-6 w-6" />
 </div>
 <div>
 <h3 className="text-base font-black uppercase tracking-wider text-m3-on-surface flex items-center gap-2">
 Database Core Management
 <span
 className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
 dbSyncStatus === "syncing"
 ? "bg-amber-500/20 text-amber-500 animate-pulse"
 : "bg-emerald-500/10 text-emerald-400"
 }`}
 >
 {dbSyncStatus === "syncing"
 ? "● Sync active"
 : "● Connected"}
 </span>
 </h3>
 <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold">
 Disaster Recovery & Automated Backup Engine
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => {
 setShowDatabaseCoreModal(false);
 setDbBackupFileMessage(null);
 setDbBackupFileError(null);
 setManualSnapshotName("");
 }}
 className="text-m3-on-surface-variant hover:text-rose-500 cursor-pointer p-1.5 rounded-full hover:bg-m3-outline-variant/10 transition-colors"
 title="Close Database Panel"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Modal Navigation Tabs */}
 <div className="flex border-b border-m3-outline-variant/10 my-4 p-1 bg-m3-surface-low/50 rounded-xl">
 <button
 onClick={() => setDbCoreTab("scheduler")}
 className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
 dbCoreTab === "scheduler"
 ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
 : "text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary"
 }`}
 >
 Auto-Backup Configuration
 </button>
 <button
 onClick={() => setDbCoreTab("ledger")}
 className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
 dbCoreTab === "ledger"
 ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
 : "text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary"
 }`}
 >
 Recovery Ledger
 <span className="bg-m3-primary-container text-m3-on-primary-container text-[10px] font-bold px-1.5 py-0.2 rounded-full font-sans">
 {dbSnapshots.length}
 </span>
 </button>
 <button
 onClick={() => setDbCoreTab("import-export")}
 className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
 dbCoreTab === "import-export"
 ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
 : "text-m3-on-surface-variant hover:bg-m3-primary/10 hover:text-m3-primary"
 }`}
 >
 Offline Portability
 </button>
 </div>

 {/* Modal Main Content (Flexible Scroll Area) */}
 <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh]">
 {/* Tab A: SCHEDULER & AUTO BACKUPS */}
 {dbCoreTab === "scheduler" && (
 <div className="space-y-4">
 {/* Performance stats banner */}
 <div className="p-3.5 rounded-2xl bg-m3-primary/5 border border-m3-primary/10 flex justify-between items-center text-xs">
 <div>
 <div className="font-extrabold text-m3-primary uppercase text-[10px] tracking-wide">
 Optimization Status
 </div>
 <div className="text-zinc-400 mt-1 font-sans">
 Debounce cache buffer operates at{" "}
 <span className="font-mono font-bold text-m3-on-surface">
 {debounceDelay}ms
 </span>
 .
 </div>
 </div>
 <div className="text-right">
 <div className="font-mono text-emerald-400 font-extrabold">
 {writeStatsCount.toLocaleString()}
 </div>
 <div className="text-[9px] text-zinc-500 uppercase font-mono mt-0.5">
 Database Writes Saved
 </div>
 </div>
 </div>

 <div className="rounded-2xl border border-m3-outline-variant/20 p-4 space-y-4 bg-m3-surface-low">
 <h4 className="text-xs font-black uppercase tracking-wider text-m3-primary">
 Automatic Background Scheduler
 </h4>

 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs font-bold">
 Hourly Data Preservation
 </div>
 <div className="text-[10px] text-zinc-400 mt-0.5">
 Protect inventory journals and sales invoices
 against localStorage eviction.
 </div>
 </div>
 <button
 type="button"
 disabled={currentUser.role !== UserRole.ADMIN}
 onClick={() => {
 if (currentUser.role !== UserRole.ADMIN) {
 showToast(
 "Access Denied: Admin authorization required.",
 );
 return;
 }
 setAutoBackupEnabled(!autoBackupEnabled);
 showToast(
 `Automated backup scheduler is now ${!autoBackupEnabled ? "ENABLED" : "DISABLED"}`,
 );
 }}
 className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
 autoBackupEnabled
 ? "bg-emerald-500 text-black hover:bg-emerald-400"
 : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
 } ${currentUser.role !== UserRole.ADMIN ? "opacity-60 cursor-not-allowed" : ""}`}
 >
 {autoBackupEnabled
 ? " Active scheduler"
 : " Deactivated"}
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1 block">
 Reserve Frequency
 </label>
 <select
 disabled={
 currentUser.role !== UserRole.ADMIN ||
 !autoBackupEnabled
 }
 value={backupIntervalHours}
 onChange={(e) => {
 const val = Number(e.target.value);
 setBackupIntervalHours(val);
 showToast(
 `Automated backup frequency is configured to every ${val} hr.`,
 );
 }}
 className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface font-extrabold focus:outline-none focus:ring-1 focus:ring-m3-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <option value={1}>Every 1 Hour (Standard)</option>
 <option value={2}>Every 2 Hours (Mid-Day)</option>
 <option value={6}>Every 6 Hours (Periodic)</option>
 <option value={12}>
 Every 12 Hours (Half-Day)
 </option>
 <option value={24}>
 Every 24 Hours (End-of-Day)
 </option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1 block">
 Last Successful Backup Run
 </label>
 <div className="w-full bg-m3-surface-lowest border border-m3-outline-variant/15 text-xs px-3 py-2 rounded-xl text-m3-on-surface-variant font-medium flex items-center gap-1.5 min-h-[36px]">
 <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
 {lastAutoBackupTime ? (
 <span className="font-mono text-[11px] font-bold">
 {new Date(lastAutoBackupTime).toLocaleString()}
 </span>
 ) : (
 <span className="italic text-zinc-500 font-bold">
 Never executed
 </span>
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-2xl border border-m3-outline-variant/20 p-4 space-y-3">
 <h4 className="text-xs font-black uppercase tracking-wider text-m3-primary">
 Instantiate Manual Backup Snapshot
 </h4>
 <div className="flex gap-2 font-sans">
 <input
 type="text"
 value={manualSnapshotName}
 onChange={(e) =>
 setManualSnapshotName(e.target.value)
 }
 placeholder="Snapshot label"
 className="flex-1 bg-m3-surface-lowest text-xs text-m3-on-surface border border-m3-outline-variant/30 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-m3-primary/40 placeholder-zinc-500 font-bold"
 />
 <button
 type="button"
 onClick={async () => {
 const name =
 manualSnapshotName.trim() ||
 `Manual Snapshot - ${new Date().toLocaleTimeString()}`;
 await triggerSystemProcessing(
 `Compiling ${name}...`,
 1400,
 "db",
 undefined,
 "Compressing tables, locking databases, and serializing snapshot packet...",
 );
 createDbSnapshot(name);
 setManualSnapshotName("");
 showToast(
 `Successfully registered database snapshot: "${name}"`,
 );
 }}
 className="px-4 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all"
 >
 Capture Snapshot
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Tab B: DATABASE SNAPSHOTS LEDGER */}
 {dbCoreTab === "ledger" && (
 <div className="space-y-3">
 <div className="flex justify-between items-center px-1">
 <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
 Saved Backup History
 </span>
 {(() => {
 if (clearAllConfirm === 0) {
 return (
 <button
 onClick={() => {
 setClearAllConfirm(1);
 setTimeout(() => {
 setClearAllConfirm(prev => prev < 3 ? 0 : prev);
 }, 4000);
 }}
 className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
 title="Clear database list (Requires 3x confirmation)"
 >
 Clear All Catalog
 </button>
 );
 } else if (clearAllConfirm === 1) {
 return (
 <button
 onClick={() => setClearAllConfirm(2)}
 className="text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded transition-colors cursor-pointer animate-pulse"
 title="Confirm Stage 1 of 3"
 >
 Confirm Clear All (1/3)
 </button>
 );
 } else {
 return (
 <button
 onClick={() => {
 dbSnapshots.forEach((snap) =>
 deleteDbSnapshot(snap.id),
 );
 setClearAllConfirm(0);
 showToast("Cleared recovery snapshot catalog.");
 }}
 className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded hover:bg-rose-700 transition-colors cursor-pointer animate-bounce"
 title="Confirm Stage 2 of 3 - Clear All!"
 >
 Confirm Clear All (2/3 - Clear!)
 </button>
 );
 }
 })()}
 </div>

 {dbSnapshots.length === 0 ? (
 <div className="text-center py-10 bg-m3-surface-lowest border border-dashed border-m3-outline-variant/30 rounded-2xl text-zinc-500 space-y-2">
 <p className="text-sm font-bold">
 Digital Snapshot Archive is Empty
 </p>
 <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
 Automated or manual snapshots will register here.
 </p>
 </div>
 ) : (
 <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
 {dbSnapshots.map((snap) => (
 <div
 key={snap.id}
 className="p-3 bg-m3-surface-lowest hover:bg-m3-primary/5 rounded-2xl border border-m3-outline-variant/15 flex items-center justify-between transition-all"
 >
 <div className="space-y-1">
 <div className="text-xs font-black text-m3-on-surface">
 {snap.name}
 </div>
 <div className="text-[9.5px] text-zinc-400 font-mono font-bold flex items-center gap-2 flex-wrap">
 <span className="text-m3-primary text-[10px]">
 {snap.creator}
 </span>
 <span>•</span>
 <span>
 {new Date(snap.timestamp).toLocaleString()}
 </span>
 <span>•</span>
 <span className="text-zinc-500 bg-m3-surface-low/55 px-1.5 rounded">
 {((snap.sizeBytes || 0) / 1024).toFixed(1)} KB
 </span>
 </div>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => setConfirmRestoreSnap(snap)}
 className="px-3 py-1.5 bg-m3-primary/10 hover:bg-m3-primary/20 text-m3-primary text-[10px] font-black cursor-pointer uppercase tracking-wider rounded-lg transition-colors"
 title="Overwrite current state with backup snapshot font"
 >
 Restore
 </button>
 {(() => {
 const confirmCount = deleteSnapshotConfirm[snap.id] || 0;
 if (confirmCount === 0) {
 return (
 <button
 type="button"
 onClick={() => {
 setDeleteSnapshotConfirm(prev => ({ ...prev, [snap.id]: 1 }));
 setTimeout(() => {
 setDeleteSnapshotConfirm(prev => {
 if (prev[snap.id] < 3) {
 const updated = { ...prev };
 delete updated[snap.id];
 return updated;
 }
 return prev;
 });
 }, 4000);
 }}
 className="p-1 px-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/15 cursor-pointer rounded transition-colors"
 title="Delete snapshot (Requires 3x confirmation)"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 );
 } else if (confirmCount === 1) {
 return (
 <button
 type="button"
 onClick={() => {
 setDeleteSnapshotConfirm(prev => ({ ...prev, [snap.id]: 2 }));
 }}
 className="px-2 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-600 rounded transition-all cursor-pointer animate-pulse shrink-0"
 title="Confirm Stage 1 of 3"
 >
 Confirm 1/3
 </button>
 );
 } else {
 return (
 <button
 type="button"
 onClick={() => {
 deleteDbSnapshot(snap.id);
 showToast(
 `Removed backup snapshot ${snap.id}`,
 );
 setDeleteSnapshotConfirm(prev => {
 const updated = { ...prev };
 delete updated[snap.id];
 return updated;
 });
 }}
 className="px-2 py-1 text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 rounded transition-all cursor-pointer animate-bounce shrink-0"
 title="Confirm Stage 2 of 3 - Delete!"
 >
 Confirm 2/3 (Delete)
 </button>
 );
 }
 })()}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Tab C: LOCAL JSON PORTABILITY */}
 {dbCoreTab === "import-export" && (
 <div className="space-y-4">
 {/* Local JSON Export */}
 <div className="rounded-2xl border border-m3-outline-variant/15 p-4 space-y-2.5 bg-m3-surface-low">
 <h4 className="text-xs font-black uppercase text-m3-primary tracking-wider">
 Export Database Records
 </h4>
 <p className="text-[10px] text-zinc-400 font-medium">
 Physically package your corporate configuration, stock
 level logs, employee tables and ERP OS sales ledgers inside
 an offline executable JSON block.
 </p>
 <button
 type="button"
 onClick={() => {
 const payload = {
 isConfigured,
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
 };
 const dataStr = JSON.stringify(payload, null, 2);
 const filename = `tilepoint_full_backup_${Date.now()}.json`;

 saveFileToBackup(dataStr, filename, "Database_Backups", "application/json")
 .then((res) => {
 showToast(
 `Database backup exported to ${res.path || filename} successfully!`,
 );
 })
 .catch(() => {
 const blob = new Blob([dataStr], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const element = document.createElement("a");
 element.setAttribute("href", url);
 element.setAttribute("download", filename);
 element.style.display = "none";
 document.body.appendChild(element);
 element.click();
 document.body.removeChild(element);
 URL.revokeObjectURL(url);
 showToast(
 "Raw physical database JSON file downloaded successfully!",
 );
 });
 }}
 className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-extrabold uppercase tracking-wider rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
 >
 <Download className="h-4 w-4" /> Export Raw JSON
 Database File
 </button>
 </div>

 {/* Local JSON Import */}
 <div className="rounded-2xl border border-m3-outline-variant/15 p-4 space-y-3 bg-m3-surface-low">
 <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider">
 State Migration Recovery (Import JSON)
 </h4>
 <p className="text-[10px] text-zinc-400 font-medium">
 Overwrites the client dataset fully with a local JSON
 block. Approved files are validated on format before
 matching structure schemas.
 </p>

 <label className="flex flex-col items-center justify-center p-6 bg-m3-surface-lowest border-2 border-dashed border-m3-outline-variant/30 rounded-2xl hover:bg-m3-outline-variant/5 cursor-pointer transition-colors group">
 <Upload className="h-6 w-6 text-zinc-400 group-hover:text-amber-500 transition-colors" />
 <span className="text-[11px] font-extrabold mt-2">
 Select or Drop Portable Backup JSON file
 </span>
 <span className="text-[9px] text-zinc-500 uppercase font-mono mt-1 font-bold">
 Standard .json matches only
 </span>
 <input
 type="file"
 accept=".json"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = async (evt) => {
 try {
 const rawText = evt.target?.result as string;
 const parsed = await verifyAndUnwrapBackup(rawText);

 if (
 !parsed.products ||
 !parsed.users ||
 !parsed.branches
 ) {
 throw new Error(
 "Schema validator failure: Missing core lists.",
 );
 }

 // Create snapshot entry to allow reversibility
 const newSnap: DbSnapshot = {
 id: `SNAP-IMPORT-${Date.now()}`,
 name: `Imported Backup File: ${file.name}`,
 timestamp: new Date().toISOString(),
 creator: currentUser.fullName,
 sizeBytes: new Blob([rawText]).size,
 data: JSON.stringify(parsed),
 };

 // Save to server
 await fetch('/api/db/backups', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ snapshot: newSnap })
 });

 // Apply changes directly using atomic restore
 await restoreDbSnapshot(newSnap.id);

 setDbBackupFileMessage(
 `SUCCESSFULLY IMPORTED PORTABLE BACKUP: "${file.name}" APPROVED. Reloading UI...`,
 );
 setDbBackupFileError(null);
 showToast(
 `Successfully restored imported backup!`,
 );

 setTimeout(() => {
 window.location.reload();
 }, 1500);
 } catch (err: any) {
 setDbBackupFileError(
 `ERROR: APPROVED FILE IS CORRUPTED OR INVALID SCHEMA: ${err.message}`,
 );
 setDbBackupFileMessage(null);
 showToast(
 `Import rejected due to structural validation faults.`,
 );
 }
 };
 reader.readAsText(file);
 }}
 />
 </label>

 {dbBackupFileMessage && (
 <div className="p-3 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-center">
 {dbBackupFileMessage}
 </div>
 )}
 {dbBackupFileError && (
 <div className="p-3 text-[10.5px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 rounded-xl text-center">
 {dbBackupFileError}
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Modal Actions Footer */}
 <div className="pt-4 mt-4 border-t border-m3-outline-variant/15 flex justify-end">
 <button
 type="button"
 onClick={() => {
 setShowDatabaseCoreModal(false);
 setDbBackupFileMessage(null);
 setDbBackupFileError(null);
 setManualSnapshotName("");
 }}
 className="px-5 py-2.5 bg-m3-surface hover:bg-m3-outline-variant/15 text-m3-on-surface font-extrabold text-xs uppercase tracking-wide border border-m3-outline-variant/10 rounded-full cursor-pointer transition-all hover:"
 >
 Done
 </button>
 </div>
 </div>
 </div>
 )}

 {/* MODAL: Account Settings Password update form (Cashiers can ONLY change password) */}
 {showAccountSettingsModal && (
 <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[99999] p-4 animate-fade-in">
 <div
 className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm"
 onClick={() => {
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setSettingsError("");
 setShowAccountSettingsModal(false);
 }}
 />
 <form
 onSubmit={handleUpdatePassword}
 className="relative w-full max-w-md rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-4 text-left font-sans"
 >
 <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="p-2 mr-0.5 bg-amber-500/10 text-amber-500 rounded-2xl">
 <LockKeyhole className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-wider">
 Account Settings
 </h3>
 <p className="text-[10px] text-amber-500 font-extrabold font-mono uppercase tracking-widest">
 {currentUser.role === UserRole.CASHIER
 ? "Password Change Only"
 : "Corporate Identity Settings"}
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => {
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setSettingsError("");
 setShowAccountSettingsModal(false);
 }}
 className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/10 transition-colors"
 title="Dismiss Account Settings Window"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 {/* Profile Overview Card (Editable details & Avatar selector) */}
 <div className="space-y-4">
 <div className="text-[10.5px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 pl-1">
 <span>Corporate Identity Details</span>
 </div>

 {/* Full Name & Username inputs */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">
 Full Name
 </label>
 <input
 type="text"
 required
 value={editFullName}
 onChange={(e) => setEditFullName(e.target.value)}
 placeholder="Enter full name"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">
 Username
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2 text-zinc-500 text-xs font-mono select-none">
 @
 </span>
 <input
 type="text"
 required
 value={editUsername}
 onChange={(e) => setEditUsername(e.target.value)}
 placeholder="Username"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant pl-7 pr-3 py-2 text-xs text-m3-on-surface font-mono focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Change Password Form Container */}
 <div className="space-y-3 pt-1 border-t border-m3-outline-variant/15">
 <div className="text-[10.5px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 pl-1">
 <span>Update Security Password (Optional)</span>
 </div>

 {/* Current Password field */}
 <div className="space-y-1 relative">
 <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">
 Current Password
 </label>
 <div className="relative">
 <input
 type={showCurrentPassword ? "text" : "password"}
 value={currentPassword}
 onChange={(e) => {
 setCurrentPassword(e.target.value);
 setSettingsError("");
 }}
 placeholder="Provide current login password to verify"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
 />
 <button
 type="button"
 onClick={() =>
 setShowCurrentPassword(!showCurrentPassword)
 }
 className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-m3-on-surface transition-colors cursor-pointer"
 >
 {showCurrentPassword ? (
 <EyeOff className="h-4 w-4" />
 ) : (
 <Eye className="h-4 w-4" />
 )}
 </button>
 </div>
 </div>

 {/* New Password field */}
 <div className="space-y-1 relative">
 <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">
 New Password (Min 6 Characters)
 </label>
 <div className="relative">
 <input
 type={showNewPassword ? "text" : "password"}
 value={newPassword}
 onChange={(e) => {
 setNewPassword(e.target.value);
 setSettingsError("");
 }}
 placeholder="Enter brand new terminal password"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
 />
 <button
 type="button"
 onClick={() => setShowNewPassword(!showNewPassword)}
 className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-m3-on-surface transition-colors cursor-pointer"
 >
 {showNewPassword ? (
 <EyeOff className="h-4 w-4" />
 ) : (
 <Eye className="h-4 w-4" />
 )}
 </button>
 </div>
 </div>

 {/* Confirm New Password field */}
 <div className="space-y-1 relative">
 <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest pl-1">
 Confirm New Password
 </label>
 <input
 type={showNewPassword ? "text" : "password"}
 value={confirmPassword}
 onChange={(e) => {
 setConfirmPassword(e.target.value);
 setSettingsError("");
 }}
 placeholder="Repeat brand new password to confirm"
 className="w-full bg-m3-surface border-b-2 border-m3-outline-variant px-3 py-2 text-xs text-m3-on-surface focus:outline-none focus:border-amber-500 transition-colors rounded-t-lg font-sans"
 />
 </div>

 {settingsError ? (
 <p className="text-[9.5px] font-bold text-rose-500 px-1 animate-pulse leading-normal">
 {settingsError}
 </p>
 ) : (
 <p className="text-[9px] text-zinc-400 px-1 leading-normal font-medium flex items-center gap-1">
 <span>
 Your account security credentials will be encrypted and
 updated securely.
 </span>
 </p>
 )}
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t border-m3-outline-variant/15 font-sans">
 <button
 type="button"
 onClick={() => {
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 setSettingsError("");
 setShowAccountSettingsModal(false);
 }}
 className="px-4 py-2 bg-m3-outline-variant/10 hover:bg-m3-outline-variant/20 rounded-full text-zinc-300 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isUpdatingPassword}
 className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:brightness-50"
 >
 {isUpdatingPassword
 ? "Saving Hashed Token..."
 : "Update Password"}
 </button>
 </div>
 </form>
 </div>
 )}

 {/* FLOAT TOAST ALERT CHIP */}
 {toastMessage && (
 <div className="fixed bottom-24 md:bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-black py-3 px-5 rounded-[16px] shadow-2xl z-50 border border-m3-outline-variant/20 flex items-center gap-2 animate-slide-up max-w-[340px]">
 <span>{toastMessage}</span>
 </div>
 )}

 {/* PRIVACY SHIELD & ACCESSIBILITY HUB FLOATING SUITE */}
 <PrivacyAccessibilityHub
 darkMode={darkMode}
 hideFloatingButton={true}
 />



 {/* QUICK MODULE SWITCHER & KEYBOARD SHORTCUT COMMAND PALETTE */}
 <QuickModuleSwitcherModal
 isOpen={showQuickSwitcherModal}
 onClose={() => setShowQuickSwitcherModal(false)}
 currentUser={currentUser}
 activeTab={activeTab}
 onSelectTab={(tabId) => changeTab(tabId)}
 />

 {/* GLOBAL SYSTEM PROCESSING OVERLAY */}
 <SystemLoadingOverlay />

 {/* EXPRESSIVE MATERIAL 3 IDLE SCREEN OVERLAY */}
 <IdleScreen />

 {/* DYNAMIC ALWAYS-ON PWA INSTALL CONVERSION PROMPT */}
 <PwaInstallPrompt />

 {/* SHOW SETUP WIZARD OVERLAY MODAL */}
 {showSetupWizard && (
 <OnboardingSetupWizard onClose={() => setShowSetupWizard(false)} />
 )}

 {/* Restore Snapshot Confirmation Modal */}
 <ConfirmationModal
 isOpen={!!confirmRestoreSnap}
 title="Restore Database Snapshot"
 alertType="danger"
 confirmText="Yes, Restore Snapshot"
 cancelText="Cancel"
 message={`Are you sure you want to restore all tables to the state in snap "${confirmRestoreSnap?.name || ''}"? This replaces current data in local storage.`}
 onConfirm={async () => {
 if (!confirmRestoreSnap) return;
 const snap = confirmRestoreSnap;
 setConfirmRestoreSnap(null);
 await triggerSystemProcessing(
 `Restoring Database State: ${snap.name}...`,
 1800,
 "db",
 undefined,
 "Shutting down write engines, swapping table pointers, and updating local indices...",
 );
 const success = await restoreDbSnapshot(snap.id);
 if (success) {
 showToast(
 `Snapshot ${snap.id} restored successfully! Reloading UI...`,
 );
 setTimeout(
 () => window.location.reload(),
 250,
 );
 } else {
 showToast(
 "Corruption Error: Snapshot load failure!",
 );
 }
 }}
 onCancel={() => setConfirmRestoreSnap(null)}
 />
 </div>
 </MotionConfig>
 );
}

export default function App() {
 return (
 <DbProvider>
 <AppContent />
 </DbProvider>
 );
}
