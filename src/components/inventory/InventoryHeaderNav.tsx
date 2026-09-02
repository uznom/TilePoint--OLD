/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Package,
  Activity,
  ArrowRightLeft,
  Sliders,
  Database,
  DollarSign,
  Clock
} from 'lucide-react';
import { StockTransfer } from '../../types/db';

export type InventorySubTab = 'catalog' | 'movements' | 'transfers' | 'ledger' | 'import' | 'branch-prices' | 'expiry';

interface InventoryHeaderNavProps {
  activeSubTab: InventorySubTab;
  changeActiveSubTab: (tab: InventorySubTab) => void;
  stockTransfers: StockTransfer[];
}

export const InventoryHeaderNav: React.FC<InventoryHeaderNavProps> = ({
  activeSubTab,
  changeActiveSubTab,
  stockTransfers,
}) => {
  const pendingTransfersCount = stockTransfers.filter(t => t.status === 'Pending').length;

  return (
    <div className="flex flex-wrap gap-1.5 border border-divider/40 dark:border-white/5 items-center sticky top-0 bg-default-100/80 dark:bg-content2/80 backdrop-blur-md z-30 p-1 rounded-full shadow-xs font-sans">
      <button
        onClick={() => changeActiveSubTab('catalog')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'catalog'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <Package className="h-4 w-4" />
        <span>Catalog Stock Ledger</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('movements')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'movements'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <Activity className="h-4 w-4" />
        <span>Adjustments Logs</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('transfers')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer relative active:scale-[0.97] ${
          activeSubTab === 'transfers'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        <span>Stock Transfers</span>
        {pendingTransfersCount > 0 && (
          <span className="flex h-4.5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold leading-none text-white shadow-xs">
            {pendingTransfersCount}
          </span>
        )}
      </button>

      <button
        onClick={() => changeActiveSubTab('ledger')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'ledger'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <Sliders className="h-4 w-4" />
        <span>Logistics Ledger & Heatmap</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('import')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'import'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <Database className="h-4 w-4 text-emerald-500" />
        <span>Import &amp; Migration</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('branch-prices')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'branch-prices'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <DollarSign className="h-4 w-4 text-primary" />
        <span>Branch MSRP & SRP</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('expiry')}
        className={`flex items-center gap-2 py-1.5 px-4 text-xs font-semibold tracking-tight transition-all duration-200 rounded-full cursor-pointer active:scale-[0.97] ${
          activeSubTab === 'expiry'
            ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
            : 'text-default-500 dark:text-default-400 hover:text-foreground hover:bg-default-200/50 dark:hover:bg-content3/50'
        }`}
      >
        <Clock className="h-4 w-4 text-rose-500" />
        <span>Shelf-Life & Expiry Calendar</span>
      </button>
    </div>
  );
};
