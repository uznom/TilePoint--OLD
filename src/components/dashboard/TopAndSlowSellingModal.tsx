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
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Product, Sale, SaleItem } from '../../types/db';
import * as XLSX from 'xlsx';

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
  const handleExportXLSX = () => {
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
      size="4xl"
      className="p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 md:p-6 border-b border-divider bg-content1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground uppercase font-sans">
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
      </div>

      {/* Tabs & Filters */}
      <div className="px-5 pt-4 pb-3 border-b border-divider bg-content2/40 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('top20')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'top20'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-content2 text-default-600 hover:bg-default-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Top 20 Best Selling</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'top20' ? 'bg-white/20 text-white' : 'bg-default-200 text-default-700'}`}>
              {analyticsData.top20.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slow10')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'slow10'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Top 10 Slow Selling</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'slow10' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700'}`}>
              {analyticsData.slow10.length}
            </span>
          </button>
        </div>

        {/* Search & Category */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
            <input
              type="text"
              placeholder="Search product code, item..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-content2 border border-divider text-foreground rounded-xl text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-content2 border border-divider text-foreground rounded-xl text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="p-5 overflow-y-auto max-h-[58vh]">
        {activeItems.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-divider bg-content1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-content2/60 border-b border-divider text-[10px] font-black uppercase text-default-500 tracking-wider">
                  <th className="py-3 px-3 text-center w-12">Rank</th>
                  <th className="py-3 px-4">Product & Category</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">
                    {activeTab === 'top20' ? 'Total Revenue' : 'Tied-up Capital'}
                  </th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Status / Velocity</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-sans">
                {activeItems.map((item, idx) => {
                  const rank = idx + 1;
                  const isTop3 = activeTab === 'top20' && rank <= 3;

                  return (
                    <tr key={item.product.id} className="hover:bg-content2/40 transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                          isTop3 
                            ? rank === 1 ? 'bg-amber-500 text-white font-extrabold shadow-sm' : rank === 2 ? 'bg-slate-400 text-white' : 'bg-amber-700 text-white'
                            : 'bg-default-200 text-default-700'
                        }`}>
                          {rank}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
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
                      </td>

                      {/* Units Sold */}
                      <td className="py-3 px-3 text-center font-extrabold text-xs">
                        <span className={item.unitsSold > 0 ? 'text-foreground' : 'text-default-400'}>
                          {item.unitsSold.toLocaleString()} {item.product.unit || 'pcs'}
                        </span>
                      </td>

                      {/* Financial Value */}
                      <td className="py-3 px-3 text-right font-black text-xs">
                        {activeTab === 'top20' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₱{item.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            ₱{item.tiedUpCapital.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          item.currentStock === 0 
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                            : item.currentStock <= 10 
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}>
                          {item.currentStock} {item.product.unit || 'pcs'}
                        </span>
                      </td>

                      {/* Status / Velocity */}
                      <td className="py-3 px-3 text-center">
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
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center rounded-xl border border-dashed border-divider bg-content2/30">
            <Package className="h-8 w-8 text-default-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">No matching products found</p>
            <p className="text-[11px] text-default-400 mt-0.5">Try clearing your search or category filter</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 px-6 border-t border-divider bg-content1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-default-500">
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
      </div>
    </HeroModal>
  );
};
