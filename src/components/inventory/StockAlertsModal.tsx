import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  FileSpreadsheet, 
  Plus, 
  X, 
  AlertCircle, 
  AlertTriangle, 
  Search, 
  Sliders, 
  Eye, 
  Check 
} from 'lucide-react';
import { Branch, Product } from '../../types/db';

export interface AlertProductItem {
  product: Product;
  qty: number;
  threshold: number;
  alertType: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL' | string;
  deficit: number;
}

interface StockAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedViewBranchId: string;
  branches: Branch[];
  products: Product[];
  alertProductsList: AlertProductItem[];
  stats: {
    lowStockCount: number;
    criticalStockCount: number;
    outOfStockCount: number;
  };
  poCart: Array<{ productId: string }>;
  onQueueRestock: (productId: string) => void;
  onBulkQueueAlerts: () => void;
  onOpenAdjust: (product: Product) => void;
  onLocateInCatalog: (productCode: string, productId: string) => void;
  exportStockAlertsToXLSX: (items: any[], branchLabel: string) => Promise<any>;
  showToast: (msg: string) => void;
  initialFilter?: 'ALL' | 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW';
}

export const StockAlertsModal: React.FC<StockAlertsModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedViewBranchId,
  branches,
  products,
  alertProductsList,
  stats,
  poCart,
  onQueueRestock,
  onBulkQueueAlerts,
  onOpenAdjust,
  onLocateInCatalog,
  exportStockAlertsToXLSX,
  showToast,
  initialFilter = 'ALL',
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW'>(initialFilter);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filteredItems = useMemo(() => {
    return alertProductsList.filter(item => {
      const matchFilter =
        filter === 'ALL' ||
        (filter === 'OUT_OF_STOCK' && item.alertType === 'OUT_OF_STOCK') ||
        (filter === 'CRITICAL' && item.alertType === 'CRITICAL') ||
        (filter === 'LOW' && item.alertType === 'LOW');

      if (!matchFilter) return false;

      if (category !== 'All' && item.product.category !== category) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const code = (item.product.productCode || '').toLowerCase();
        const name = (item.product.productName || '').toLowerCase();
        const sku = (item.product.sku || '').toLowerCase();
        const brand = (item.product.brand || '').toLowerCase();
        return code.includes(q) || name.includes(q) || sku.includes(q) || brand.includes(q);
      }

      return true;
    });
  }, [alertProductsList, filter, category, search]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-3 md:p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-gray-950/80 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[32px] border border-m3-outline-variant/30 shadow-2xl bg-m3-surface-low text-m3-on-surface overflow-hidden z-30">
        
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-m3-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-m3-surface-low">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-m3-on-surface uppercase font-sans">
                Stock Alert Diagnostics & Action Hub
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={async () => {
                const branchLabel = selectedViewBranchId === 'consolidated' 
                  ? 'Consolidated' 
                  : (branches.find(b => b.id === selectedViewBranchId)?.name || selectedViewBranchId);
                await exportStockAlertsToXLSX(filteredItems, branchLabel);
                showToast(`Exported ${filteredItems.length} stock alert items to Excel (.XLSX)!`);
              }}
              disabled={filteredItems.length === 0}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Export displayed stock alert items to Microsoft Excel (.XLSX)"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export XLSX</span>
            </button>

            <button
              onClick={onBulkQueueAlerts}
              disabled={filteredItems.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Add all currently displayed alert items to the procurement restock queue"
            >
              <Plus className="h-4 w-4" />
              <span>Queue All to PO Restock ({filteredItems.length})</span>
            </button>
            
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-m3-surface-variant/40 text-m3-on-surface-variant hover:text-m3-on-surface transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Filter Tabs Bar */}
        <div className="px-5 pt-4 pb-2 border-b border-m3-outline-variant/15 bg-m3-surface-low/80 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-m3-primary text-white shadow-sm'
                  : 'bg-m3-surface-variant/30 text-m3-on-surface-variant hover:bg-m3-surface-variant/60'
              }`}
            >
              <span>All Alerts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'ALL' ? 'bg-white/20 text-white' : 'bg-m3-surface-variant/50'}`}>
                {alertProductsList.length}
              </span>
            </button>

            <button
              onClick={() => setFilter('OUT_OF_STOCK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'OUT_OF_STOCK'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
              }`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Out of Stock</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'OUT_OF_STOCK' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
                {stats.outOfStockCount}
              </span>
            </button>

            <button
              onClick={() => setFilter('CRITICAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Critical Warns</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'CRITICAL' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-500'}`}>
                {stats.criticalStockCount}
              </span>
            </button>

            <button
              onClick={() => setFilter('LOW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'LOW'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'LOW' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-500'}`}>
                {stats.lowStockCount}
              </span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:w-64">
              <span className="text-[11px] font-bold text-m3-on-surface-variant shrink-0 hidden md:inline">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-m3-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Filter by code, item name, SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-m3-surface-lowest border border-m3-outline-variant/30 text-m3-on-surface rounded-xl text-xs font-bold focus:outline-none focus:border-m3-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-m3-on-surface-variant shrink-0 hidden md:inline">Category:</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-3 py-1.5 bg-m3-surface-lowest border border-m3-outline-variant/30 text-m3-on-surface rounded-xl text-xs font-bold focus:outline-none focus:border-m3-primary cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Table Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-m3-outline-variant/20 bg-m3-surface-lowest">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-m3-surface-low border-b border-m3-outline-variant/20 text-[10px] font-black uppercase text-m3-on-surface-variant tracking-wider">
                    <th className="py-3 px-4">Product Code & Item</th>
                    <th className="py-3 px-4">Category & Brand</th>
                    <th className="py-3 px-4 text-center">Stock Level vs Minimum</th>
                    <th className="py-3 px-4 text-center">Deficit</th>
                    <th className="py-3 px-4 text-center">Alert Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 font-sans">
                  {filteredItems.map(({ product, qty, threshold, alertType, deficit }) => {
                    const isPoInCart = poCart.some(c => c.productId === product.id);

                    return (
                      <tr key={product.id} className="hover:bg-m3-surface-variant/10 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.productName}
                                className="w-9 h-9 rounded-xl object-cover border border-m3-outline-variant/30 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-m3-primary/10 text-m3-primary flex items-center justify-center font-black text-xs shrink-0">
                                {product.productCode.slice(0, 3)}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-m3-on-surface text-xs leading-tight">
                                {product.productName}
                              </div>
                              <div className="font-mono text-[10px] text-m3-on-surface-variant mt-0.5 flex items-center gap-1.5">
                                <span className="font-bold text-m3-primary">{product.productCode}</span>
                                {product.sku && <span>• SKU: {product.sku}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-m3-on-surface-variant">
                          <span className="font-bold text-m3-on-surface block text-[11px]">{product.category}</span>
                          <span className="text-[10px]">{product.brand || 'Generic'}</span>
                        </td>

                        <td className="py-3 px-4 text-center min-w-[140px]">
                          <div className="space-y-1 max-w-[160px] mx-auto">
                            <div className="flex justify-between text-[11px] font-mono font-bold">
                              <span className={qty === 0 ? 'text-red-500 font-extrabold' : qty <= threshold * 0.5 ? 'text-rose-500' : 'text-amber-500'}>
                                {qty} {product.unit || 'pcs'}
                              </span>
                              <span className="text-m3-on-surface-variant text-[10px]">
                                Min: {threshold}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-m3-surface-variant/40 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  qty === 0 
                                    ? 'bg-red-600 w-0' 
                                    : qty <= threshold * 0.5 
                                      ? 'bg-rose-500' 
                                      : 'bg-amber-500'
                                }`} 
                                style={{ width: `${Math.min(100, Math.max(5, (qty / (threshold || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-xs text-rose-500">
                          {deficit > 0 ? `-${deficit} ${product.unit || 'pcs'}` : '0'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {alertType === 'OUT_OF_STOCK' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-500 border border-red-500/30">
                              <X className="h-3 w-3" /> Out of Stock
                            </span>
                          )}
                          {alertType === 'CRITICAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              <AlertCircle className="h-3 w-3" /> Critical Warn
                            </span>
                          )}
                          {alertType === 'LOW' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onQueueRestock(product.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                isPoInCart
                                  ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                                  : 'bg-m3-primary text-white hover:bg-m3-primary/90 shadow-2xs'
                              }`}
                              title="Add to PO Procurement Queue"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{isPoInCart ? 'In PO Queue' : '+ PO Queue'}</span>
                            </button>

                            <button
                              onClick={() => {
                                onOpenAdjust(product);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-m3-surface-variant/40 hover:bg-m3-surface-variant/70 text-m3-on-surface rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                              title="Adjust stock quantity"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>Adjust</span>
                            </button>

                            <button
                              onClick={() => {
                                onLocateInCatalog(product.productCode, product.id);
                                onClose();
                              }}
                              className="p-1.5 text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-lg transition-all cursor-pointer"
                              title="Locate in catalog table"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-lowest space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-extrabold text-sm text-m3-on-surface uppercase tracking-wide">
                  No Stock Alerts Found
                </h4>
                <p className="text-xs text-m3-on-surface-variant">
                  {search || category !== 'All' 
                    ? 'No stock alert items match your search and category filters.' 
                    : 'All inventory items in this branch scope are healthy and above minimum thresholds!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-m3-outline-variant/15 bg-m3-surface-low flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-m3-on-surface-variant font-mono">
            <span>
              Showing <strong className="text-m3-on-surface font-extrabold">{filteredItems.length}</strong> alert item(s)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-m3-surface-variant/40 hover:bg-m3-surface-variant/70 text-m3-on-surface font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer w-full sm:w-auto text-center"
          >
            Close Diagnostics
          </button>
        </div>

      </div>
    </div>
  );
});

StockAlertsModal.displayName = 'StockAlertsModal';
