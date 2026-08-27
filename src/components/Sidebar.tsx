/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Branch, UserRole } from "../types/db";
import {
  Layers,
  HelpCircle,
  LogOut,
  X,
  LucideIcon,
  Sun,
  Moon,
  LockKeyhole,
  PanelLeftClose,
  PanelLeft,
  Store,
  Settings
} from "lucide-react";

export interface SidebarCategoryItem {
  id: string;
  name: string;
  icon: LucideIcon;
  subItems: Array<{
    id: string;
    name: string;
    roles?: UserRole[];
  }>;
}

interface SidebarProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  isSidebarHidden?: boolean;
  activeTab: string;
  changeTab: (tab: string) => void;
  currentUser: User;
  branches: Branch[];
  darkMode: boolean;
  handleToggleDarkMode: (targetVal?: boolean) => void;
  setShowAccountSettingsModal: (show: boolean) => void;
  setShowSystemSettingsModal?: (show: boolean) => void;
  setShowLogoutConfirmModal: (show: boolean) => void;
  parkedSales: any[];
  deliveries: any[];
  stockTransfers: any[];
  getBranchName: (branchId: string | null) => string;
  categories: SidebarCategoryItem[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarExpanded,
  setIsSidebarExpanded,
  isSidebarHidden,
  activeTab,
  changeTab,
  currentUser,
  darkMode,
  handleToggleDarkMode,
  setShowAccountSettingsModal,
  setShowSystemSettingsModal,
  setShowLogoutConfirmModal,
  parkedSales,
  deliveries,
  stockTransfers,
  getBranchName,
  categories,
  isMobileOpen,
  onCloseMobile
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        isProfileMenuOpen &&
        !target.closest("#sidebar-profile-menu") &&
        !target.closest("#sidebar-profile-trigger")
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  // Current branch display name
  const branchName = useMemo(() => {
    return getBranchName(currentUser.branchAssignmentId);
  }, [currentUser.branchAssignmentId, getBranchName]);

  // User role label & badge color
  const roleBadge = useMemo(() => {
    switch (currentUser.role) {
      case UserRole.ADMIN:
        return { label: "Admin", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case UserRole.MANAGER:
        return { label: "Manager", bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" };
      case UserRole.CASHIER:
        return { label: "Cashier", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      default:
        return { label: "Staff", bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" };
    }
  }, [currentUser.role]);

  // Notification indicator flags
  const showSaleAlert = parkedSales && parkedSales.length > 0;
  const showDeliveriesAlert = deliveries && deliveries.some(
    (d) => d.status === "Scheduled" || d.status === "Packed" || d.status === "Out For Delivery"
  );
  const showTransfersAlert = stockTransfers && stockTransfers.some((t) => t.status === "Pending");

  // Filter categories and sub-items based on RBAC
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        // Filter sub-items by role
        const allowedSubs = cat.subItems.filter((sub) => {
          if (!sub.roles || sub.roles.length === 0) return true;
          return sub.roles.includes(currentUser.role);
        });

        return {
          ...cat,
          subItems: allowedSubs
        };
      })
      .filter((cat) => cat.subItems.length > 0);
  }, [categories, currentUser.role]);

  // Handle module click - switches directly to the first accessible sub-item or category ID
  const handleCategoryClick = (cat: SidebarCategoryItem) => {
    if (cat.subItems && cat.subItems.length > 0) {
      changeTab(cat.subItems[0].id);
    } else {
      changeTab(cat.id);
    }
    onCloseMobile?.();
  };

  const userEmail = currentUser.email || `${currentUser.username || "user"}@tilepoint.com`;

  // Render navigation content without nested accordions/dropdowns
  const renderNavContent = () => (
    <div className="space-y-4">
      {/* Main Category List (Clean flat layout without dropdowns) */}
      <div className="space-y-1.5 overflow-visible">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon || Layers;
          const isCategoryActive =
            activeTab === cat.id ||
            cat.subItems.some((s) => s.id === activeTab) ||
            (cat.id === "sale" && (activeTab === "pos" || activeTab === "sale" || activeTab === "shift" || activeTab === "calculator")) ||
            (cat.id === "inventory" && (activeTab === "inventory" || activeTab.startsWith("inventory-"))) ||
            (cat.id === "admin-bi" && (activeTab === "dashboard" || activeTab === "profit-analytics")) ||
            (cat.id === "admin-org" && (activeTab === "branches" || activeTab === "users" || activeTab === "archives"));

          // Live indicator badges
          let categoryBadge: React.ReactNode = null;
          if (cat.id === "sale" && showSaleAlert) {
            categoryBadge = (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse ml-auto" />
            );
          } else if (cat.id === "deliveries" && showDeliveriesAlert) {
            categoryBadge = (
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse ml-auto" />
            );
          } else if (cat.id === "inventory" && showTransfersAlert) {
            categoryBadge = (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
            );
          }

          if (!isSidebarExpanded) {
            // Collapsed icon view (crisp bounded square, no overflow cut)
            return (
              <div key={cat.id} className="flex flex-col items-center gap-1 group relative py-0.5">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isCategoryActive
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : "text-default-500 hover:text-foreground hover:bg-default-100/70"
                  }`}
                  title={cat.name}
                >
                  <Icon className="h-4.5 w-4.5" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer group ${
                isCategoryActive
                  ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                  : "text-default-600 hover:text-foreground hover:bg-default-100/70 font-medium"
              }`}
              title={`Open ${cat.name}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isCategoryActive ? "text-primary-foreground" : "text-default-400 group-hover:text-foreground"
                  }`}
                />
                <span className="truncate text-xs font-bold tracking-tight">
                  {cat.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {categoryBadge}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP HEROUI SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarHidden ? 0 : isSidebarExpanded ? 260 : 72
        }}
        style={{ willChange: "width" }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`hidden md:flex select-none bg-background border-r border-divider/30 py-4 px-3 sticky top-0 flex-col justify-between h-screen transition-colors duration-200 shrink-0 ${
          isProfileMenuOpen ? "z-[9999] overflow-visible" : "z-40 overflow-hidden"
        } ${isSidebarHidden ? "!hidden" : ""}`}
      >
        <div className="flex flex-col gap-4 min-w-0 flex-1 overflow-hidden">
          {/* USER PROFILE HEADER */}
          <div
            id="sidebar-profile-trigger"
            onClick={() => isSidebarExpanded && setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center gap-3 cursor-pointer p-2 rounded-2xl bg-content1/50 border border-divider/20 hover:bg-content1 hover:border-divider/40 transition-all ${
              isSidebarExpanded ? "px-3" : "justify-center"
            }`}
            title="User Profile & Account Menu"
          >
            {/* Gradient Avatar */}
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-400 to-emerald-400 flex items-center justify-center text-slate-900 font-black text-xs shadow-xs shrink-0 overflow-hidden ring-2 ring-background">
              {currentUser.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.fullName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.fullName?.charAt(0) || "U"
              )}
            </div>

            {/* Name, Role & Branch */}
            {isSidebarExpanded && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-foreground truncate leading-tight">
                    {currentUser.fullName || "Operator"}
                  </span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border uppercase ${roleBadge.bg}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-default-400 font-medium truncate mt-0.5">
                  <Store className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{branchName}</span>
                </div>
              </div>
            )}
          </div>

          {/* SCROLLABLE ERP MODULE LIST */}
          <div className="flex-1 overflow-y-auto px-0.5 space-y-2 scrollbar-none">
            {renderNavContent()}
          </div>
        </div>

        {/* BOTTOM SECTION: UTILITIES & ACTIONS */}
        <div className="flex flex-col gap-1 pt-3 border-t border-divider/25 shrink-0">
          {/* Help & Tutorials */}
          <button
            type="button"
            onClick={() => changeTab("tutorials")}
            className={`w-full flex items-center ${
              isSidebarExpanded ? "px-3 py-2 justify-start" : "h-9 w-9 justify-center mx-auto"
            } rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tutorials"
                ? "bg-primary text-primary-foreground font-bold shadow-xs shadow-primary/20"
                : "text-default-500 hover:text-foreground hover:bg-default-100/60"
            }`}
            title={!isSidebarExpanded ? "Help & Documentation" : undefined}
          >
            <HelpCircle
              className={`h-4 w-4 shrink-0 ${
                activeTab === "tutorials" ? "text-primary-foreground" : "text-default-400"
              }`}
            />
            {isSidebarExpanded && <span className="ml-2.5 text-xs">Help & Documentation</span>}
          </button>

          {/* Theme & Collapse Controls */}
          {isSidebarExpanded ? (
            <div className="flex items-center justify-between px-3 py-1.5 text-xs text-default-400">
              <span className="text-[11px] font-medium">Theme & Layout</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleDarkMode(!darkMode)}
                  className="p-1.5 rounded-lg hover:bg-default-100 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                  title="Toggle Light / Dark Mode"
                  aria-label="Toggle Theme"
                >
                  {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarExpanded(false)}
                  className="p-1.5 rounded-lg hover:bg-default-100 text-default-500 hover:text-foreground transition-colors cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleDarkMode(!darkMode)}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-default-500 hover:text-foreground hover:bg-default-100/60 transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarExpanded(true)}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-default-500 hover:text-foreground hover:bg-default-100/60 transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Sign Out */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(true)}
            className={`w-full flex items-center ${
              isSidebarExpanded ? "px-3 py-2 justify-start" : "h-9 w-9 justify-center mx-auto"
            } rounded-xl text-xs font-medium text-default-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer`}
            title={!isSidebarExpanded ? "Sign Out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0 text-default-400 group-hover:text-rose-500" />
            {isSidebarExpanded && <span className="ml-2.5 text-xs">Sign Out</span>}
          </button>
        </div>

        {/* PROFILE ACTIONS POPUP / ACCOUNT MENU */}
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              id="sidebar-profile-menu"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-20 left-3 right-3 rounded-2xl bg-content1 border border-divider/40 p-2.5 shadow-2xl z-50 text-xs space-y-1.5 backdrop-blur-md"
            >
              <div className="px-3 py-2 border-b border-divider/20">
                <p className="font-black text-foreground truncate text-xs">{currentUser.fullName}</p>
                <p className="text-[10px] text-default-400 truncate">{userEmail}</p>
                <div className="mt-1 flex items-center gap-1 text-[9px] text-primary font-bold">
                  <span>Branch: {branchName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setShowAccountSettingsModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-default-600 hover:text-foreground hover:bg-default-100 font-medium transition-colors cursor-pointer"
              >
                <LockKeyhole className="h-3.5 w-3.5 text-amber-500" />
                <span>Account Security & PIN</span>
              </button>

              {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (setShowSystemSettingsModal) {
                      setShowSystemSettingsModal(true);
                    } else {
                      changeTab("system-settings");
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-default-600 hover:text-foreground hover:bg-default-100 font-medium transition-colors cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  <span>System Settings</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setShowLogoutConfirmModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 font-medium transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out Terminal</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* MOBILE HEROUI DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-[9999] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[290px] bg-background border-r border-divider/30 shadow-2xl flex flex-col justify-between p-4 z-10"
            >
              {/* Header */}
              <div className="flex flex-col gap-4 overflow-hidden flex-1">
                <div className="flex items-center justify-between border-b border-divider/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center text-slate-900 font-black text-xs shadow-xs overflow-hidden">
                      {currentUser.profilePicture ? (
                        <img
                          src={currentUser.profilePicture}
                          alt={currentUser.fullName}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        currentUser.fullName?.charAt(0) || "U"
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black text-foreground leading-tight">
                        {currentUser.fullName || "User"}
                      </div>
                      <div className="text-[10px] text-default-400 font-medium leading-tight mt-0.5">
                        {branchName}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="p-1.5 text-default-400 hover:text-foreground rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Nav Links */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {renderNavContent()}
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="space-y-2 pt-3 border-t border-divider/20 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onCloseMobile?.();
                    changeTab("tutorials");
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    activeTab === "tutorials"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs shadow-primary/20"
                      : "text-default-600 hover:bg-default-100"
                  }`}
                >
                  <HelpCircle className={`h-4 w-4 mr-2 ${activeTab === "tutorials" ? "text-primary-foreground" : "text-default-400"}`} />
                  <span>Help & Documentation</span>
                </button>

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMobile?.();
                      if (setShowSystemSettingsModal) {
                        setShowSystemSettingsModal(true);
                      } else {
                        changeTab("system-settings");
                      }
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-medium text-default-600 hover:bg-default-100 cursor-pointer"
                  >
                    <Settings className="h-4 w-4 mr-2 text-primary" />
                    <span>System Settings</span>
                  </button>
                )}

                <div className="flex items-center justify-between px-2 py-1 text-xs">
                  <span className="text-default-400 font-medium">Dark Mode</span>
                  <button
                    type="button"
                    onClick={() => handleToggleDarkMode(!darkMode)}
                    className="p-1.5 rounded-lg bg-default-100 text-foreground cursor-pointer"
                  >
                    {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onCloseMobile?.();
                    setShowLogoutConfirmModal(true);
                  }}
                  className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
