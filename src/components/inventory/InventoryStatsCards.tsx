/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Package,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  X
} from 'lucide-react';

interface InventoryStats {
  totalSKUs: number;
  totalValuation: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
}

interface InventoryStatsCardsProps {
  stats: InventoryStats;
  onOpenStockAlertsModal: (filter: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK') => void;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({
  stats,
  onOpenStockAlertsModal
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
      {/* Total SKUs */}
      <div className="p-5 rounded-2xl bg-content1 border border-divider flex items-center gap-3.5 relative shadow-xs overflow-hidden transition-all duration-200 hover:border-default-400">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Total Physical SKUs</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums truncate">
            {stats.totalSKUs.toLocaleString()} <span className="text-xs font-medium text-default-400">SKUs</span>
          </div>
        </div>
      </div>

      {/* Global Valuation */}
      <div className="p-5 rounded-2xl bg-content1 border border-divider flex items-center gap-3.5 relative shadow-xs overflow-hidden transition-all duration-200 hover:border-default-400">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Value of Stock</span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums truncate">
            ₱{stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('LOW')}
        className={`p-5 rounded-2xl border flex items-center gap-3.5 relative shadow-xs overflow-hidden shrink-0 cursor-pointer hover:border-amber-500/50 transition-all active:scale-[0.98] ${
          stats.lowStockCount > 0 
            ? 'bg-amber-500/5 border-amber-500/25 dark:bg-amber-500/10' 
            : 'bg-content1 border-divider'
        }`}
        title="Click to view all Low Stock items in Stock Alert Diagnostics Modal"
      >
        <div className={`p-2.5 rounded-xl shrink-0 ${
          stats.lowStockCount > 0 
            ? 'bg-amber-500/15 text-amber-500' 
            : 'bg-default-100 dark:bg-content2 text-default-500'
        }`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Low Stock Alert</span>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate ${stats.lowStockCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
            {stats.lowStockCount}
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('CRITICAL')}
        className={`p-5 rounded-2xl border flex items-center gap-3.5 relative shadow-xs overflow-hidden shrink-0 cursor-pointer hover:border-rose-500/50 transition-all active:scale-[0.98] ${
          stats.criticalStockCount > 0 
            ? 'bg-rose-500/5 border-rose-500/25 dark:bg-rose-500/10' 
            : 'bg-content1 border-divider'
        }`}
        title="Click to view all Critical Stock items in Stock Alert Diagnostics Modal"
      >
        <div className={`p-2.5 rounded-xl shrink-0 ${
          stats.criticalStockCount > 0 
            ? 'bg-rose-500/15 text-rose-500 animate-pulse' 
            : 'bg-default-100 dark:bg-content2 text-default-500'
        }`}>
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Critical Warns</span>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate ${stats.criticalStockCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
            {stats.criticalStockCount}
          </div>
        </div>
      </div>

      {/* Out of Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('OUT_OF_STOCK')}
        className={`p-5 rounded-2xl border col-span-2 lg:col-span-1 flex items-center gap-3.5 relative shadow-xs overflow-hidden shrink-0 cursor-pointer hover:border-rose-500/50 transition-all active:scale-[0.98] ${
          stats.outOfStockCount > 0 
            ? 'bg-rose-500/5 border-rose-500/25 dark:bg-rose-500/10' 
            : 'bg-content1 border-divider'
        }`}
        title="Click to view all Out of Stock items in Stock Alert Diagnostics Modal"
      >
        <div className="p-2.5 rounded-xl bg-default-100 dark:bg-content2 text-default-500 shrink-0">
          <X className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-medium text-default-500 tracking-tight block">Out of Stock</span>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums truncate ${stats.outOfStockCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
            {stats.outOfStockCount}
          </div>
        </div>
      </div>
    </div>
  );
};
