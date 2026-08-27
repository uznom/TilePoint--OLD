/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
ArrowRightLeft,
ChevronRight,
Keyboard,
LogOut,
Maximize,
Minimize,
Moon,
PanelLeft,
PanelLeftClose,
Search,
ShoppingCart,
Sparkles,
Sun,
Truck
} from "lucide-react";
import React,{ useEffect,useState } from "react";
import { User } from "../types/db";
import { HeroTooltip } from "./common/ui/HeroTooltip";
import { SidebarCategoryItem } from "./Sidebar";

interface DesktopTopBarProps {
  activeTab: string;
  categories: SidebarCategoryItem[];
  currentUser: User;
  currentBranchName: string;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarHidden: boolean;
  setIsSidebarHidden: (hidden: boolean | ((prev: boolean) => boolean)) => void;
  darkMode: boolean;
  onToggleDarkMode: (targetVal?: boolean) => void;
  onOpenQuickSwitcher: () => void;
  onOpenShortcutsModal: () => void;
  setShowAccountSettingsModal: (show: boolean) => void;
  setShowLogoutConfirmModal: (show: boolean) => void;
  changeTab: (tab: string) => void;
  parkedSalesCount?: number;
  pendingDeliveriesCount?: number;
  pendingTransfersCount?: number;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  activeTab,
  categories,
  currentUser,
  currentBranchName,
  isSidebarExpanded,
  setIsSidebarExpanded,
  isSidebarHidden,
  setIsSidebarHidden,
  darkMode,
  onToggleDarkMode,
  onOpenQuickSwitcher,
  onOpenShortcutsModal,
  setShowAccountSettingsModal,
  setShowLogoutConfirmModal,
  changeTab,
  parkedSalesCount = 0,
  pendingDeliveriesCount = 0,
  pendingTransfersCount = 0
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Determine active category and active sub-item
  let activeCategoryName = "Operations";
  let activeModuleName = "Overview";
  let CategoryIcon: any = Sparkles;

  for (const cat of categories) {
    if (cat.id === activeTab) {
      activeCategoryName = cat.name;
      activeModuleName = cat.name;
      CategoryIcon = cat.icon;
      break;
    }
    const matchedSub = cat.subItems.find((s) => s.id === activeTab);
    if (matchedSub) {
      activeCategoryName = cat.name;
      activeModuleName = matchedSub.name;
      CategoryIcon = cat.icon;
      break;
    }
  }

  // Fallbacks for direct tabs
  if (activeTab === "dashboard") {
    activeCategoryName = "Analytics & BI";
    activeModuleName = "Executive Dashboard";
  } else if (activeTab === "pos") {
    activeCategoryName = "Cashier Terminal";
    activeModuleName = "Fast POS Register";
  } else if (activeTab === "profit-analytics") {
    activeCategoryName = "Accounting";
    activeModuleName = "P&L Profit Analytics";
  } else if (activeTab === "tutorials") {
    activeCategoryName = "Help & Training";
    activeModuleName = "Interactive Walkthroughs";
  }

  return (
    <header className="hidden md:flex sticky top-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-b border-divider/25 px-5 py-2.5 items-center justify-between shadow-2xs select-none min-h-[56px] transition-colors">
      {/* LEFT SECTION: Sidebar Toggle & Dynamic Breadcrumb */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
        {/* Toggle Sidebar Button */}
        <HeroTooltip content={isSidebarExpanded ? "Collapse Sidebar (Ctrl+B)" : "Expand Sidebar (Ctrl+B)"} placement="bottom">
          <button
            type="button"
            onClick={() => {
              if (isSidebarHidden) {
                setIsSidebarHidden(false);
                setIsSidebarExpanded(true);
              } else {
                setIsSidebarExpanded((prev) => !prev);
              }
            }}
            className="p-2 text-default-500 hover:text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer shrink-0"
            aria-label="Toggle Sidebar Navigation"
          >
            {isSidebarExpanded ? (
              <PanelLeftClose className="h-4 w-4 text-default-600" />
            ) : (
              <PanelLeft className="h-4 w-4 text-primary" />
            )}
          </button>
        </HeroTooltip>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <div className="flex items-center gap-1.5 text-default-500 font-bold uppercase tracking-wider shrink-0">
            <CategoryIcon className="h-3.5 w-3.5 text-primary opacity-80" />
            <span className="hidden lg:inline">{activeCategoryName}</span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-default-400 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-black text-foreground uppercase tracking-tight font-sans truncate text-xs sm:text-sm">
              {activeModuleName}
            </span>
          </div>
        </div>

        {/* Branch Indicator with Live Sync Pulse */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl bg-content1/80 border border-divider/20 text-xs font-bold shadow-2xs shrink-0">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20" />
          <span className="text-default-500 text-[11px] uppercase tracking-wider font-semibold">
            Branch:
          </span>
          <span className="text-foreground text-[11px] font-black uppercase tracking-tight">
            {currentBranchName || "HQ Master"}
          </span>
        </div>
      </div>

      {/* CENTER: Universal Command Palette Quick Search Bar */}
      <div className="w-72 lg:w-96 max-w-md shrink-0">
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-content1/90 hover:bg-content2/90 border border-divider/30 hover:border-primary/40 text-default-500 hover:text-foreground text-xs font-medium transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="h-3.5 w-3.5 text-default-400 group-hover:text-primary transition-colors shrink-0" />
            <span className="truncate text-default-400 group-hover:text-foreground">
              Search modules & actions...
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 rounded-md bg-background/90 text-foreground border border-divider/40 text-[10px] font-mono font-bold shadow-2xs">
              Ctrl+K
            </kbd>
          </div>
        </button>
      </div>

      {/* RIGHT SECTION: Quick Status Badges, Utilities & Profile */}
      <div className="flex items-center gap-1.5 ml-4 shrink-0">
        {/* Activity Alerts: Parked Sales Badge */}
        {parkedSalesCount > 0 && (
          <HeroTooltip content={`${parkedSalesCount} Parked Transaction(s)`} placement="bottom">
            <button
              type="button"
              onClick={() => changeTab("pos")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{parkedSalesCount}</span>
            </button>
          </HeroTooltip>
        )}

        {/* Activity Alerts: Pending Deliveries */}
        {pendingDeliveriesCount > 0 && (
          <HeroTooltip content={`${pendingDeliveriesCount} Pending Delivery/ies`} placement="bottom">
            <button
              type="button"
              onClick={() => changeTab("deliveries-panel")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>{pendingDeliveriesCount}</span>
            </button>
          </HeroTooltip>
        )}

        {/* Activity Alerts: Pending Transfers */}
        {pendingTransfersCount > 0 && (
          <HeroTooltip content={`${pendingTransfersCount} Pending Stock Transfer(s)`} placement="bottom">
            <button
              type="button"
              onClick={() => changeTab("inventory-transfer")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/25 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>{pendingTransfersCount}</span>
            </button>
          </HeroTooltip>
        )}

        {/* Keyboard Shortcuts Cheatsheet Trigger */}
        <HeroTooltip content="Keyboard Shortcuts (?)" placement="bottom">
          <button
            type="button"
            onClick={onOpenShortcutsModal}
            className="p-2 text-default-500 hover:text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer"
            aria-label="Keyboard Shortcuts Cheatsheet"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </HeroTooltip>

        {/* Fullscreen Mode Toggle */}
        <HeroTooltip content={isFullscreen ? "Exit Fullscreen (F11)" : "Fullscreen Workspace (F11)"} placement="bottom">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 text-default-500 hover:text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4 text-primary" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </HeroTooltip>

        {/* Theme Switcher Toggle */}
        <HeroTooltip content={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} placement="bottom">
          <button
            type="button"
            onClick={() => onToggleDarkMode(!darkMode)}
            className="p-2 text-default-500 hover:text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer"
            aria-label="Toggle Theme Mode"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-primary hover:-rotate-12 transition-transform" />
            )}
          </button>
        </HeroTooltip>

        {/* Live Digital Clock (Hidden on smaller desktop) */}
        <div className="hidden 2xl:flex items-center px-2.5 py-1 text-[11px] font-mono font-bold text-default-500 bg-content1/50 rounded-xl border border-divider/15">
          {currentTime}
        </div>

        {/* User Account Security Trigger */}
        <HeroTooltip content={`${currentUser.fullName} (${currentUser.role})`} placement="bottom">
          <button
            type="button"
            onClick={() => setShowAccountSettingsModal(true)}
            className="ml-1 flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-content1/80 hover:bg-content2 border border-divider/25 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
              {currentUser.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.fullName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.avatarInitials || "U"
              )}
            </div>
            <div className="text-left hidden lg:block">
              <span className="text-xs font-black text-foreground block leading-none truncate max-w-[100px]">
                {currentUser.fullName.split(" ")[0]}
              </span>
              <span className="text-[9px] text-default-500 font-bold uppercase tracking-wider block mt-0.5 leading-none">
                {currentUser.role}
              </span>
            </div>
          </button>
        </HeroTooltip>

        {/* Quick Terminal Exit / Sign Out Trigger */}
        <HeroTooltip content="Sign Out Terminal" placement="bottom">
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(true)}
            className="p-2 text-default-500 hover:text-danger hover:bg-danger/10 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </HeroTooltip>
      </div>
    </header>
  );
};
