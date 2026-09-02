import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  FileSpreadsheet, 
  Plus, 
  AlertCircle, 
  AlertTriangle, 
  Search, 
  X,
  Sliders,
  Eye,
  Check
} from 'lucide-react';
import { Branch, Product } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroDropdownSelect } from '../common/ui/HeroDropdown';
import { HeroTooltip } from '../common/ui/HeroTooltip';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroTable } from '../common/ui/HeroTable';

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
  poCart?: Array<{ productId: string }>;
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
  poCart = [],
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

  useEffect(() => {
    if (isOpen && initialFilter) {
      setFilter(initialFilter);
    }
  }, [isOpen, initialFilter]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(alertProductsList)) return [];
    return alertProductsList.filter(item => {
      if (!item || !item.product) return false;
      const matchFilter =
        filter === 'ALL' ||
        (filter === 'OUT_OF_STOCK' && item.alertType === 'OUT_OF_STOCK') ||
        (filter === 'CRITICAL' && item.alertType === 'CRITICAL') ||
        (filter === 'LOW' && (item.alertType === 'LOW' || item.alertType === 'CRITICAL'));

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

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
    >
      {/* Modal Header */}
      <HeroModal.Header className="p-5 md:p-6 border-b border-divider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-content1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-danger/10 text-danger shrink-0 border border-danger/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Stock Alert Diagnostics & Action Hub
            </h2>
            <span className="text-xs font-medium text-primary block mt-0.5">
              Scope: {selectedViewBranchId === 'consolidated' ? 'HQ Consolidated (All Branches)' : getBranchOptionLabel(branches.find(b => b.id === selectedViewBranchId))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <HeroButton
            onClick={async () => {
              const branchLabel = selectedViewBranchId === 'consolidated' 
                ? 'Consolidated' 
                : (branches.find(b => b.id === selectedViewBranchId)?.name || selectedViewBranchId);
              await exportStockAlertsToXLSX(filteredItems, branchLabel);
              showToast(`Exported ${filteredItems.length} stock alert items to Excel (.XLSX)!`);
            }}
            disabled={filteredItems.length === 0}
            color="secondary"
            variant="flat"
            size="sm"
            className="font-semibold text-xs"
            startIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Export XLSX
          </HeroButton>

          <HeroButton
            onClick={onBulkQueueAlerts}
            disabled={filteredItems.length === 0}
            color="success"
            variant="solid"
            size="sm"
            className="font-semibold text-xs"
            startIcon={<Plus className="h-4 w-4" />}
          >
            Queue All to PO ({filteredItems.length})
          </HeroButton>
        </div>
      </HeroModal.Header>

        {/* Modal Filter Tabs Bar */}
        <div className="px-5 pt-3 pb-3 border-b border-divider dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3 font-sans">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 overflow-x-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-sans active:scale-[0.98] ${
                filter === 'ALL'
                  ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>All Alerts</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${filter === 'ALL' ? 'bg-primary/10 text-primary' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                {alertProductsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('OUT_OF_STOCK')}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-sans active:scale-[0.98] ${
                filter === 'OUT_OF_STOCK'
                  ? 'bg-rose-500 text-white shadow-[0_2px_8px_rgba(243,18,96,0.25)] font-bold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Out of Stock</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${filter === 'OUT_OF_STOCK' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                {stats.outOfStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('CRITICAL')}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-sans active:scale-[0.98] ${
                filter === 'CRITICAL'
                  ? 'bg-rose-500 text-white shadow-[0_2px_8px_rgba(243,18,96,0.25)] font-bold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Critical Warns</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${filter === 'CRITICAL' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                {stats.criticalStockCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('LOW')}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-sans active:scale-[0.98] ${
                filter === 'LOW'
                  ? 'bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,165,36,0.25)] font-bold'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${filter === 'LOW' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                {stats.lowStockCount}
              </span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:w-64">
              <span className="text-[11px] font-bold text-default-500 shrink-0 hidden md:inline">Search:</span>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
                <input
                  type="text"
                  placeholder="Filter by code, item name, SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-content2 border border-divider text-foreground rounded-medium text-xs font-bold focus:outline-none focus:border-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-default-400 hover:text-foreground cursor-pointer active:scale-95"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <HeroDropdownSelect
                startIcon={<span className="text-[11px] font-bold text-default-500 shrink-0 hidden md:inline">Category:</span>}
                items={[
                  { key: 'All', label: 'All Categories' },
                  ...categories.map(cat => ({ key: cat, label: cat })),
                ]}
                selectedKey={category}
                onSelectionChange={(val) => setCategory(val)}
                size="sm"
                variant="pill"
                className="min-w-[140px]"
              />
            </div>
          </div>
        </div>

        {/* Modal Table Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredItems.length > 0 ? (
            <HeroTable isStriped className="min-w-full">
              <HeroTable.Header>
                <HeroTable.Column>Product Code & Item</HeroTable.Column>
                <HeroTable.Column>Category & Brand</HeroTable.Column>
                <HeroTable.Column align="center">Stock Level vs Minimum</HeroTable.Column>
                <HeroTable.Column align="center">Deficit</HeroTable.Column>
                <HeroTable.Column align="center">Alert Status</HeroTable.Column>
                <HeroTable.Column align="end">Quick Actions</HeroTable.Column>
              </HeroTable.Header>
              <HeroTable.Body>
                {filteredItems.map(({ product, qty, threshold, alertType, deficit }) => {
                  const isPoInCart = (poCart || []).some(c => c?.productId === product.id);

                  return (
                    <HeroTable.Row key={product.id}>
                      <HeroTable.Cell>
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.productName}
                              className="w-9 h-9 rounded-medium object-cover border border-divider shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-medium bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                              {product.productCode.slice(0, 3)}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-foreground text-xs leading-tight">
                              {product.productName}
                            </div>
                            <div className="text-[10px] text-default-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-bold text-primary">{product.productCode}</span>
                              {product.sku && <span>• SKU: {product.sku}</span>}
                            </div>
                          </div>
                        </div>
                      </HeroTable.Cell>

                      <HeroTable.Cell>
                        <span className="font-bold text-foreground block text-[11px]">{product.category}</span>
                        <span className="text-[10px] text-default-500">{product.brand || 'Generic'}</span>
                      </HeroTable.Cell>

                      <HeroTable.Cell align="center" className="min-w-[140px]">
                        <div className="space-y-1 max-w-[160px] mx-auto">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className={qty === 0 ? 'text-danger font-extrabold' : qty <= threshold * 0.5 ? 'text-danger' : 'text-warning'}>
                              {qty} {product.unit || 'pcs'}
                            </span>
                            <span className="text-default-500 text-[10px]">
                              Min: {threshold}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-default-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                qty === 0 
                                  ? 'bg-danger w-0' 
                                  : qty <= threshold * 0.5 
                                    ? 'bg-danger' 
                                    : 'bg-warning'
                              }`} 
                              style={{ width: `${Math.min(100, Math.max(5, (qty / (threshold || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </HeroTable.Cell>

                      <HeroTable.Cell align="center" className="font-bold text-xs text-danger">
                        {deficit > 0 ? `-${deficit} ${product.unit || 'pcs'}` : '0'}
                      </HeroTable.Cell>

                      <HeroTable.Cell align="center">
                        {alertType === 'OUT_OF_STOCK' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-danger/15 text-danger border border-danger/30">
                            <X className="h-3 w-3" /> Out of Stock
                          </span>
                        )}
                        {alertType === 'CRITICAL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-danger/15 text-danger border border-danger/30">
                            <AlertCircle className="h-3 w-3" /> Critical Warn
                          </span>
                        )}
                        {alertType === 'LOW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-warning/15 text-warning border border-warning/30">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        )}
                      </HeroTable.Cell>

                      <HeroTable.Cell align="end">
                        <div className="flex items-center justify-end gap-1.5">
                          <HeroButton
                            onClick={() => onQueueRestock(product.id)}
                            color={isPoInCart ? 'success' : 'primary'}
                            variant={isPoInCart ? 'flat' : 'solid'}
                            size="sm"
                            className="text-[10.5px] font-extrabold uppercase tracking-wider"
                            startIcon={<Plus className="h-3.5 w-3.5" />}
                          >
                            {isPoInCart ? 'In PO Queue' : '+ PO Queue'}
                          </HeroButton>

                          <HeroButton
                            onClick={() => {
                              onOpenAdjust(product);
                              onClose();
                            }}
                            variant="flat"
                            size="sm"
                            className="text-[10.5px] font-extrabold uppercase tracking-wider"
                            startIcon={<Sliders className="h-3.5 w-3.5" />}
                          >
                            Adjust
                          </HeroButton>

                          <HeroTooltip content="Locate in catalog table">
                            <button
                              type="button"
                              onClick={() => {
                                onLocateInCatalog(product.productCode, product.id);
                                onClose();
                              }}
                              className="p-1.5 text-default-400 hover:text-primary hover:bg-primary/10 rounded-medium transition-colors cursor-pointer active:scale-95"
                              aria-label="Locate in catalog"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </HeroTooltip>
                        </div>
                      </HeroTable.Cell>
                    </HeroTable.Row>
                  );
                })}
              </HeroTable.Body>
            </HeroTable>
          ) : (
            <div className="py-12 px-4 text-center rounded-medium border border-dashed border-divider bg-content2/30 space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wide">
                  No Stock Alerts Found
                </h4>
                <p className="text-xs text-default-500">
                  {search || category !== 'All' 
                    ? 'No stock alert items match your search and category filters.' 
                    : 'All inventory items in this branch scope are healthy and above minimum thresholds!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <HeroModal.Footer className="p-4 px-6 border-t border-divider bg-content1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-default-500 font-medium">
            <span>
              Showing <strong className="text-foreground font-extrabold">{filteredItems.length}</strong> alert item(s)
            </span>
          </div>

          <HeroButton
            onClick={onClose}
            variant="flat"
            size="sm"
            className="w-full sm:w-auto font-bold uppercase tracking-wider"
          >
            Close Diagnostics
          </HeroButton>
        </HeroModal.Footer>
    </HeroModal>
  );
});

StockAlertsModal.displayName = 'StockAlertsModal';

export default StockAlertsModal;
