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
    <div className="flex flex-wrap gap-1.5 md:gap-2 border border-divider/20 items-center sticky top-0 bg-background/95 backdrop-blur-md z-30 p-2 rounded-xl shadow-sm">
      <button
        onClick={() => changeActiveSubTab('catalog')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'catalog'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <Package className="h-4 w-4" />
        <span>Catalog Stock Ledger</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('movements')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'movements'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <Activity className="h-4 w-4" />
        <span>Adjustments Logs</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('transfers')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg relative ${
          activeSubTab === 'transfers'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        <span>Stock Transfers</span>
        {pendingTransfersCount > 0 && (
          <span className="absolute -top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black leading-none text-white shadow-md">
            {pendingTransfersCount}
          </span>
        )}
      </button>

      <button
        onClick={() => changeActiveSubTab('ledger')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'ledger'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <Sliders className="h-4 w-4" />
        <span>Logistics Ledger & Heatmap</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('import')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'import'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <Database className="h-4 w-4 text-emerald-500" />
        <span>Import &amp; Migration</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('branch-prices')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'branch-prices'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <DollarSign className="h-4 w-4 text-primary" />
        <span>Branch MSRP & SRP Suggestions</span>
      </button>

      <button
        onClick={() => changeActiveSubTab('expiry')}
        className={`flex items-center gap-2 py-2 px-3.5 md:px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-lg ${
          activeSubTab === 'expiry'
            ? 'bg-primary text-primary-foreground shadow-sm font-black'
            : 'text-default-500 hover:text-foreground hover:bg-content1'
        }`}
      >
        <Clock className="h-4 w-4 text-rose-500" />
        <span>Shelf-Life & Expiry Calendar</span>
      </button>
    </div>
  );
};
