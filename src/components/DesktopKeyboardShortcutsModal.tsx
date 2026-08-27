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
X
} from "lucide-react";
import { AnimatePresence,motion } from "motion/react";
import React from "react";
import { createPortal } from "react-dom";
import { UserRole } from "../types/db";

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

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Full-Screen Uniform Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="relative w-full max-w-3xl bg-background/98 backdrop-blur-2xl border border-divider/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-divider/25 bg-content1/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-wide text-foreground uppercase font-sans flex items-center gap-2">
                  Desktop Keyboard Shortcuts
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-bold uppercase tracking-widest">
                    Pro Productivity
                  </span>
                </h2>
                <p className="text-xs text-default-500 mt-0.5">
                  High-speed key combinations built for cashiers, managers, and inventory clerks.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-default-400 hover:text-foreground hover:bg-content2 transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-divider/30">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.title} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{cat.title}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {cat.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-content1/70 hover:bg-content1 border border-divider/20 transition-all text-xs"
                      >
                        <div className="min-w-0 pr-3">
                          <span className="font-semibold text-foreground truncate block">
                            {item.description}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-bold text-primary tracking-wider uppercase mt-0.5 inline-block">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              <kbd className="px-2 py-1 bg-background/90 text-foreground border border-divider/35 rounded-lg text-[11px] font-mono font-bold shadow-2xs">
                                {k}
                              </kbd>
                              {kIdx < item.keys.length - 1 && (
                                <span className="text-default-400 text-[10px]">+</span>
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
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-divider/20 bg-content1/40 text-xs text-default-500">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Press <kbd className="px-1.5 py-0.5 bg-background border border-divider/30 rounded font-mono font-bold text-[10px]">?</kbd> anywhere to toggle this guide</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
