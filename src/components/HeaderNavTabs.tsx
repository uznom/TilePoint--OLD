/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import {
  Package,
  Activity,
  ArrowRightLeft,
  Sliders,
  Database,
  AlertTriangle,
  Clock,
  DollarSign,
  ShoppingCart,
  Calculator,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  Settings,
  Archive,
  HelpCircle,
  Truck,
  CreditCard,
  Award,
  PlusCircle,
  Search,
  RotateCcw,
  Undo2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LucideIcon
} from 'lucide-react';
import { User, UserRole } from '../types/db';
import { SidebarCategoryItem } from './Sidebar';
import { useFeatureFlags } from '../utils/featureFlags';

interface HeaderNavTabsProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  currentUser: User | null;
  parkedSalesCount?: number;
  pendingDeliveriesCount?: number;
  pendingTransfersCount?: number;
  categories: SidebarCategoryItem[];
}

const getSubTabIcon = (subId: string): LucideIcon => {
  switch (subId) {
    case 'inventory-stocks':
    case 'catalog':
      return Package;
    case 'inventory-adjustments':
    case 'movements':
      return Activity;
    case 'inventory-transfer':
    case 'transfers':
      return ArrowRightLeft;
    case 'inventory-logistics':
    case 'ledger':
      return Sliders;
    case 'inventory-import':
    case 'import':
      return Database;
    case 'inventory-damage':
      return AlertTriangle;
    case 'inventory-expiry':
    case 'expiry':
      return Clock;
    case 'inventory-branch-prices':
    case 'branch-prices':
      return DollarSign;
    case 'pos':
      return ShoppingCart;
    case 'shift':
      return Clock;
    case 'calculator':
      return Calculator;
    case 'dashboard':
      return LayoutDashboard;
    case 'product-trends':
      return BarChart3;
    case 'profit-analytics':
      return TrendingUp;
    case 'branches':
      return Building2;
    case 'users':
      return Users;
    case 'system-settings':
      return Settings;
    case 'archives':
      return Archive;
    case 'tutorials':
      return HelpCircle;
    case 'deliveries-panel':
      return Truck;
    case 'members-manage':
      return Users;
    case 'members-receivables':
      return CreditCard;
    case 'members-loyalty':
      return Award;
    case 'suppliers-manage':
      return Building2;
    case 'suppliers-credits':
      return CreditCard;
    case 'suppliers-calendar':
      return Clock;
    case 'expenses-add':
      return PlusCircle;
    case 'expenses-search':
      return Search;
    case 'adjustments-void':
      return RotateCcw;
    case 'adjustments-return':
      return Undo2;
    case 'reconciliation-transmission':
      return FileText;
    case 'bir-xz':
      return FileSearch;
    case 'bir-summary':
      return FileSpreadsheet;
    case 'bir-pwd':
    case 'bir-senior20':
    case 'bir-senior5':
    case 'bir-solo':
    case 'bir-athletes':
    case 'bir-regular':
      return FileText;
    default:
      return Sparkles;
  }
};

export const HeaderNavTabs: React.FC<HeaderNavTabsProps> = ({
  activeTab,
  onChangeTab,
  currentUser,
  parkedSalesCount = 0,
  pendingDeliveriesCount = 0,
  pendingTransfersCount = 0,
  categories
}) => {
  const currentRole = currentUser?.role || UserRole.STAFF;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Find the active parent category based on activeTab
  const activeCategory = useMemo(() => {
    for (const cat of categories) {
      if (cat.id === activeTab) return cat;
      const foundSub = cat.subItems.find((s) => s.id === activeTab);
      if (foundSub) return cat;
    }
    // Fallback for special inventory prefixes
    if (activeTab.startsWith('inventory-') || activeTab === 'inventory') {
      const invCat = categories.find((c) => c.id === 'inventory');
      if (invCat) return invCat;
    }
    return null;
  }, [categories, activeTab]);

  const { flags: featureFlags } = useFeatureFlags();

  // Sub-navigation tabs for the currently active category only
  const currentSubTabs = useMemo(() => {
    if (!activeCategory || !activeCategory.subItems || activeCategory.subItems.length <= 1) {
      return [];
    }

    // Filter subItems by user role and business feature flags
    return activeCategory.subItems.filter((sub) => {
      if (!featureFlags.tileCalculator && sub.id === 'calculator') return false;
      if (!featureFlags.cargoDeliveries && sub.id === 'deliveries-panel') return false;
      if (!featureFlags.damageRegister && sub.id === 'inventory-damage') return false;
      if (!featureFlags.birCompliance && (sub.id === 'reconciliation-transmission' || sub.id.startsWith('bir-'))) return false;
      if (!sub.roles || sub.roles.length === 0) return true;
      return sub.roles.includes(currentRole);
    });
  }, [activeCategory, currentRole, featureFlags]);

  // Check scroll position to display overflow indicator buttons
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 4);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [currentSubTabs]);

  // Scroll active item into view when active tab changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeBtn) {
      const targetScroll = activeBtn.offsetLeft - el.clientWidth / 2 + activeBtn.clientWidth / 2;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
    checkScroll();
  }, [activeTab]);

  const handleScrollBy = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const { sessionRemainingSeconds, extendSession } = useDb();
  const [isExtending, setIsExtending] = useState(false);

  const formatRemainingTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${secs % 60}s`;
  };

  const handleExtend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExtending(true);
    try {
      await extendSession(60);
    } finally {
      setIsExtending(false);
    }
  };

  // If the active module does not have multiple sub-navigation items, don't show an empty bar
  if (currentSubTabs.length <= 1) {
    return null;
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 pt-2 pb-0 shrink-0 bg-background/50">
      <div className="relative flex items-center w-full select-none shrink-0 group/nav">
      {/* Left scroll chevron */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => handleScrollBy(-180)}
          className="absolute left-1 z-40 h-7 w-7 rounded-lg bg-content1/90 border border-divider/40 text-foreground shadow-md flex items-center justify-center hover:bg-content2 transition-all cursor-pointer backdrop-blur-md"
          title="Scroll Left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Horizontal Nav Bar */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onWheel={handleWheel}
        className="flex items-center gap-1.5 border border-zinc-200/60 dark:border-white/5 bg-zinc-100/90 dark:bg-zinc-800/80 p-1 rounded-full shadow-2xs overflow-x-auto no-scrollbar scroll-smooth w-full select-none shrink-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {currentSubTabs.map((sub) => {
          const isSelected =
            activeTab === sub.id ||
            (sub.id === 'inventory-stocks' && (activeTab === 'inventory' || activeTab === 'inventory-stocks'));

          const SubIcon = getSubTabIcon(sub.id);

          // Live badge indicators
          let subBadge: React.ReactNode = null;
          if (sub.id === 'pos' && parkedSalesCount > 0) {
            subBadge = (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${
                  isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary/30 dark:text-primary-300' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {parkedSalesCount}
              </span>
            );
          } else if (sub.id === 'deliveries-panel' && pendingDeliveriesCount > 0) {
            subBadge = (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${
                  isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary/30 dark:text-primary-300' : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
                }`}
              >
                {pendingDeliveriesCount}
              </span>
            );
          } else if (sub.id === 'inventory-transfer' && pendingTransfersCount > 0) {
            subBadge = (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${
                  isSelected ? 'bg-primary-100 text-primary-700 dark:bg-primary/30 dark:text-primary-300' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {pendingTransfersCount}
              </span>
            );
          }

          return (
            <button
              key={sub.id}
              data-active={isSelected ? 'true' : 'false'}
              type="button"
              onClick={() => onChangeTab(sub.id)}
              className={`flex items-center gap-2 py-1.5 px-3.5 md:px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full shrink-0 cursor-pointer font-sans active:scale-[0.97] ${
                isSelected
                  ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 font-medium'
              }`}
              title={`Sub-view: ${sub.name}`}
            >
              <SubIcon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{sub.name}</span>
              {subBadge}
            </button>
          );
        })}

        {currentUser && sessionRemainingSeconds !== undefined && sessionRemainingSeconds > 0 && (
          <div className="ml-auto flex items-center gap-1.5 pl-3 py-1 pr-1.5 bg-white dark:bg-content3/60 border border-divider/40 rounded-full text-[11px] shrink-0 font-sans">
            <Clock className={`h-3 w-3 ${sessionRemainingSeconds < 300 ? "text-rose-500 font-bold" : "text-primary"}`} />
            <span className="font-semibold text-foreground tabular-nums">
              {formatRemainingTime(sessionRemainingSeconds)}
            </span>
            <button
              type="button"
              onClick={handleExtend}
              disabled={isExtending}
              className="ml-1 px-2 py-0.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-[10px] font-semibold rounded-full cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Extend session duration (+60m)"
            >
              {isExtending ? "..." : "+60m"}
            </button>
          </div>
        )}
      </div>

      {/* Right scroll chevron */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => handleScrollBy(180)}
          className="absolute right-1 z-40 h-7 w-7 rounded-lg bg-content1/90 border border-divider/40 text-foreground shadow-md flex items-center justify-center hover:bg-content2 transition-all cursor-pointer backdrop-blur-md active:scale-95"
          title="Scroll Right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
    </div>
  );
};

export default HeaderNavTabs;
