/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Layers,
  ArrowLeftRight,
  Package,
  Clock,
  Receipt,
  Search,
  Calculator,
  Store,
  Eye,
  Calendar,
  RotateCw
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { HeroCard } from './common/ui/HeroCard';
import { HeroButton } from './common/ui/HeroButton';
import { HeroInput } from './common/ui/HeroInput';
import { HeroModal } from './common/ui/HeroModal';
import { HeroTable } from './common/ui/HeroTable';
import { HeroDropdownSelect, HeroDropdownItem } from './common/ui/HeroDropdown';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeroPagination } from './common/ui/HeroPagination';
import { Sale } from '../types/db';
import { isSameBranch } from '../lib/branchUtils';
import { useMultiSort } from '../hooks/useMultiSort';
import { formatCurrency } from '../utils/formatters';
import { useFeatureFlags } from '../utils/featureFlags';
const LazyTopAndSlowSellingModal = React.lazy(() =>
  import('./dashboard/TopAndSlowSellingModal').then((m) => ({ default: m.TopAndSlowSellingModal }))
);

const parseDate = (d: any): Date => {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  if (typeof d === 'number') return new Date(d);
  if (typeof d === 'string') {
    const normalized = d.includes(' ') && !d.includes('T') ? d.replace(' ', 'T') : d;
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(d);
};

interface DashboardProps {
  darkMode?: boolean;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { flags: featureFlags } = useFeatureFlags();
  const {
    currentUser,
    sales,
    saleItems,
    products,
    branches,
    deliveries,
    shifts,
    parkedSales,
    syncFromSharedServer
  } = useDb();

  // Auto-sync dashboard metrics from shared server on mount and periodically
  useEffect(() => {
    if (typeof syncFromSharedServer === 'function') {
      syncFromSharedServer(true).catch(() => {});
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          syncFromSharedServer(true).catch(() => {});
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [syncFromSharedServer]);

  // Active time range for revenue graph
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'All'>('1M');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Period filter and refresh
  const [dashboardPeriod, setDashboardPeriod] = useState<string>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const periodFilterItems: HeroDropdownItem[] = useMemo(() => [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ], []);

  // Search filter and pagination for recent transactions
  const [searchTxnQuery, setSearchTxnQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [tablePage, setTablePage] = useState<number>(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState<number>(5);

  const paymentFilterItems = useMemo(() => [
    { key: 'ALL', label: 'All Payments' },
    { key: 'CASH', label: 'Cash' },
    { key: 'GCASH', label: 'GCash' },
    { key: 'CARD', label: 'Credit/Debit Card' },
    { key: 'TERMS', label: 'Terms / AR' },
  ], []);

  // Modals state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isStockLookupOpen, setIsStockLookupOpen] = useState(false);
  const [isTopSellingModalOpen, setIsTopSellingModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isQuickCalcOpen, setIsQuickCalcOpen] = useState(false);

  // Quick Tile Calculator state
  const [calcLength, setCalcLength] = useState<number>(5);
  const [calcWidth, setCalcWidth] = useState<number>(4);
  const [calcTileSize, setCalcTileSize] = useState<string>('60x60');
  const [calcWastage, setCalcWastage] = useState<number>(10);

  // Dynamic greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    if (!currentUser) return 'Operator';
    const first = currentUser.fullName?.split(' ')[0];
    return first || currentUser.username || 'Operator';
  }, [currentUser]);

  // Current branch name
  const currentBranch = useMemo(() => {
    if (!currentUser?.branchAssignmentId) return branches[0] || null;
    return branches.find((b) => isSameBranch(b.id, currentUser.branchAssignmentId, branches)) || branches[0];
  }, [branches, currentUser]);

  // Aggregate Sales Revenue
  const totalRevenue = useMemo(() => {
    return sales
      .filter((s) => !s.isDeleted)
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
  }, [sales]);

  // Total Inventory Valuation (sum of cost price * aggregate stock or branch stock)
  const totalInventoryValuation = useMemo(() => {
    return products
      .filter((p) => !p.isDeleted)
      .reduce((sum, p) => {
        const qty = Number(p.stockQuantity) || 0;
        const price = Number(p.sellingPrice) || Number(p.costPrice) || 0;
        return sum + qty * price;
      }, 0);
  }, [products]);

  // Total Active SKUs
  const activeSkuCount = useMemo(() => {
    return products.filter((p) => !p.isDeleted).length;
  }, [products]);

  // Top Selling Product identification calculated dynamically from active sales & items
  const topProduct = useMemo(() => {
    const qtyByProduct: Record<string, { name: string; qty: number; revenue: number }> = {};
    
    // Set of valid, non-voided, non-deleted sale IDs
    const validSaleIds = new Set(sales.filter((s) => !s.isDeleted).map((s) => s.id));

    saleItems.forEach((item) => {
      if (item.isDeleted) return;
      if (item.saleId && !validSaleIds.has(item.saleId)) return;
      
      const key = item.productId || item.productName || 'unknown';
      if (!qtyByProduct[key]) {
        qtyByProduct[key] = {
          name: item.productName || 'Tile Item',
          qty: 0,
          revenue: 0
        };
      }
      qtyByProduct[key].qty += Number(item.quantity) || 0;
      qtyByProduct[key].revenue += Number(item.total) || 0;
    });

    const entries = Object.values(qtyByProduct);
    if (entries.length === 0) {
      const firstTile = products.find((p) => !p.isDeleted);
      return {
        name: firstTile?.productName || 'Awaiting Sales Invoices',
        qty: 0,
        revenue: 0,
        hasSales: false
      };
    }

    entries.sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
    return {
      ...entries[0],
      hasSales: true
    };
  }, [saleItems, sales, products]);

  // Operational Alerts - Computed with precision against active non-deleted state
  const pendingDeliveriesCount = useMemo(() => {
    return deliveries.filter(
      (d: any) => !d?.isDeleted && (
        d.status === 'Pending' ||
        d.status === 'Scheduled' ||
        d.status === 'Packed' ||
        d.status === 'Out For Delivery' ||
        d.status === 'In Transit'
      )
    ).length;
  }, [deliveries]);

  const parkedSalesCount = useMemo(() => {
    return parkedSales.filter((p: any) => !p.isDeleted).length;
  }, [parkedSales]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      if (p.isDeleted) return false;
      const qty = Number(p.stockQuantity) || 0;
      const threshold = Number(p.minimumStock ?? p.lowStockThreshold) || 10;
      return qty <= threshold;
    }).length;
  }, [products]);

  // MoM / Period-over-Period Growth Calculations
  const { momGrowth } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const validSales = sales.filter((s) => !s.isDeleted && s.createdAt);

    const currentPeriodSales = validSales
      .filter((s) => parseDate(s.createdAt).getTime() >= thirtyDaysAgo.getTime())
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

    const prevPeriodSales = validSales
      .filter((s) => {
        const t = parseDate(s.createdAt).getTime();
        return t >= sixtyDaysAgo.getTime() && t < thirtyDaysAgo.getTime();
      })
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

    let growth = 0;
    if (prevPeriodSales > 0) {
      growth = ((currentPeriodSales - prevPeriodSales) / prevPeriodSales) * 100;
    } else if (currentPeriodSales > 0) {
      growth = 100;
    }

    return {
      momGrowth: growth,
      thisMonthSales: currentPeriodSales,
      lastMonthSales: prevPeriodSales
    };
  }, [sales]);

  // Dynamic Chart Spline Points calculated from actual sales & selected time range
  const chartData = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const validSales = sales.filter((s) => !s.isDeleted && s.createdAt);

    if (timeRange === '1D') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const hourRanges = [8, 10, 12, 14, 16, 18, 20];
      
      const values = hourRanges.map((hr, idx) => {
        const nextHr = idx < hourRanges.length - 1 ? hourRanges[idx + 1] : 24;
        const bucketSales = validSales.filter((s) => {
          const d = parseDate(s.createdAt);
          return d.getTime() >= todayStart && d.getHours() >= hr && d.getHours() < nextHr;
        });
        return bucketSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
      });

      const todayTotal = values.reduce((a, b) => a + b, 0);
      const displayVals = values.some(v => v > 0) ? values : [0, 0, 0, 0, 0, 0, todayTotal || 0];

      return {
        labels,
        values: displayVals,
        displayRevenue: formatCurrency(todayTotal),
        change: todayTotal > 0 ? '+Today Active' : '0.0% Today'
      };
    }

    if (timeRange === '1W') {
      const days = 7;
      const labels: string[] = [];
      const values: number[] = [];
      let totalWeek = 0;

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(dayLabel);

        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const daySum = validSales
          .filter((s) => {
            const st = parseDate(s.createdAt).getTime();
            return st >= dayStart && st < dayEnd;
          })
          .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

        values.push(daySum);
        totalWeek += daySum;
      }

      return {
        labels,
        values,
        displayRevenue: formatCurrency(totalWeek),
        change: totalWeek > 0 ? '+7D Active' : '0.0% 7D'
      };
    }

    if (timeRange === '1M') {
      const intervals = 6;
      const labels: string[] = [];
      const values: number[] = [];
      let totalMonth = 0;

      for (let i = intervals - 1; i >= 0; i--) {
        const startDay = (i + 1) * 5;
        const endDay = i * 5;
        const dStart = new Date(now.getTime() - startDay * 24 * 60 * 60 * 1000).getTime();
        const dEnd = new Date(now.getTime() - endDay * 24 * 60 * 60 * 1000).getTime();

        labels.push(`Day -${endDay || 0}`);
        const sum = validSales
          .filter((s) => {
            const st = parseDate(s.createdAt).getTime();
            return st >= dStart && st < dEnd;
          })
          .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

        values.push(sum);
        totalMonth += sum;
      }

      return {
        labels: ['Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
        values: values.some(v => v > 0) ? values : [0, 0, 0, 0, 0, totalMonth || totalRevenue],
        displayRevenue: formatCurrency(totalMonth || totalRevenue),
        change: momGrowth >= 0 ? `+${momGrowth.toFixed(1)}% 1M` : `${momGrowth.toFixed(1)}% 1M`
      };
    }

    if (timeRange === '3M') {
      const labels: string[] = [];
      const values: number[] = [];
      let total3M = 0;

      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mLabel = d.toLocaleDateString('en-US', { month: 'short' });
        labels.push(mLabel);

        const mStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();

        const sum = validSales
          .filter((s) => {
            const st = parseDate(s.createdAt).getTime();
            return st >= mStart && st < mEnd;
          })
          .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

        values.push(sum);
        total3M += sum;
      }

      return {
        labels,
        values: values.some(v => v > 0) ? values : [0, 0, total3M || totalRevenue],
        displayRevenue: formatCurrency(total3M || totalRevenue),
        change: '+3M Trajectory'
      };
    }

    if (timeRange === '1Y') {
      const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const values: number[] = [0, 0, 0, 0];
      const curYear = now.getFullYear();

      validSales.forEach((s) => {
        const d = parseDate(s.createdAt);
        if (d.getFullYear() === curYear) {
          const q = Math.floor(d.getMonth() / 3);
          if (q >= 0 && q < 4) {
            values[q] += Number(s.grandTotal) || 0;
          }
        }
      });

      const totalYear = values.reduce((a, b) => a + b, 0);

      return {
        labels,
        values: values.some(v => v > 0) ? values : [0, 0, 0, totalYear || totalRevenue],
        displayRevenue: formatCurrency(totalYear || totalRevenue),
        change: '+Annual Total'
      };
    }

    // Default: All
    const years = [curYear - 3, curYear - 2, curYear - 1, curYear];
    const labels = years.map(String);
    const values = years.map((y) => {
      return validSales
        .filter((s) => parseDate(s.createdAt).getFullYear() === y)
        .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
    });

    return {
      labels,
      values: values.some(v => v > 0) ? values : [0, 0, 0, totalRevenue],
      displayRevenue: formatCurrency(totalRevenue),
      change: '+All-Time Record'
    };
  }, [timeRange, totalRevenue, sales, momGrowth]);

  // Generate SVG Path for the spline area
  const svgPathData = useMemo(() => {
    const width = 800;
    const height = 240;
    const padding = 20;
    const values = chartData.values.map((v) => Number(v) || 0);
    if (values.length === 0) return { dLine: '', dArea: '', points: [] };

    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values) * 1.05;
    const range = (max - min) || 1;

    const points = values.map((val, idx) => {
      const divisor = values.length > 1 ? values.length - 1 : 1;
      const x = padding + (idx / divisor) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y: isFinite(y) ? y : height - padding, val };
    });

    // Build smooth bezier curve
    let dLine = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      dLine += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const dArea = `${dLine} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { dLine, dArea, points };
  }, [chartData]);

  // Multi-column sorting for recent sales table
  const {
    sortDescriptors: salesSortDescriptors,
    handleSort: handleSalesSort,
    getSortDirection: getSalesSortDir,
    getSortRank: getSalesSortRank,
    sortData: sortSalesData
  } = useMultiSort<Sale>({
    customGetters: {
      saleNumber: (s) => s.saleNumber || '',
      customerName: (s) => s.customerName || 'Walk-In Customer',
      cashierName: (s) => s.cashierName || 'Cashier',
      paymentMethod: (s) => s.paymentMethod || '',
      grandTotal: (s) => Number(s.grandTotal) || 0,
      createdAt: (s) => parseDate(s.createdAt || Date.now()).getTime(),
    }
  });

  // Filtered recent transactions from DB
  const filteredSales = useMemo(() => {
    const list = sales.filter((s) => {
      if (s.isDeleted) return false;
      if (paymentFilter !== 'ALL' && s.paymentMethod?.toUpperCase() !== paymentFilter) return false;
      if (!searchTxnQuery.trim()) return true;
      const q = searchTxnQuery.toLowerCase();
      return (
        s.saleNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.cashierName?.toLowerCase().includes(q)
      );
    });

    if (salesSortDescriptors.length > 0) {
      return sortSalesData(list);
    }
    return list;
  }, [sales, searchTxnQuery, paymentFilter, salesSortDescriptors, sortSalesData]);

  const totalTablePages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredSales.length / tableRowsPerPage));
  }, [filteredSales.length, tableRowsPerPage]);

  const paginatedSales = useMemo(() => {
    const start = (tablePage - 1) * tableRowsPerPage;
    return filteredSales.slice(start, start + tableRowsPerPage);
  }, [filteredSales, tablePage, tableRowsPerPage]);

  // Inventory Categories Breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { count: number; totalQty: number; value: number }> = {};
    
    products.forEach((p) => {
      if (p.isDeleted) return;
      const cat = (p.category || 'General').trim() || 'General';
      if (!catMap[cat]) {
        catMap[cat] = { count: 0, totalQty: 0, value: 0 };
      }
      const qty = Number(p.stockQuantity) || 0;
      const price = Number(p.sellingPrice) || Number(p.costPrice) || 0;
      catMap[cat].count += 1;
      catMap[cat].totalQty += qty;
      catMap[cat].value += qty * price;
    });

    return Object.entries(catMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // Filtered products for Quick Stock Lookup Modal
  const filteredStockProducts = useMemo(() => {
    if (!stockSearchQuery.trim()) return products.filter((p) => !p.isDeleted).slice(0, 10);
    const q = stockSearchQuery.toLowerCase();
    return products
      .filter((p) => !p.isDeleted && (
        p.productName?.toLowerCase().includes(q) ||
        p.productCode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      ))
      .slice(0, 15);
  }, [products, stockSearchQuery]);

  // Tile coverage calculation formula
  const calculatedBoxes = useMemo(() => {
    const area = calcLength * calcWidth;
    const effectiveArea = area * (1 + calcWastage / 100);
    
    // Coverage per box defaults: 60x60 = 1.44 sqm/box, 30x30 = 1.0 sqm/box, 60x120 = 1.44 sqm/box
    let coverage = 1.44;
    if (calcTileSize === '30x30') coverage = 1.0;
    if (calcTileSize === '30x60') coverage = 1.44;
    if (calcTileSize === '80x80') coverage = 1.92;

    const boxes = Math.ceil(effectiveArea / coverage);
    return {
      netArea: area.toFixed(2),
      grossArea: effectiveArea.toFixed(2),
      boxesNeeded: boxes,
      coveragePerBox: coverage
    };
  }, [calcLength, calcWidth, calcTileSize, calcWastage]);

  return (
    <div className="space-y-6 w-full pb-20 md:pb-16 animate-fade-in text-foreground font-sans">
      {/* 1. GREETING & OPERATIONAL HEADER WITH HEROUI ACTION SUITE */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greeting}, {displayName}
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Terminal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-default-500 mt-1 flex items-center gap-1.5 font-normal">
            <Store className="h-3.5 w-3.5 text-primary" />
            <span>{currentBranch ? currentBranch.name : 'TilePoint Central Enterprise'}</span>
          </p>
        </div>

        {/* Action Suite (HeroUI Buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* POS Terminal Checkout */}
          <HeroButton
            onClick={() => onNavigate('pos')}
            variant="solid"
            color="primary"
            size="md"
            radius="full"
            startIcon={<ShoppingCart className="h-4 w-4" />}
            className="font-semibold shadow-sm"
          >
            ERP Checkout
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold">F1</span>
          </HeroButton>

          {/* Stock Lookup */}
          <HeroButton
            onClick={() => setIsStockLookupOpen(true)}
            variant="flat"
            size="md"
            radius="full"
            startIcon={<Layers className="h-4 w-4 text-primary" />}
            className="font-semibold"
          >
            Stock Lookup
          </HeroButton>

          {/* Stock Transfer */}
          <HeroButton
            onClick={() => onNavigate('inventory-transfer')}
            variant="flat"
            size="md"
            radius="full"
            startIcon={<ArrowLeftRight className="h-4 w-4 text-sky-500" />}
            className="font-semibold"
          >
            Transfer Stock
          </HeroButton>

          {/* Tile Coverage Calculator */}
          {featureFlags.tileCalculator && (
            <HeroButton
              onClick={() => setIsQuickCalcOpen(true)}
              variant="flat"
              size="md"
              radius="full"
              startIcon={<Calculator className="h-4 w-4 text-amber-500" />}
              className="font-semibold"
            >
              Tile Calc
            </HeroButton>
          )}

          {/* Refresh & Period Filter Dropdown (HeroUI v3 Segmented Capsule Pill) */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <HeroButton
              isIconOnly
              size="md"
              variant="flat"
              radius="full"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  if (typeof syncFromSharedServer === 'function') {
                    await syncFromSharedServer(false);
                  }
                } catch (err) {
                  console.warn('[Dashboard] Refresh error:', err);
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="bg-default-100 hover:bg-default-200 dark:bg-content2 dark:hover:bg-content3 text-foreground active:scale-[0.98]"
              aria-label="Refresh Metrics"
            >
              <RotateCw className={`h-4 w-4 text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </HeroButton>

            <HeroDropdownSelect
              items={periodFilterItems}
              selectedKey={dashboardPeriod}
              onSelectionChange={(k) => {
                setDashboardPeriod(k);
                if (k === 'daily') setTimeRange('1D');
                else if (k === 'weekly') setTimeRange('1W');
                else if (k === 'monthly') setTimeRange('1M');
                else if (k === 'yearly') setTimeRange('1Y');
              }}
              startIcon={<Calendar className="h-4 w-4" />}
              size="md"
              variant="pill"
            />
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC CARDS (4-CARD HEROUI TACTILE BENTO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <HeroCard
          className="p-5 relative overflow-hidden bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/60"
          variant="elevated"
          radius="2xl"
          isHoverable
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-default-500 tracking-tight">
              Total Gross Sales
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                momGrowth >= 0
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {momGrowth >= 0 ? `+${momGrowth.toFixed(1)}%` : `${momGrowth.toFixed(1)}%`} MoM
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-xs text-default-400 mt-1.5 flex items-center gap-1.5 font-normal">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <Receipt className="h-3 w-3" />
              </span>
              <span>{sales.filter((s) => !s.isDeleted).length} Invoices Recorded</span>
            </div>
          </div>
        </HeroCard>

        {/* Inventory Stock Valuation */}
        <HeroCard
          className="p-5 relative overflow-hidden bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/60"
          variant="elevated"
          radius="2xl"
          isHoverable
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-default-500 tracking-tight">
              Catalog Asset Value
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-500/20">
              {activeSkuCount} Active SKUs
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrency(totalInventoryValuation)}
            </div>
            <div className="text-xs text-default-400 mt-1.5 flex items-center gap-1.5 font-normal">
              <span className="p-1 rounded-md bg-sky-500/10 text-sky-500">
                <Package className="h-3 w-3" />
              </span>
              <button
                type="button"
                onClick={() => onNavigate('inventory-stocks')}
                className="text-sky-500 hover:underline cursor-pointer font-medium"
              >
                View Stock Catalog →
              </button>
            </div>
          </div>
        </HeroCard>

        {/* Top Performer Tile - Clickable to open Top 20 & Slow 10 Velocity Analytics */}
        <HeroCard
          className="p-5 relative overflow-hidden cursor-pointer group bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/60"
          variant="elevated"
          radius="2xl"
          isHoverable
          onClick={() => setIsTopSellingModalOpen(true)}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-default-500 tracking-tight group-hover:text-primary transition-colors">
              Top Selling Product
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/25 transition-all">
              Top 20 / Slow 10
            </span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors" title={topProduct.name}>
              {topProduct.name}
            </div>
            <div className="text-xs text-default-400 mt-1.5 flex items-center justify-between font-normal">
              <span>{topProduct.qty} Units Sold</span>
              <span className="text-emerald-500 font-semibold tabular-nums">
                {formatCurrency(topProduct.revenue)}
              </span>
            </div>
          </div>
        </HeroCard>

        {/* Operational Pulse & Alerts */}
        <HeroCard
          className="p-5 relative overflow-hidden bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/60"
          variant="elevated"
          radius="2xl"
          isHoverable
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-default-500 tracking-tight">
              Operations & Alerts
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              Active Queue
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div
              onClick={() => onNavigate('deliveries-panel')}
              className="p-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer transition-colors shadow-xs active:scale-[0.98]"
            >
              <div className="text-sm font-bold text-sky-500 tabular-nums">{pendingDeliveriesCount}</div>
              <div className="text-[10px] text-default-400 font-medium">Cargo</div>
            </div>
            <div
              onClick={() => onNavigate('pos')}
              className="p-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer transition-colors shadow-xs active:scale-[0.98]"
            >
              <div className="text-sm font-bold text-amber-500 tabular-nums">{parkedSalesCount}</div>
              <div className="text-[10px] text-default-400 font-medium">Parked</div>
            </div>
            <div
              onClick={() => onNavigate('inventory-stocks')}
              className="p-2 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer transition-colors shadow-xs active:scale-[0.98]"
            >
              <div className="text-sm font-bold text-rose-500 tabular-nums">{lowStockCount}</div>
              <div className="text-[10px] text-default-400 font-medium">Low Stock</div>
            </div>
          </div>
        </HeroCard>
      </div>

      {/* 3. MAIN SECTION: REVENUE SPLINE CURVE & OPERATIONAL SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 COLS): SPLINE REVENUE CHART & RECENT TRANSACTIONS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Analytics Spline Chart */}
          <HeroCard className="p-6 relative bg-content1 shadow-xs" variant="bordered" radius="2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider/40">
              <div>
                <span className="text-xs font-medium text-default-500 tracking-tight">
                  Revenue Analytics & Sales Trajectory
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {chartData.displayRevenue}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20">
                    {chartData.change}
                  </span>
                </div>
              </div>

              {/* Time Range Pills (HeroUI Style Segmented Pill) */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 self-start sm:self-auto shadow-2xs">
                {(['1D', '1W', '1M', '3M', '1Y', 'All'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.97] ${
                      timeRange === r
                        ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] font-bold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Vector Spline Line Chart */}
            <div className="relative pt-6 h-[260px] w-full">
              <svg
                viewBox="0 0 800 240"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="tilepointRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--heroui-primary, #006FEE)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--heroui-primary, #006FEE)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                <line x1="20" y1="60" x2="780" y2="60" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />
                <line x1="20" y1="120" x2="780" y2="120" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />
                <line x1="20" y1="180" x2="780" y2="180" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="4 4" />

                {/* Area Gradient Fill */}
                <path d={svgPathData.dArea} fill="url(#tilepointRevGradient)" />

                {/* Main Vector Spline Curve */}
                <path
                  d={svgPathData.dLine}
                  fill="none"
                  stroke="var(--heroui-primary, #006FEE)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Crisp HTML Interactive Circular Markers & Floating Tooltip (Never distorted into ovals) */}
              <div className="absolute inset-0 pt-6 pointer-events-none">
                <div className="relative w-full h-full">
                  {svgPathData.points.map((pt, idx) => {
                    const leftPct = (pt.x / 800) * 100;
                    const topPct = (pt.y / 240) * 100;
                    const isHovered = hoveredPointIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="absolute pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 z-20 group"
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        {/* Perfect Circular Dot (Immune to SVG viewBox non-uniform aspect ratio scaling) */}
                        <div
                          className={`rounded-full transition-all duration-200 border-2 border-primary bg-background shadow-xs flex items-center justify-center ${
                            isHovered
                              ? 'w-4 h-4 ring-4 ring-primary/25 bg-primary scale-110'
                              : 'w-2.5 h-2.5 hover:scale-125 hover:ring-2 hover:ring-primary/20'
                          }`}
                        />

                        {/* Floating Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-30 pointer-events-none animate-fade-in">
                            <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-xl shadow-2xl border border-white/10 text-center whitespace-nowrap">
                              <div className="text-xs font-extrabold font-mono text-emerald-400">
                                {formatCurrency(pt.val)}
                              </div>
                              <div className="text-[9px] text-zinc-400 font-medium mt-0.5">
                                {chartData.labels[idx]}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between items-center text-[10px] font-semibold text-default-400 mt-2 px-3">
                {chartData.labels.map((lbl, i) => (
                  <span key={i}>{lbl}</span>
                ))}
              </div>
            </div>
          </HeroCard>

          {/* Recent Invoices & Transactions Table with HeroUI v3 design language */}
          <HeroCard className="p-5 sm:p-6 bg-content1 shadow-xs" variant="bordered" radius="2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">Recent POS Transactions</h3>
                <p className="text-xs text-default-400 mt-0.5 font-normal">Live store sales invoices and settlement records with pagination</p>
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative min-w-[180px] sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
                  <input
                    type="text"
                    value={searchTxnQuery}
                    onChange={(e) => {
                      setSearchTxnQuery(e.target.value);
                      setTablePage(1);
                    }}
                    placeholder="Search invoice or customer..."
                    className="w-full bg-default-100 dark:bg-content2/80 border border-divider/40 text-foreground text-xs rounded-full pl-9 pr-3.5 py-2 outline-none focus:border-primary/50 transition-colors font-sans active:scale-95"
                  />
                </div>

                <div className="w-[150px]">
                  <HeroDropdownSelect
                    items={paymentFilterItems}
                    selectedKey={paymentFilter}
                    onSelectionChange={(key) => {
                      setPaymentFilter(key);
                      setTablePage(1);
                    }}
                    size="sm"
                    variant="bordered"
                  />
                </div>

                <HeroButton
                  onClick={() => onNavigate('ledger')}
                  variant="light"
                  size="sm"
                  radius="full"
                  className="text-primary font-semibold ml-auto sm:ml-0"
                >
                  All Invoices →
                </HeroButton>
              </div>
            </div>

            {/* HeroTable Implementation */}
            <HeroTable isStriped isCompact={false} className="min-w-full">
              <HeroTable.Header>
                <tr>
                  <HeroTable.Column
                    align="start"
                    allowsSorting
                    sortDirection={getSalesSortDir('saleNumber')}
                    sortRank={getSalesSortRank('saleNumber')}
                    onSort={(e) => handleSalesSort('saleNumber', e)}
                  >
                    Invoice #
                  </HeroTable.Column>
                  <HeroTable.Column
                    align="start"
                    allowsSorting
                    sortDirection={getSalesSortDir('customerName')}
                    sortRank={getSalesSortRank('customerName')}
                    onSort={(e) => handleSalesSort('customerName', e)}
                  >
                    Customer
                  </HeroTable.Column>
                  <HeroTable.Column
                    align="start"
                    allowsSorting
                    sortDirection={getSalesSortDir('cashierName')}
                    sortRank={getSalesSortRank('cashierName')}
                    onSort={(e) => handleSalesSort('cashierName', e)}
                  >
                    Cashier
                  </HeroTable.Column>
                  <HeroTable.Column
                    align="center"
                    allowsSorting
                    sortDirection={getSalesSortDir('paymentMethod')}
                    sortRank={getSalesSortRank('paymentMethod')}
                    onSort={(e) => handleSalesSort('paymentMethod', e)}
                  >
                    Payment
                  </HeroTable.Column>
                  <HeroTable.Column
                    align="end"
                    allowsSorting
                    sortDirection={getSalesSortDir('grandTotal')}
                    sortRank={getSalesSortRank('grandTotal')}
                    onSort={(e) => handleSalesSort('grandTotal', e)}
                  >
                    Grand Total
                  </HeroTable.Column>
                  <HeroTable.Column align="center">Action</HeroTable.Column>
                </tr>
              </HeroTable.Header>
              <HeroTable.Body>
                {paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-default-400 font-medium">
                      No sales transactions match your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <HeroTable.Row
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="cursor-pointer"
                    >
                      <HeroTable.Cell align="start">
                        <div className="font-semibold text-foreground tracking-tight">{sale.saleNumber}</div>
                        <div className="text-[11px] text-default-400">
                          {new Date(sale.createdAt || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="start">
                        <div className="font-medium text-foreground truncate max-w-[140px]">
                          {sale.customerName || 'Walk-In Customer'}
                        </div>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="start">
                        <div className="text-default-500 truncate max-w-[120px] font-normal">
                          {sale.cashierName || 'Cashier'}
                        </div>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase inline-block ${
                            sale.paymentMethod?.toUpperCase() === 'CASH'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20'
                              : sale.paymentMethod?.toUpperCase() === 'GCASH'
                              ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-500/20'
                              : 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {sale.paymentMethod || 'Cash'}
                        </span>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="end">
                        <span className="font-bold text-foreground tabular-nums">
                          {formatCurrency(sale.grandTotal || 0)}
                        </span>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                          }}
                          className="w-7 h-7 rounded-full bg-default-100 hover:bg-default-200 dark:bg-content2 dark:hover:bg-content3 text-default-400 hover:text-foreground transition-all flex items-center justify-center cursor-pointer active:scale-95 mx-auto"
                          title="View Receipt Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </HeroTable.Cell>
                    </HeroTable.Row>
                  ))
                )}
              </HeroTable.Body>
            </HeroTable>

            {/* Pagination Controls */}
            {filteredSales.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-divider/30 mt-3 text-xs text-default-400">
                <div>
                  Showing <span className="font-bold text-foreground">{(tablePage - 1) * tableRowsPerPage + 1}</span> to{' '}
                  <span className="font-bold text-foreground">
                    {Math.min(tablePage * tableRowsPerPage, filteredSales.length)}
                  </span>{' '}
                  of <span className="font-bold text-foreground">{filteredSales.length}</span> transactions
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-default-400 text-xs">
                    <HeroDropdownSelect
                      startIcon={<span>Rows:</span>}
                      items={[
                        { key: '5', label: '5' },
                        { key: '10', label: '10' },
                        { key: '20', label: '20' },
                      ]}
                      selectedKey={String(tableRowsPerPage)}
                      onSelectionChange={(val) => {
                        setTableRowsPerPage(Number(val));
                        setTablePage(1);
                      }}
                      size="sm"
                      variant="pill"
                      className="min-w-[90px]"
                    />
                  </div>

                  <HeroPagination
                    total={totalTablePages}
                    page={tablePage}
                    onChange={(p) => setTablePage(p)}
                    size="sm"
                    showControls
                  />
                </div>
              </div>
            )}
          </HeroCard>
        </div>

        {/* RIGHT COLUMN (1 COL): INVENTORY BREAKDOWN & OPERATIONAL PULSE */}
        <div className="space-y-6">
          {/* Inventory Category Breakdown */}
          <HeroCard className="p-6" variant="bordered">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Categories</h3>
                <p className="text-[11px] text-default-400">Stock distribution by catalog grouping</p>
              </div>
              <HeroButton
                onClick={() => onNavigate('inventory-stocks')}
                variant="light"
                size="sm"
                className="text-primary text-xs font-bold"
              >
                Catalog →
              </HeroButton>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2 scrollbar modal__body--scroll-inside">
              {categoryBreakdown.map((cat, idx) => {
                const percent = totalInventoryValuation > 0
                  ? Math.min(100, Math.round((cat.value / totalInventoryValuation) * 100))
                  : 20;

                const colorClasses = [
                  'bg-primary',
                  'bg-sky-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-purple-500',
                  'bg-rose-500',
                  'bg-cyan-500',
                  'bg-indigo-500',
                  'bg-teal-500',
                  'bg-orange-500',
                ];
                const catColor = colorClasses[idx % colorClasses.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate max-w-[140px]">{cat.name}</span>
                      <span className="text-default-400 font-semibold tabular-nums text-[11px]">
                        {cat.totalQty.toLocaleString()} {cat.totalQty === 1 ? 'Unit' : 'Units'} ({cat.count} {cat.count === 1 ? 'SKU' : 'SKUs'})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-default-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${catColor}`}
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-default-400">
                      <span>{formatCurrency(cat.value)}</span>
                      <span>{percent}% Share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </HeroCard>

          {/* Logistics & Deliveries Pulse */}
          {featureFlags.cargoDeliveries && (
            <HeroCard className="p-6" variant="bordered">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Cargo Deliveries</h3>
                  <p className="text-[11px] text-default-400">Active dispatches & cargo tracking</p>
                </div>
                <HeroButton
                  onClick={() => onNavigate('deliveries-panel')}
                  variant="light"
                  size="sm"
                  className="text-sky-500 text-xs font-bold"
                >
                  Dispatch →
                </HeroButton>
              </div>

              <div className="space-y-2.5">
                {deliveries.slice(0, 4).map((del) => (
                  <div
                    key={del.id}
                    onClick={() => onNavigate('deliveries-panel')}
                    className="p-2.5 rounded-xl bg-default-100/50 hover:bg-default-100 cursor-pointer transition-colors flex items-center justify-between active:scale-[0.98]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-foreground truncate">
                        {del.customerName || 'Customer Delivery'}
                      </div>
                      <div className="text-[10px] text-default-400 truncate">
                        {del.barangay ? `${del.barangay}, ${del.cityMunicipality}` : 'Local Branch Dispatch'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold shrink-0 uppercase ${
                        del.status === 'Delivered'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : del.status === 'Out For Delivery'
                          ? 'bg-sky-500/10 text-sky-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {del.status || 'Pending'}
                    </span>
                  </div>
                ))}

                {deliveries.length === 0 && (
                  <div className="p-4 text-center text-default-400 text-xs font-medium">
                    No active cargo shipments currently queued.
                  </div>
                )}
              </div>
            </HeroCard>
          )}

          {/* Quick Shift Session Status */}
          <HeroCard className="p-5" variant="bordered">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Cashier Shift Register
                </h4>
                <p className="text-[10px] text-default-400 mt-0.5">
                  {shifts.length > 0 ? `${shifts[0].cashierName || 'Active Shift'} · Open` : 'Drawer Active'}
                </p>
              </div>
              <HeroButton
                onClick={() => onNavigate('shift')}
                variant="flat"
                size="sm"
                className="text-xs font-bold"
              >
                Drawer
              </HeroButton>
            </div>
          </HeroCard>
        </div>
      </div>

      {/* 4. MODALS */}
      {/* Transaction Details Modal */}
      <HeroModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-divider/20">
            <div>
              <h3 className="text-base font-extrabold text-foreground pr-10">
                Invoice Breakdown: {selectedSale?.saleNumber || ''}
              </h3>
              <p className="text-xs text-default-400">Transaction details and receipt breakdown</p>
            </div>
          </div>

          {selectedSale && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-default-100/50">
                <div>
                  <span className="text-default-400 text-[10px] uppercase font-bold">Date / Time</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {new Date(selectedSale.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-default-400 text-[10px] uppercase font-bold">Customer</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedSale.customerName || 'Walk-In'}</p>
                </div>
                <div>
                  <span className="text-default-400 text-[10px] uppercase font-bold">Cashier</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedSale.cashierName || 'System'}</p>
                </div>
                <div>
                  <span className="text-default-400 text-[10px] uppercase font-bold">Payment Method</span>
                  <p className="font-bold text-primary mt-0.5">{selectedSale.paymentMethod || 'Cash'}</p>
                </div>
              </div>

              {/* Itemized Sale Items */}
              <div className="space-y-2">
                <h4 className="font-bold text-default-600 text-xs uppercase tracking-wider">Line Items</h4>
                <div className="rounded-xl border border-divider/20 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="text-default-500 font-semibold text-[10px] uppercase border-b border-divider/20">
                      <tr>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/10">
                      {saleItems
                        .filter((item) => item.saleId === selectedSale.id && !item.isDeleted)
                        .map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-semibold text-foreground">{item.productName}</td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice || 0)}</td>
                            <td className="py-2 px-3 text-right font-bold text-foreground">
                              {formatCurrency(item.total || 0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-3 rounded-xl bg-default-100/40 space-y-1.5 text-right font-medium">
                <div className="flex justify-between text-default-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-default-500">
                  <span>12% Output VAT:</span>
                  <span>{formatCurrency(selectedSale.vat || 0)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-foreground pt-1.5 border-t border-divider/20">
                  <span>Grand Total:</span>
                  <span className="text-primary font-black">
                    {formatCurrency(selectedSale.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </HeroModal>

      {/* Quick Stock Lookup Modal */}
      <HeroModal
        isOpen={isStockLookupOpen}
        onClose={() => setIsStockLookupOpen(false)}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-divider/20">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                Enterprise Tile Stock Catalog Lookup
              </h3>
              <p className="text-xs text-default-400">Real-time inventory levels across store catalog</p>
            </div>
          </div>

          <div className="pb-1">
            <HeroInput
              value={stockSearchQuery}
              onValueChange={(val) => setStockSearchQuery(val)}
              placeholder="Search by product code, name, size, or brand..."
              startContent={<Search className="h-4 w-4 text-default-400" />}
              radius="lg"
              variant="flat"
              size="md"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto divide-y divide-divider/10 border border-divider/20 rounded-xl">
            {filteredStockProducts.map((prod) => (
              <div key={prod.id} className="p-3 hover:bg-default-100/50 flex items-center justify-between text-xs active:scale-[0.98]">
                <div>
                  <div className="font-bold text-foreground">{prod.productName}</div>
                  <div className="text-[10px] text-default-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono bg-default-200/60 px-1.5 rounded">{prod.productCode}</span>
                    <span>{prod.category}</span>
                    <span>•</span>
                    <span>{prod.size || 'Standard'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-primary text-sm">
                    {formatCurrency(prod.sellingPrice || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500">
                    {prod.stockQuantity || 0} {prod.unit || 'Boxes'} in Stock
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HeroModal>

      {/* Tile Coverage Calculator Modal */}
      <HeroModal
        isOpen={isQuickCalcOpen}
        onClose={() => setIsQuickCalcOpen(false)}
        size="md"
      >
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-divider/20">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                Tile Coverage & Area Estimator
              </h3>
              <p className="text-xs text-default-400">Calculate surface m² and box count with wastage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <HeroInput
                label="Room Length (Meters)"
                type="number"
                min="0.5"
                step="0.1"
                value={String(calcLength)}
                onValueChange={(val) => setCalcLength(Number(val) || 0)}
                radius="lg"
                variant="flat"
              />
            </div>
            <div>
              <HeroInput
                label="Room Width (Meters)"
                type="number"
                min="0.5"
                step="0.1"
                value={String(calcWidth)}
                onValueChange={(val) => setCalcWidth(Number(val) || 0)}
                radius="lg"
                variant="flat"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <HeroSelect
                label="Tile Dimensions"
                value={calcTileSize}
                onValueChange={(val) => setCalcTileSize(val)}
                radius="md"
                items={[
                  { key: '60x60', value: '60x60', label: '60x60 cm (1.44 m²/box)' },
                  { key: '30x30', value: '30x30', label: '30x30 cm (1.00 m²/box)' },
                  { key: '30x60', value: '30x60', label: '30x60 cm (1.44 m²/box)' },
                  { key: '80x80', value: '80x80', label: '80x80 cm (1.92 m²/box)' },
                ]}
              />
            </div>
            <div>
              <HeroSelect
                label="Wastage / Cut Buffer"
                value={String(calcWastage)}
                onValueChange={(val) => setCalcWastage(Number(val))}
                radius="md"
                items={[
                  { key: '5', value: '5', label: '5% Standard' },
                  { key: '10', value: '10', label: '10% Recommended' },
                  { key: '15', value: '15', label: '15% Diagonal Pattern' },
                ]}
              />
            </div>
          </div>

          {/* Result Calculation Output */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex justify-between items-center text-default-600 font-semibold">
              <span>Net Area:</span>
              <span>{calculatedBoxes.netArea} m²</span>
            </div>
            <div className="flex justify-between items-center text-default-600 font-semibold">
              <span>Gross Area with {calcWastage}% Buffer:</span>
              <span>{calculatedBoxes.grossArea} m²</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black text-primary pt-2 border-t border-primary/20">
              <span>Estimated Boxes Needed:</span>
              <span className="text-xl">{calculatedBoxes.boxesNeeded} Boxes</span>
            </div>
          </div>
        </div>
      </HeroModal>

      {/* Top 20 Best Selling and Top 10 Slow Selling Products Analytics Modal */}
      {isTopSellingModalOpen && (
        <React.Suspense fallback={null}>
          <LazyTopAndSlowSellingModal
            isOpen={isTopSellingModalOpen}
            onClose={() => setIsTopSellingModalOpen(false)}
            products={products}
            sales={sales}
            saleItems={saleItems}
            onNavigate={onNavigate}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default Dashboard;
