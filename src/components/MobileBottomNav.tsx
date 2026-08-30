/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import {
  ShoppingCart,
  Boxes,
  LayoutDashboard,
  Clock,
  LucideIcon
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  changeTab: (tab: string) => void;
  onOpenMobileMenu?: () => void;
  cartCount?: number;
  hasInventoryAlert?: boolean;
  hasSaleAlert?: boolean;
  hasTotalAlerts?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action?: () => void;
  isActive: (tab: string) => boolean;
  badge?: string | number | null;
  badgeDot?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  changeTab,
  cartCount = 0,
  hasInventoryAlert = false,
  hasSaleAlert = false
}) => {
  const items: NavItem[] = [
    {
      id: "pos",
      label: "POS",
      icon: ShoppingCart,
      isActive: (tab) => tab === "pos",
      action: () => changeTab("pos"),
      badge: cartCount > 0 ? cartCount : null,
      badgeDot: hasSaleAlert && cartCount === 0
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
      isActive: (tab) =>
        tab === "inventory" ||
        tab.startsWith("inventory-") ||
        tab === "procurement" ||
        tab === "transmittal",
      action: () => changeTab("inventory"),
      badgeDot: hasInventoryAlert
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: (tab) => tab === "dashboard" || tab === "profit-analytics",
      action: () => changeTab("dashboard")
    },
    {
      id: "shift",
      label: "Shift",
      icon: Clock,
      isActive: (tab) => tab === "shift" || tab === "users" || tab === "daily-reconciliation",
      action: () => changeTab("shift")
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-2xl border-t border-divider/25 px-2 py-1 shadow-lg select-none flex items-center justify-around pb-safe"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(activeTab);

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl min-w-[56px] transition-all duration-150 cursor-pointer active:scale-95 ${
              active
                ? "text-primary font-black"
                : "text-default-500 hover:text-foreground"
            }`}
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-pill"
                className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center">
              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${
                  active ? "scale-110 text-primary" : "text-default-500"
                }`}
              />

              {item.badge !== null && item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs border border-background">
                  {item.badge}
                </span>
              )}

              {item.badgeDot && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
              )}
            </div>

            <span
              className={`relative z-10 text-[10px] mt-0.5 tracking-tight uppercase leading-none font-bold ${
                active ? "text-primary font-black" : "text-default-500"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
