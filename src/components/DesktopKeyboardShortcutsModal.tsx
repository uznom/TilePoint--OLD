/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Command,
  Keyboard,
  Layers,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import React from "react";
import { UserRole } from "../types/db";
import { HeroButton } from "./common/ui/HeroButton";
import { HeroModal } from "./common/ui/HeroModal";

interface DesktopKeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
}

interface ShortcutCategory {
  title: string;
  icon: any;
  items: {
    keys: string[];
    description: string;
    badge?: string;
  }[];
}

export const DesktopKeyboardShortcutsModal: React.FC<DesktopKeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  userRole: _userRole
}) => {
  const categories: ShortcutCategory[] = [
    {
      title: "Global & Navigation",
      icon: Command,
      items: [
        {
          keys: ["Ctrl", "K"],
          description: "Open Command Palette / Fast Switcher",
          badge: "Universal"
        },
        {
          keys: ["Ctrl", "B"],
          description: "Toggle / Collapse Sidebar Navigation",
          badge: "Ergonomics"
        },
        {
          keys: ["Ctrl", "1..9, 0"],
          description: "Jump directly to specific ERP modules",
          badge: "RBAC Filtered"
        },
        {
          keys: ["?"],
          description: "Open this Keyboard Shortcuts Cheatsheet",
          badge: "Help"
        },
        {
          keys: ["Esc"],
          description: "Dismiss active modal, flyout, or cancel search"
        }
      ]
    },
    {
      title: "POS Cashier Operations",
      icon: ShoppingCart,
      items: [
        {
          keys: ["F1"],
          description: "Focus Product Search & Barcode Scanner"
        },
        {
          keys: ["F2"],
          description: "Open Customer Profile & Loyalty Lookup"
        },
        {
          keys: ["F4"],
          description: "Trigger Discount Selection Modal"
        },
        {
          keys: ["F7"],
          description: "Execute Payment Settlement & Receipt Print",
          badge: "Primary Action"
        },
        {
          keys: ["F8"],
          description: "Park / Hold Current Active Cart"
        },
        {
          keys: ["F9"],
          description: "Retrieve & Resume Parked Transactions"
        },
        {
          keys: ["F10"],
          description: "Reset / Clear Active Cart"
        }
      ]
    },
    {
      title: "Module Number Quick Jumps",
      icon: Layers,
      items: [
        { keys: ["Ctrl", "1"], description: "Executive Dashboard & BI Analytics" },
        { keys: ["Ctrl", "2"], description: "POS Fast Checkout Register" },
        { keys: ["Ctrl", "3"], description: "Catalog Stock Ledger & Inventory" },
        { keys: ["Ctrl", "4"], description: "Procurement & Purchase Orders" },
        { keys: ["Ctrl", "5"], description: "BIR Reconciliation & Transmission" },
        { keys: ["Ctrl", "6"], description: "Shift Drawer & Cash Reconciliation" },
        { keys: ["Ctrl", "7"], description: "Cargo Delivery Management" },
        { keys: ["Ctrl", "8"], description: "Tile Coverage Calculator" },
        { keys: ["Ctrl", "9"], description: "P&L Accounting & Profit Analytics" },
        { keys: ["Ctrl", "0"], description: "Interactive Guided Walkthroughs" }
      ]
    }
  ];

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      zIndex={10000}
    >
      <HeroModal.Header className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground uppercase font-sans flex items-center gap-2">
              Desktop Keyboard Shortcuts
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider font-mono">
                Pro Productivity
              </span>
            </h2>
            <p className="text-xs text-default-500 mt-0.5 font-medium">
              High-speed key combinations built for cashiers, managers, and inventory clerks.
            </p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="p-6 space-y-6 scrollbar-thin text-left font-sans text-xs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.title} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                <span>{cat.title}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {cat.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 transition-all text-xs shadow-2xs"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="font-medium text-foreground truncate block">
                        {item.description}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-bold text-primary tracking-wider uppercase mt-0.5 inline-block font-mono">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="px-2 py-1 bg-white dark:bg-zinc-900 text-foreground border border-zinc-200/70 dark:border-white/10 rounded-xl text-[11px] font-mono font-bold shadow-2xs">
                            {k}
                          </kbd>
                          {kIdx < item.keys.length - 1 && (
                            <span className="text-default-400 text-[10px] font-mono">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </HeroModal.Body>

      <HeroModal.Footer className="justify-between px-6 py-4 text-xs text-default-500 font-sans">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-lg font-mono font-bold text-[10px]">?</kbd> anywhere to toggle this guide</span>
        </div>
        <HeroButton
          type="button"
          variant="solid"
          color="primary"
          size="sm"
          radius="full"
          onClick={onClose}
          className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
        >
          Got it
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default DesktopKeyboardShortcutsModal;
