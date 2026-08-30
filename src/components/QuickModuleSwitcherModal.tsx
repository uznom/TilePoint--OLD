import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, UserRole } from "../types/db";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Command,
  X,
  Sparkles,
  Keyboard,
  Check,
  ShieldAlert,
  LayoutDashboard,
  ShoppingCart,
  Layers,
  FileText,
  Truck,
  Building2,
  DollarSign,
  Calculator,
  LockKeyhole,
  BookOpen,
} from "lucide-react";
import { HeroChip } from "./common/ui/HeroChip";

export interface ShortcutModuleItem {
  id: string;
  name: string;
  category: string;
  shortcut: string;
  icon: React.ElementType;
  roles: UserRole[];
  description?: string;
}

interface QuickModuleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const MODULE_SHORTCUT_MAP: ShortcutModuleItem[] = [
  {
    id: "dashboard",
    name: "Branch Dashboard",
    category: "Analytics & BI",
    shortcut: "Ctrl + 1",
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Overview of real-time sales performance, stock alerts & KPIs",
  },
  {
    id: "pos",
    name: "ERP OS Checkout Mode (POS)",
    category: "Cashier & Sales",
    shortcut: "Ctrl + 2",
    icon: ShoppingCart,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "High-speed tile sales register, hold sales & receipt printer",
  },
  {
    id: "inventory-stocks",
    name: "Catalog Stock Ledger",
    category: "Inventory",
    shortcut: "Ctrl + 3",
    icon: Layers,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Product inventory search, batch stock levels & price lookup",
  },
  {
    id: "procurement-po",
    name: "Procurement & Purchase Orders",
    category: "Supplier",
    shortcut: "Ctrl + 4",
    icon: Building2,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Create and dispatch purchase orders to tile manufacturers",
  },
  {
    id: "reconciliation-transmission",
    name: "Reconciliation & Transmission",
    category: "BIR & Compliance",
    shortcut: "Ctrl + 5",
    icon: FileText,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "BIR daily sales transmittals, X/Z reading audit logs & ledgers",
  },
  {
    id: "shift",
    name: "Shift Drawer & Cash Register",
    category: "Cashier & Sales",
    shortcut: "Ctrl + 6",
    icon: LockKeyhole,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    description: "Open/close shift drawer, log cash floats & till reconciliation",
  },
  {
    id: "deliveries-panel",
    name: "Cargo Delivery Center",
    category: "Logistics",
    shortcut: "Ctrl + 7",
    icon: Truck,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Truck delivery scheduling, waybills, driver assignment & status",
  },
  {
    id: "calculator",
    name: "Tile Coverage Calculator",
    category: "Tools",
    shortcut: "Ctrl + 8",
    icon: Calculator,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF],
    description: "Square meter to tile box estimator & wastage allowance calculator",
  },
  {
    id: "profit-analytics",
    name: "P&L Accounting Desk",
    category: "Analytics & BI",
    shortcut: "Ctrl + 9",
    icon: DollarSign,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Profit & loss statements, expense ledgers & margin tracking",
  },
  {
    id: "tutorials",
    name: "Operational Walkthrough",
    category: "System",
    shortcut: "Ctrl + 0",
    icon: BookOpen,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    description: "Step-by-step cashier handbook & system workflow guide",
  },
];

export const POS_HOTKEYS = [
  { key: "Ctrl + 2", description: "Quickly open ERP POS Checkout Register" },
  { key: "F1", description: "Hold / Park current active shopping cart" },
  { key: "F2", description: "Open Senior Citizen / Custom Discount dialog" },
  { key: "F7", description: "Focus Cash Tendered & Complete Checkout" },
  { key: "F8", description: "Reprint latest transaction receipt" },
  { key: "F9 / F10", description: "Open / Close shift cash float drawer" },
  { key: "Esc", description: "Clear current cart or cancel active modal" },
  { key: "Ctrl + /", description: "Toggle this Keyboard Shortcut Command Palette" },
  { key: "Ctrl + K", description: "Open Quick Module Switcher Search" },
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

  // Filter modules based on user role and search query
  const filteredModules = MODULE_SHORTCUT_MAP.filter((item) => {
    const isAuthorized = item.roles.includes(currentUser.role);
    if (!isAuthorized) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.shortcut || '').toLowerCase().includes(q) ||
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

  // Handle keyboard navigation inside the command palette modal
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredModules, selectedIndex, onSelectTab, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Full-Screen Uniform Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-content1 border border-divider/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-foreground z-10 transition-all duration-300"
        >
          {/* Header & Search Bar */}
          <div className="p-4 border-b border-divider/20 bg-content1/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider">
                <Command className="h-4 w-4" />
                <span>TilePoint Quick Module Switcher</span>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-1 bg-content2 p-1 rounded-xl border border-divider/20 text-[10px] font-bold">
                <button
                  onClick={() => setActiveTabMode("switcher")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTabMode === "switcher"
                      ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  Modules
                </button>
                <button
                  onClick={() => setActiveTabMode("hotkeys")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTabMode === "hotkeys"
                      ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                      : "text-default-500 hover:text-foreground"
                  }`}
                >
                  <Keyboard className="h-3 w-3" />
                  <span>Cashier Hotkeys</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-default-100 text-default-500 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeTabMode === "switcher" && (
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-default-500 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Type to filter modules or shortcut key (e.g. 'pos', 'inventory', 'Ctrl+2')..."
                  className="w-full pl-10 pr-4 py-2.5 bg-background rounded-2xl border border-divider/40 text-xs font-semibold placeholder:text-default-500/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="p-3 overflow-y-auto flex-1 divide-y divide-divider/10 scrollbar-thin">
            {activeTabMode === "switcher" ? (
              filteredModules.length === 0 ? (
                <div className="p-8 text-center text-default-500 text-xs font-medium space-y-2">
                  <ShieldAlert className="h-8 w-8 mx-auto text-amber-500 opacity-80" />
                  <p>No matching modules found for "{searchQuery}".</p>
                  <p className="text-[10px] text-default-500/70">
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
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                            : "bg-transparent border-transparent hover:bg-content1 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-content2 text-default-500"
                            }`}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black truncate">
                                {item.name}
                              </span>
                              {isActive && (
                                <HeroChip variant="primary" size="sm" startContent={<Check className="h-2.5 w-2.5" />}>
                                  Active
                                </HeroChip>
                              )}
                            </div>
                            <p className="text-[10px] text-default-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <HeroChip variant="neutral" size="sm">
                            {item.category}
                          </HeroChip>
                          <HeroChip variant="primary" size="sm" className="font-mono shadow-xs">
                            {item.shortcut}
                          </HeroChip>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              /* Cashier Hotkeys Reference Sheet */
              <div className="p-2 space-y-3">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                  <div className="font-black text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Global Cashier Keyboard Efficiency Guide</span>
                  </div>
                  <p className="text-[11px] text-default-500 leading-relaxed">
                    Use these direct keyboard shortcuts anywhere in the TilePoint ERP system to switch modules instantly without touching the mouse!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {POS_HOTKEYS.map((hk, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-content1 border border-divider/20 flex items-center justify-between text-xs"
                    >
                      <span className="text-[11px] text-foreground font-semibold">
                        {hk.description}
                      </span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-content3 font-black text-[10px] text-primary border border-divider/40 shadow-xs shrink-0 ml-2">
                        {hk.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="p-3 bg-content1 border-t border-divider/15 flex items-center justify-between text-[10px] font-medium text-default-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-divider/30 font-bold">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-divider/30 font-bold">
                  ↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-divider/30 font-bold">
                  Enter
                </kbd>
                <span>Select Module</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-divider/30 font-bold">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>

            <div className="hidden sm:block text-primary font-bold">
              Press <kbd className="px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30">Ctrl + 1..0</kbd> to jump directly
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default QuickModuleSwitcherModal;
