/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { User, Branch } from '../../types/db';
import { Sidebar, SidebarCategoryItem } from '../Sidebar';
import { HeaderNavTabs } from '../HeaderNavTabs';
import { AppAlertBanners, AppAlertBannersProps } from './AppAlertBanners';
import { MobileBottomNav } from '../MobileBottomNav';
import { HeroAvatarSyncStatus } from '../common/ui/HeroAvatar';

export interface AppShellProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  currentUser: User | null;
  branches: Branch[];
  selectedBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  getBranchName: (branchId: string | null) => string;
  categories: SidebarCategoryItem[];
  darkMode: boolean;
  onToggleDarkMode: (targetVal?: boolean) => void;
  onOpenQuickSwitcher: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenAccountSettings: () => void;
  onOpenSystemSettings?: () => void;
  onOpenLogoutConfirm: () => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  isSidebarHidden?: boolean;
  setIsSidebarHidden?: (hidden: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  alertBannersProps: AppAlertBannersProps;
  parkedSalesCount?: number;
  pendingDeliveriesCount?: number;
  pendingTransfersCount?: number;
  parkedSales?: any[];
  deliveries?: any[];
  stockTransfers?: any[];
  hasInventoryAlert?: boolean;
  hasSaleAlert?: boolean;
  hasTotalAlerts?: boolean;
  syncStatus?: HeroAvatarSyncStatus;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onChangeTab,
  currentUser,
  branches,
  selectedBranchId,
  onSelectBranch,
  getBranchName,
  categories,
  darkMode,
  onToggleDarkMode,
  onOpenQuickSwitcher,
  onOpenKeyboardShortcuts,
  onOpenAccountSettings,
  onOpenSystemSettings,
  onOpenLogoutConfirm,
  isSidebarExpanded,
  setIsSidebarExpanded,
  isSidebarHidden = false,
  setIsSidebarHidden,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  alertBannersProps,
  parkedSalesCount = 0,
  pendingDeliveriesCount = 0,
  pendingTransfersCount = 0,
  parkedSales = [],
  deliveries = [],
  stockTransfers = [],
  hasInventoryAlert = false,
  hasSaleAlert = false,
  hasTotalAlerts = false,
  syncStatus,
  children,
}) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200 selection:bg-primary/20 selection:text-primary overflow-hidden">
      {/* PERSISTENT CRITICAL SYSTEM ALERTS */}
      <AppAlertBanners {...alertBannersProps} />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Restore Floating Button (if sidebar is explicitly hidden) */}
        {isSidebarHidden && setIsSidebarHidden && (
          <button
            type="button"
            onClick={() => setIsSidebarHidden(false)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[45] p-2 bg-primary text-primary-foreground rounded-r-2xl border-y border-r border-divider/35 shadow-2xl hover:bg-primary/95 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
            title="Restore Navigation Sidebar"
          >
            <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* MODERN HEROUI SIDEBAR */}
        {currentUser && (
          <Sidebar
            isSidebarExpanded={isSidebarExpanded}
            setIsSidebarExpanded={setIsSidebarExpanded}
            isSidebarHidden={isSidebarHidden}
            activeTab={activeTab}
            changeTab={onChangeTab}
            currentUser={currentUser}
            branches={branches}
            darkMode={darkMode}
            handleToggleDarkMode={onToggleDarkMode}
            setShowAccountSettingsModal={onOpenAccountSettings}
            setShowSystemSettingsModal={onOpenSystemSettings}
            setShowLogoutConfirmModal={onOpenLogoutConfirm}
            parkedSales={parkedSales}
            deliveries={deliveries}
            stockTransfers={stockTransfers}
            getBranchName={getBranchName}
            categories={categories}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            syncStatus={syncStatus}
          />
        )}

        {/* MAIN VIEWPORT CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          {/* Atmospheric Ambient Canvas Radiance */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.04] dark:bg-primary/[0.07] rounded-full blur-[140px] pointer-events-none -z-0 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-secondary/[0.03] dark:bg-purple-600/[0.05] rounded-full blur-[130px] pointer-events-none -z-0 -translate-x-1/3 translate-y-1/3" />

          {/* DOCKED SUB-NAVIGATION TABS (Only rendered if the active module has multiple sub-tabs) */}
          <HeaderNavTabs
            activeTab={activeTab}
            onChangeTab={onChangeTab}
            currentUser={currentUser}
            parkedSalesCount={parkedSalesCount}
            pendingDeliveriesCount={pendingDeliveriesCount}
            pendingTransfersCount={pendingTransfersCount}
            categories={categories}
          />

          {/* MODULE VIEWPORT CANVAS */}
          <main
            className={`flex-1 relative flex flex-col text-foreground transition-all duration-200 overflow-x-hidden min-h-0 ${
              activeTab === 'pos' || activeTab === 'ledger'
                ? 'p-1.5 sm:p-2.5 md:p-3 pb-16 md:pb-2 overflow-y-auto lg:overflow-hidden h-full max-h-full'
                : 'p-3 sm:p-5 md:p-6 pb-20 md:pb-6 overflow-y-auto scroll-smooth mobile-scroll-container'
            }`}
          >
            <div className="flex-1 min-h-0 flex flex-col">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  style={{ willChange: 'transform, opacity' }}
                  className="h-full w-full flex flex-col min-h-0 overflow-x-hidden"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      {currentUser && (
        <MobileBottomNav
          activeTab={activeTab}
          changeTab={onChangeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          cartCount={parkedSalesCount}
          hasInventoryAlert={hasInventoryAlert || pendingTransfersCount > 0}
          hasSaleAlert={hasSaleAlert || parkedSalesCount > 0}
          hasTotalAlerts={hasTotalAlerts}
        />
      )}
    </div>
  );
};

export default AppShell;
