/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Check,
  Command,
  HelpCircle,
  History,
  Keyboard,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { UserRole } from "../types/db";
import { HeroChip } from "./common/ui/HeroChip";
import { HeroModal } from "./common/ui/HeroModal";

interface QuickModuleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    role: UserRole;
    name?: string;
  };
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

interface ModuleShortcut {
  id: string;
  name: string;
  category: string;
  icon: any;
  shortcut: string;
  roles: UserRole[];
  description?: string;
}

const MODULE_SHORTCUT_MAP: ModuleShortcut[] = [
  {
    id: "dashboard",
    name: "Executive Dashboard & Intelligence",
    category: "Analytics",
    icon: Layers,
    shortcut: "Ctrl + 1",
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Live branch KPI metrics, gross revenue, and transaction velocity",
  },
  {
    id: "pos",
    name: "ERP OS Checkout Mode (POS)",
    category: "Cashier",
    icon: Command,
    shortcut: "Ctrl + 2",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Rapid barcode scanning, cashiering, customer receipts, and tender settlement",
  },
  {
    id: "inventory",
    name: "Inventory Stocks & Warehouse Ledgers",
    category: "Logistics",
    icon: Layers,
    shortcut: "Ctrl + 3",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF],
    description: "Catalog stock management, bin movements, and inter-branch inventory transfers",
  },
  {
    id: "procurement",
    name: "Procurement & Purchase Orders",
    category: "Supply Chain",
    icon: Layers,
    shortcut: "Ctrl + 4",
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Purchase order formulation, vendor invoices, and incoming goods receipts",
  },
  {
    id: "transmittal",
    name: "Reconciliation & Central Transmission",
    category: "Audit & BIR",
    icon: History,
    shortcut: "Ctrl + 5",
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "BIR daily gross ledgers, official audit sales records, and cloud backup exports",
  },
  {
    id: "shift",
    name: "Shift Drawer & Cash Balancing",
    category: "Cashier",
    icon: History,
    shortcut: "Ctrl + 6",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    description: "Cashier drawer float declarations, X/Z settlement reports, and physical bill counts",
  },
  {
    id: "deliveries",
    name: "Cargo Dispatch & Deliveries Center",
    category: "Logistics",
    icon: Layers,
    shortcut: "Ctrl + 7",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF],
    description: "Truck route scheduling, site dispatch handovers, and recipient delivery slips",
  },
  {
    id: "calculator",
    name: "Tile Coverage Estimator",
    category: "Tools",
    icon: Layers,
    shortcut: "Ctrl + 8",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Square meter to tile box count estimator with custom wastage margin allowance",
  },
  {
    id: "profit-analytics",
    name: "P&L Accounting & Profit Analytics",
    category: "Finance",
    icon: Layers,
    shortcut: "Ctrl + 9",
    roles: [UserRole.ADMIN],
    description: "Margin diagnostics, net gross margin breakdown, and profitability ledgers",
  },
  {
    id: "users",
    name: "Staff Identity & Access Management",
    category: "Administration",
    icon: Users,
    shortcut: "Alt + U",
    roles: [UserRole.ADMIN],
    description: "Employee role assignments, credentials management, and branch security PIN resets",
  },
  {
    id: "tutorial",
    name: "Interactive Guided Walkthroughs",
    category: "Help",
    icon: HelpCircle,
    shortcut: "Ctrl + 0",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "System orientation guides, cashiering standards, and step-by-step documentation",
  },
  {
    id: "staff-portal",
    name: "Staff Workspace & Knowledge Hub",
    category: "Support",
    icon: User,
    shortcut: "Alt + S",
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Company directory, shift guidelines, and internal employee reference documentation",
  },
];

const POS_HOTKEYS = [
  { key: "Ctrl + K", description: "Open Quick Switcher & Command Palette" },
  { key: "Ctrl + B", description: "Toggle Main Left Navigation Sidebar" },
  { key: "Ctrl + 2", description: "Quickly open ERP POS Checkout Register" },
  { key: "F1", description: "Focus Rapid Barcode Laser SKU Scan Field" },
  { key: "F2", description: "Select & Assign Customer Profile / Account" },
  { key: "F4", description: "Apply Discount Card / Voucher Reduction" },
  { key: "F7", description: "Focus Cash Tendered & Complete Checkout" },
  { key: "F8", description: "Reprint Last Official Customer Receipt" },
  { key: "F9 / F10", description: "Open or Close Active Shift Register Drawer" },
];

export const QuickModuleSwitcherModal: React.FC<QuickModuleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTab,
  onSelectTab,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTabMode, setActiveTabMode] = useState<"switcher" | "hotkeys">("switcher");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredModules = MODULE_SHORTCUT_MAP.filter((item) => {
    const isAuthorized = item.roles.includes(currentUser.role);
    if (!isAuthorized) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q) ||
      (item.shortcut || "").toLowerCase().includes(q) ||
      (item.description ? item.description.toLowerCase().includes(q) : false)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredModules.length > 0 ? (prev + 1) % filteredModules.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredModules.length > 0
            ? (prev - 1 + filteredModules.length) % filteredModules.length
            : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredModules[selectedIndex]) {
          onSelectTab(filteredModules[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredModules, selectedIndex, onSelectTab, onClose]);

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      zIndex={99999}
      className="max-h-[85vh]"
    >
      <HeroModal.Header className="flex flex-col gap-3 p-4 bg-white dark:bg-zinc-900 border-b border-divider/20 font-sans">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Command className="h-4 w-4" />
            <span>TilePoint Quick Module Switcher</span>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTabMode("switcher")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer font-sans ${
                activeTabMode === "switcher"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Modules
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode("hotkeys")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
                activeTabMode === "hotkeys"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Keyboard className="h-3 w-3" />
              <span>Cashier Hotkeys</span>
            </button>
          </div>
        </div>

        {activeTabMode === "switcher" && (
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 h-4 w-4 text-default-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type to filter modules or shortcut key (e.g. 'pos', 'inventory', 'Ctrl+2')..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200/50 dark:border-white/5 text-xs font-semibold placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-foreground"
            />
          </div>
        )}
      </HeroModal.Header>

      <HeroModal.Body className="p-3 overflow-y-auto divide-y divide-divider/10 scrollbar-thin font-sans text-xs">
        {activeTabMode === "switcher" ? (
          filteredModules.length === 0 ? (
            <div className="p-8 text-center text-default-500 text-xs font-medium space-y-2">
              <ShieldAlert className="h-8 w-8 mx-auto text-amber-500 opacity-80" />
              <p>No matching modules found for "{searchQuery}".</p>
              <p className="text-[10px] text-default-400">
                Try searching for "POS", "Inventory", "Dashboard", or "Calculator".
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredModules.map((item, idx) => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary shadow-2xs"
                        : "bg-transparent border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "bg-zinc-100 dark:bg-zinc-800 text-default-500"
                        }`}
                      >
                        <ItemIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">
                            {item.name}
                          </span>
                          {isActive && (
                            <HeroChip color="primary" variant="flat" size="sm" startContent={<Check className="h-2.5 w-2.5" />}>
                              Active
                            </HeroChip>
                          )}
                        </div>
                        <p className="text-[11px] text-default-500 truncate mt-0.5 font-medium">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <HeroChip color="default" variant="flat" size="sm">
                        {item.category}
                      </HeroChip>
                      <HeroChip color="primary" variant="flat" size="sm" className="font-mono font-bold shadow-2xs">
                        {item.shortcut}
                      </HeroChip>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="p-2 space-y-3">
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs space-y-1">
              <div className="font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Global Cashier Keyboard Efficiency Guide</span>
              </div>
              <p className="text-[11px] text-default-500 leading-relaxed font-medium">
                Use these direct keyboard shortcuts anywhere in the TilePoint ERP system to switch modules instantly without touching the mouse!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {POS_HOTKEYS.map((hk, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/5 flex items-center justify-between text-xs shadow-2xs"
                >
                  <span className="text-[11px] text-foreground font-medium">
                    {hk.description}
                  </span>
                  <kbd className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-900 font-bold text-[10px] text-primary border border-zinc-200/70 dark:border-white/10 font-mono shadow-2xs shrink-0 ml-2">
                    {hk.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </HeroModal.Body>

      <HeroModal.Footer className="p-3 border-t border-divider/15 justify-between text-[10px] font-medium text-default-500 font-sans">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 font-bold font-mono">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 font-bold font-mono">
              ↓
            </kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 font-bold font-mono">
              Enter
            </kbd>
            <span>Select Module</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 font-bold font-mono">
              Esc
            </kbd>
            <span>Close</span>
          </span>
        </div>

        <div className="hidden sm:block text-primary font-bold">
          Press <kbd className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-mono">Ctrl + 1..0</kbd> to jump directly
        </div>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default QuickModuleSwitcherModal;
