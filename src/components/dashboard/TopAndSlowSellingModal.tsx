import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Search, 
  FileSpreadsheet, 
  Sliders, 
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { HeroModal } from '../common/ui/HeroModal';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroInput } from '../common/ui/HeroInput';
import { HeroDropdownSelect } from '../common/ui/HeroDropdown';
import { HeroTable } from '../common/ui/HeroTable';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Product, Sale, SaleItem } from '../../types/db';
import { formatCurrency } from '../../utils/formatters';

export interface TopAndSlowSellingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  onNavigate?: (tab: string) => void;
  onOpenProductAdjust?: (product: Product) => void;
}

export const TopAndSlowSellingModal: React.FC<TopAndSlowSellingModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  saleItems,
  onNavigate,
  onOpenProductAdjust,
}) => {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'top20' | 'slow10' | 'all'>('top20');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Compute sales volume & revenue per product
  const analyticsData = useMemo(() => {
    const validSalesMap = new Map<string, string>();
    sales.forEach(s => {
      if (!s.isDeleted && !(s as any).isVoided) {
        validSalesMap.set(s.id, s.createdAt || (s as any).dateTime || '');
      }
    });
    
    // Aggregation maps
    const statsMap: Record<string, { qty: number; revenue: number; transactions: number; lastSold?: string }> = {};

    saleItems.forEach(item => {
      if ((item as any).isDeleted) return;
      if (item.saleId && !validSalesMap.has(item.saleId)) return;

      const pId = item.productId || item.productName;
      if (!pId) return;

      if (!statsMap[pId]) {
        statsMap[pId] = { qty: 0, revenue: 0, transactions: 0 };
      }
      statsMap[pId].qty += Number(item.quantity || 0);
      statsMap[pId].revenue += Number(item.total || 0);
      statsMap[pId].transactions += 1;
      
      const itemDate = (item as any).createdAt || (item.saleId ? validSalesMap.get(item.saleId) : '');
      if (itemDate) {
        if (!statsMap[pId].lastSold || itemDate > statsMap[pId].lastSold!) {
          statsMap[pId].lastSold = itemDate;
        }
      }
    });

    const nonDeletedProducts = products.filter(p => !p.isDeleted);

    // Build unified product performance records
    const productStats = nonDeletedProducts.map(p => {
      const stat = statsMap[p.id] || statsMap[p.productName] || { qty: 0, revenue: 0, transactions: 0 };
      const currentStock = p.stockQuantity ?? 0;
      const cost = p.costPrice || 0;
      const price = p.sellingPrice || 0;
      const tiedUpCapital = currentStock * (cost > 0 ? cost : price);
      const minStock = p.minimumStock ?? p.lowStockThreshold ?? 10;

      let stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'HEALTHY' = 'HEALTHY';
      if (currentStock === 0) stockStatus = 'OUT_OF_STOCK';
      else if (currentStock <= minStock * 0.5) stockStatus = 'CRITICAL';
      else if (currentStock <= minStock) stockStatus = 'LOW';

      return {
        product: p,
        unitsSold: stat.qty,
        revenue: stat.revenue,
        transactions: stat.transactions,
        lastSold: stat.lastSold,
        currentStock,
        tiedUpCapital,
        price,
        cost,
        stockStatus,
        category: p.category || 'General',
        brand: p.brand || 'Generic'
      };
    });

    // 1. Top 20 Best Selling (Ranked by Revenue, then by Units Sold)
    const sortedBest = [...productStats]
      .filter(item => item.unitsSold > 0 || item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
      .slice(0, 20);

    // If fewer than 20 sold, backfill with remaining products
    const bestSet = new Set(sortedBest.map(i => i.product.id));
    if (sortedBest.length < 20) {
      const remaining = productStats
        .filter(i => !bestSet.has(i.product.id))
        .sort((a, b) => b.currentStock - a.currentStock)
        .slice(0, 20 - sortedBest.length);
      sortedBest.push(...remaining);
    }

    // 2. Top 10 Slow Selling / Non-Moving (Lowest units sold, with active stock tying up capital)
    const sortedSlow = [...productStats]
      .sort((a, b) => {
        // Prioritize zero sales first, then lowest sales, then highest tied-up capital
        if (a.unitsSold !== b.unitsSold) {
          return a.unitsSold - b.unitsSold;
        }
        return b.tiedUpCapital - a.tiedUpCapital;
      })
      .slice(0, 10);

    return {
      top20: sortedBest,
      slow10: sortedSlow,
      all: productStats
    };
  }, [products, sales, saleItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && !p.isDeleted) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Active list based on tab
  const activeItems = useMemo(() => {
    let list = activeTab === 'top20' 
      ? analyticsData.top20 
      : activeTab === 'slow10' 
        ? analyticsData.slow10 
        : analyticsData.all;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => 
        item.product.productName.toLowerCase().includes(q) ||
        item.product.productCode.toLowerCase().includes(q) ||
        (item.product.sku && item.product.sku.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'All') {
      list = list.filter(item => item.category === categoryFilter);
    }

    return list;
  }, [activeTab, analyticsData, searchQuery, categoryFilter]);

  // Export to Excel
  const handleExportXLSX = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Sheet 1: Top 20 Best Sellers
    const topData = analyticsData.top20.map((item, idx) => ({
      Rank: idx + 1,
      'Product Code': item.product.productCode,
      'Product Name': item.product.productName,
      Category: item.category,
      Brand: item.brand,
      'Units Sold': item.unitsSold,
      'Total Sales (PHP)': item.revenue,
      'Current Stock': item.currentStock,
      'Selling Price': item.price,
      'Stock Status': item.stockStatus
    }));
    const wsTop = XLSX.utils.json_to_sheet(topData);
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top 20 Best Sellers');

    // Sheet 2: Top 10 Slow Selling
    const slowData = analyticsData.slow10.map((item, idx) => ({
      Rank: idx + 1,
      'Product Code': item.product.productCode,
      'Product Name': item.product.productName,
      Category: item.category,
      Brand: item.brand,
      'Units Sold': item.unitsSold,
      'Current Stock on Hand': item.currentStock,
      'Tied-up Capital (PHP)': item.tiedUpCapital,
      'Unit Price (PHP)': item.price,
      'Recommended Action': item.unitsSold === 0 ? 'Liquidate / Discount' : 'Bundle Promotion'
    }));
    const wsSlow = XLSX.utils.json_to_sheet(slowData);
    XLSX.utils.book_append_sheet(wb, wsSlow, 'Top 10 Slow Selling');

    XLSX.writeFile(wb, `TilePoint_Product_Velocity_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
    >
      {/* Header */}
      <HeroModal.Header className="p-5 md:p-6 border-b border-divider bg-content1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground uppercase font-sans">
              Product Sales Velocity & Movement Analytics
            </h2>
            <p className="text-xs text-default-500 font-medium mt-0.5">
              Ranked analysis of Top 20 Best Selling and Top 10 Slow Moving products
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <HeroButton
            onClick={handleExportXLSX}
            color="secondary"
            variant="flat"
            size="sm"
            className="font-bold text-xs uppercase tracking-wider"
            startIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Export XLSX
          </HeroButton>
        </div>
      </HeroModal.Header>

      {/* Tabs & Filters */}
      <div className="px-5 pt-4 pb-3 border-b border-divider bg-content2/40 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs (Tactile Segmented Rail) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('top20')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer font-sans active:scale-[0.98] ${
              activeTab === 'top20'
                ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,111,238,0.25)] font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Top 20 Best Selling</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'top20' ? 'bg-white/20 text-white' : 'bg-default-200 text-default-700'}`}>
              {analyticsData.top20.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slow10')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer font-sans active:scale-[0.98] ${
              activeTab === 'slow10'
                ? 'bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,165,36,0.25)] font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Top 10 Slow Selling</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'slow10' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700'}`}>
              {analyticsData.slow10.length}
            </span>
          </button>
        </div>

        {/* Search & Category */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-56">
            <HeroInput
              placeholder="Search product code, item..."
              value={searchQuery}
              onValueChange={(val) => setSearchQuery(val)}
              startContent={<Search className="h-3.5 w-3.5 text-default-400" />}
              size="sm"
              radius="full"
              variant="flat"
            />
          </div>

          <HeroDropdownSelect
            items={[
              { key: 'All', label: 'All Categories' },
              ...categories.map(c => ({ key: c, label: c })),
            ]}
            selectedKey={categoryFilter}
            onSelectionChange={(val) => setCategoryFilter(val)}
            size="sm"
            variant="pill"
            className="min-w-[140px]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="p-5 overflow-y-auto max-h-[58vh]">
        {activeItems.length > 0 ? (
          <HeroTable isStriped className="min-w-full">
            <HeroTable.Header>
              <HeroTable.Column align="center" className="w-12">Rank</HeroTable.Column>
              <HeroTable.Column>Product & Category</HeroTable.Column>
              <HeroTable.Column align="center">Units Sold</HeroTable.Column>
              <HeroTable.Column align="end">
                {activeTab === 'top20' ? 'Total Revenue' : 'Tied-up Capital'}
              </HeroTable.Column>
              <HeroTable.Column align="center">Current Stock</HeroTable.Column>
              <HeroTable.Column align="center">Status / Velocity</HeroTable.Column>
              <HeroTable.Column align="end">Action</HeroTable.Column>
            </HeroTable.Header>
            <HeroTable.Body>
              {activeItems.map((item, idx) => {
                const rank = idx + 1;
                const isTop3 = activeTab === 'top20' && rank <= 3;

                return (
                  <HeroTable.Row key={item.product.id}>
                    {/* Rank */}
                    <HeroTable.Cell align="center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                        isTop3 
                          ? rank === 1 ? 'bg-amber-500 text-white font-extrabold shadow-sm' : rank === 2 ? 'bg-slate-400 text-white' : 'bg-amber-700 text-white'
                          : 'bg-default-200 text-default-700'
                      }`}>
                        {rank}
                      </span>
                    </HeroTable.Cell>

                    {/* Product */}
                    <HeroTable.Cell>
                      <div className="font-extrabold text-foreground text-xs leading-tight">
                        {item.product.productName}
                      </div>
                      <div className="text-[10px] text-default-400 mt-0.5 flex items-center gap-1.5 font-medium">
                        <span className="font-mono text-primary font-bold">{item.product.productCode}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                        {item.brand && (
                          <>
                            <span>•</span>
                            <span>{item.brand}</span>
                          </>
                        )}
                      </div>
                    </HeroTable.Cell>

                    {/* Units Sold */}
                    <HeroTable.Cell align="center" className="font-extrabold text-xs">
                      <span className={item.unitsSold > 0 ? 'text-foreground' : 'text-default-400'}>
                        {item.unitsSold.toLocaleString()} {item.product.unit || 'pcs'}
                      </span>
                    </HeroTable.Cell>

                    {/* Financial Value */}
                    <HeroTable.Cell align="end" className="font-black text-xs">
                      {activeTab === 'top20' ? (
                         <span className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.revenue)}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          {formatCurrency(item.tiedUpCapital)}
                        </span>
                      )}
                    </HeroTable.Cell>

                    {/* Current Stock */}
                    <HeroTable.Cell align="center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.currentStock === 0 
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                          : item.currentStock <= 10 
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>
                        {item.currentStock} {item.product.unit || 'pcs'}
                      </span>
                    </HeroTable.Cell>

                    {/* Status / Velocity */}
                    <HeroTable.Cell align="center">
                      {activeTab === 'top20' ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ArrowUpRight className="h-3.5 w-3.5" /> High Demand
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 dark:text-amber-400">
                          <ArrowDownRight className="h-3.5 w-3.5" /> 
                          {item.unitsSold === 0 ? 'Non-Moving' : 'Slow Turn'}
                        </span>
                      )}
                    </HeroTable.Cell>

                    {/* Action */}
                    <HeroTable.Cell align="end">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenProductAdjust && (
                          <HeroButton
                            onClick={() => {
                              onOpenProductAdjust(item.product);
                              onClose();
                            }}
                            variant="flat"
                            size="sm"
                            className="text-[10.5px] font-bold py-1 px-2 h-7"
                            startIcon={<Sliders className="h-3 w-3" />}
                          >
                            Adjust
                          </HeroButton>
                        )}
                      </div>
                    </HeroTable.Cell>
                  </HeroTable.Row>
                );
              })}
            </HeroTable.Body>
          </HeroTable>
        ) : (
          <div className="py-12 text-center rounded-xl border border-dashed border-divider bg-content2/30">
            <Package className="h-8 w-8 text-default-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">No matching products found</p>
            <p className="text-[11px] text-default-400 mt-0.5">Try clearing your search or category filter</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <HeroModal.Footer className="p-4 px-6 border-t border-divider bg-content1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-default-500 font-medium">
          Showing <strong className="text-foreground font-extrabold">{activeItems.length}</strong> product record(s)
        </div>
        <HeroButton
          onClick={onClose}
          variant="flat"
          size="sm"
          className="w-full sm:w-auto font-bold uppercase tracking-wider"
        >
          Close Analytics
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};
