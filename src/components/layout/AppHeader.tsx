import React from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Search,
  Sun,
  Moon,
  Keyboard,
  Store,
} from 'lucide-react';
import { User, Branch, UserRole } from '../../types/db';
import { SidebarCategoryItem } from '../Sidebar';
import { HeroTooltip } from '../common/ui';
import { HeroAvatar, HeroAvatarSyncStatus } from '../common/ui/HeroAvatar';

export interface AppHeaderProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  currentUser: User | null;
  branches: Branch[];
  selectedBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  getBranchName: (branchId: string | null) => string;
  categories: SidebarCategoryItem[];
  isSidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onOpenQuickSwitcher: () => void;
  onOpenKeyboardShortcuts?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenProfileModal?: () => void;
  serverDegradedState?: {
    isDegraded: boolean;
    queuedWritesCount?: number;
    lastDegradedReason?: string;
  } | null;
  onRefreshServerStatus?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  syncStatus?: HeroAvatarSyncStatus;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  branches,
  selectedBranchId,
  onSelectBranch,
  getBranchName,
  categories,
  isSidebarExpanded,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenQuickSwitcher,
  onOpenKeyboardShortcuts,
  darkMode,
  onToggleDarkMode,
  onOpenProfileModal,
  serverDegradedState,
  onRefreshServerStatus,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  syncStatus,
}) => {
  const activeBranchName = getBranchName(selectedBranchId || currentUser?.branchAssignmentId || null);

  const isDegraded = Boolean(serverDegradedState?.isDegraded);
  const queuedWrites = serverDegradedState?.queuedWritesCount ?? 0;

  return (
    <header className="h-14 min-h-[56px] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 select-none transition-colors duration-200 shrink-0">
      {/* Left Zone: Sidebar Toggles */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-default-600 hover:text-foreground hover:bg-content2 transition-all active:scale-95 cursor-pointer"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Collapse / Expand Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-xl text-default-500 hover:text-foreground hover:bg-content2 transition-all active:scale-95 cursor-pointer"
          title={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-label={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isSidebarExpanded ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Center Zone: Global Quick Command Search Bar */}
      <div className="flex-1 max-w-md mx-2 hidden lg:flex items-center justify-center">
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 text-default-500 hover:text-foreground transition-all duration-200 cursor-pointer shadow-2xs group active:scale-[0.99]"
          title="Search commands, modules, and workflows (Ctrl + K)"
        >
          <div className="flex items-center gap-2 text-xs font-medium truncate">
            <Search className="h-3.5 w-3.5 text-default-400 group-hover:text-primary transition-colors" />
            <span className="truncate">Quick jump, catalog or commands...</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/10 text-default-600 dark:text-default-400 rounded-md shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Zone: System Badges & Quick Action Icons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="lg:hidden p-2 rounded-xl text-default-500 hover:text-foreground hover:bg-content2 transition-all active:scale-95 cursor-pointer"
          title="Search (Ctrl + K)"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Real-time DB Engine Status Indicator */}
        <div className="hidden sm:flex items-center">
          {isDegraded ? (
            <HeroTooltip content={`MySQL Offline: ${queuedWrites} writes queued locally`}>
              <button
                type="button"
                onClick={onRefreshServerStatus}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold transition-all active:scale-95 cursor-pointer hover:bg-amber-500/25"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Buffer ({queuedWrites})</span>
              </button>
            </HeroTooltip>
          ) : (
            <HeroTooltip content="Database: MySQL Connection Pool Active & Healthy">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold select-none">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="hidden md:inline font-mono">Live DB</span>
              </div>
            </HeroTooltip>
          )}
        </div>

        {/* Active Branch Badge / Switcher */}
        {branches && branches.length > 0 && (
          <div className="flex items-center">
            {onSelectBranch && branches.length > 1 && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER) ? (
              <select
                value={selectedBranchId || currentUser?.branchAssignmentId || ''}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="h-8 pl-2 pr-6 py-1 bg-content2 border border-divider/40 rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none truncate max-w-[140px]"
                title="Active Branch Site"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-content2/80 border border-divider/30 rounded-xl text-xs font-semibold text-foreground truncate max-w-[130px] select-none">
                <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{activeBranchName}</span>
              </div>
            )}
          </div>
        )}

        {/* Theme Light/Dark Mode Switch */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-default-500 hover:text-foreground hover:bg-content2 transition-all active:scale-95 cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Color Theme"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
        </button>

        {/* Keyboard Shortcuts Trigger */}
        {onOpenKeyboardShortcuts && (
          <button
            type="button"
            onClick={onOpenKeyboardShortcuts}
            className="hidden sm:flex p-2 rounded-xl text-default-500 hover:text-foreground hover:bg-content2 transition-all active:scale-95 cursor-pointer"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        )}

        {/* User Profile Avatar Trigger */}
        {currentUser && onOpenProfileModal && (
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-primary/40 transition-all active:scale-95 cursor-pointer ml-1"
            title={`Account Settings (${currentUser.fullName || currentUser.username})`}
            aria-label={`Account Settings for ${currentUser.fullName || currentUser.username}`}
          >
            <HeroAvatar
              src={currentUser.profilePicture}
              name={currentUser.fullName || currentUser.username}
              size="sm"
              syncStatus={syncStatus || (serverDegradedState?.isDegraded ? 'not connected' : 'connected')}
              syncVariant="both"
              showSyncTooltip
            />
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
