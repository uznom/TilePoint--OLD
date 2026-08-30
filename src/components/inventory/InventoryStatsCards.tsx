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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Total SKUs */}
      <div className="p-4 rounded-2xl bg-content1 border border-divider/30 flex items-center gap-3.5 relative shadow-sm overflow-hidden group">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary transition-all duration-300">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-default-500 font-extrabold uppercase tracking-wide">Total Physical SKUs</span>
          <div className="text-xl font-black">
            {stats.totalSKUs.toLocaleString()} <span className="text-xs font-bold text-default-500 ">SKUs</span>
          </div>
        </div>
      </div>

      {/* Global Valuation */}
      <div className="p-4 rounded-2xl bg-content1 border border-divider/30 flex items-center gap-3.5 relative shadow-sm overflow-hidden group">
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 transition-all duration-300">
          <DollarSign className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-default-500 font-extrabold uppercase tracking-wide">Value of Stock</span>
          <div className="text-xl font-black text-emerald-500">
            ₱{stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('LOW')}
        className={`p-4 rounded-2xl border flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all active:scale-95 ${
          stats.lowStockCount > 0 
            ? 'bg-amber-500/5 border-amber-500/25' 
            : 'bg-content1 border-divider/30'
        }`}
        title="Click to view all Low Stock items in Stock Alert Diagnostics Modal"
      >
        <div className={`p-3 rounded-2xl ${
          stats.lowStockCount > 0 
            ? 'bg-amber-500/15 text-amber-500' 
            : 'bg-default-100 text-default-500'
        }`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-default-500 font-extrabold uppercase tracking-wide">Low Stock Alert</span>
          <div className={`text-xl font-black ${stats.lowStockCount > 0 ? 'text-amber-500' : ''}`}>{stats.lowStockCount}</div>
        </div>
      </div>

      {/* Critical Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('CRITICAL')}
        className={`p-4 rounded-2xl border flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 cursor-pointer hover:border-rose-500/50 hover:shadow-md transition-all active:scale-95 ${
          stats.criticalStockCount > 0 
            ? 'bg-rose-500/5 border-rose-500/20' 
            : 'bg-content1 border-divider/30'
        }`}
        title="Click to view all Critical Stock items in Stock Alert Diagnostics Modal"
      >
        <div className={`p-3 rounded-2xl ${
          stats.criticalStockCount > 0 
            ? 'bg-rose-500/15 text-rose-500 animate-bounce' 
            : 'bg-default-100 text-default-500'
        }`}>
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-default-500 font-extrabold uppercase tracking-wide">Critical Warns</span>
          <div className={`text-xl font-black ${stats.criticalStockCount > 0 ? 'text-rose-500 font-extrabold' : ''}`}>{stats.criticalStockCount}</div>
        </div>
      </div>

      {/* Out of Stock Alerts */}
      <div 
        onClick={() => onOpenStockAlertsModal('OUT_OF_STOCK')}
        className={`p-4 rounded-2xl border col-span-2 lg:col-span-1 flex items-center gap-3.5 relative shadow-sm overflow-hidden shrink-0 cursor-pointer hover:border-red-600/50 hover:shadow-md transition-all active:scale-95 ${
          stats.outOfStockCount > 0 
            ? 'bg-red-600/5 border-red-600/20' 
            : 'bg-content1 border-divider/30'
        }`}
        title="Click to view all Out of Stock items in Stock Alert Diagnostics Modal"
      >
        <div className="p-3 rounded-2xl bg-default-100 text-default-500">
          <X className="h-5 w-5 font-black" />
        </div>
        <div>
          <span className="text-[10px] text-default-500 font-extrabold uppercase tracking-wide font-black">Out of Stock</span>
          <div className={`text-xl font-black ${stats.outOfStockCount > 0 ? 'text-red-500' : ''}`}>{stats.outOfStockCount}</div>
        </div>
      </div>
    </div>
  );
};
