/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
Building2,
Menu,
Search
} from "lucide-react";
import React from "react";
import { User } from "../types/db";
import { SidebarCategoryItem } from "./Sidebar";

interface MobileTopBarProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenQuickSwitcher: () => void;
  currentUser: User;
  currentBranchName: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  hasAlerts?: boolean;
  categories: SidebarCategoryItem[];
  setShowAccountSettingsModal?: (show: boolean) => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenQuickSwitcher,
  currentUser,
  currentBranchName,
  hasAlerts,
  categories,
  setShowAccountSettingsModal
}) => {
  // Determine current tab name from categories
  let activeName = "TilePoint ERP";

  for (const cat of categories) {
    if (cat.id === activeTab) {
      activeName = cat.name;
      break;
    }
    const matchedSub = cat.subItems.find((s) => s.id === activeTab);
    if (matchedSub) {
      activeName = matchedSub.name;
      break;
    }
  }

  // Fallbacks for special tabs
  if (activeTab === "dashboard") activeName = "Executive Dashboard";
  if (activeTab === "pos") activeName = "POS Checkout";
  if (activeTab === "profit-analytics") activeName = "Profit Analytics";
  if (activeTab === "tutorials") activeName = "Walkthrough Guides";

  return (
    <header className="flex md:hidden sticky top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-divider/25 px-3 py-2 items-center justify-between shadow-xs select-none min-h-[52px]">
      {/* LEFT: Mobile Menu Button & Brand + Active Module */}
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="relative p-2 text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/25 transition-all cursor-pointer shrink-0"
          aria-label="Open Navigation Drawer"
          title="Open Menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
          {hasAlerts && (
            <span className="absolute 1.5 top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background animate-pulse" />
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/icon.svg"
            alt="TilePoint"
            className="h-7 w-7 rounded-lg border border-divider/20 p-0.5 bg-content1 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xs font-black tracking-tight text-foreground truncate uppercase font-sans leading-none">
              {activeName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] text-primary font-bold uppercase tracking-wider truncate flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5 inline shrink-0 opacity-80" />
                {currentBranchName || "Main HQ"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Quick Command Search, User Profile */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Quick Command Switcher */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="p-2 text-default-500 hover:text-foreground hover:bg-content2 active:scale-95 rounded-xl border border-divider/20 transition-all cursor-pointer"
          title="Search modules & actions (Cmd+K)"
          aria-label="Search modules"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* User Avatar Chip */}
        <button
          type="button"
          onClick={() => {
            if (setShowAccountSettingsModal) {
              setShowAccountSettingsModal(true);
            } else {
              onOpenMobileMenu();
            }
          }}
          className="ml-0.5 h-8 w-8 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-xs border border-primary/30 active:scale-95 transition-all overflow-hidden shrink-0"
          title={`${currentUser.fullName} (${currentUser.role})`}
        >
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
        </button>
      </div>
    </header>
  );
};
