/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  X,
  Calendar,
  RotateCw
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { HeroCard } from './common/ui/HeroCard';
import { HeroButton } from './common/ui/HeroButton';
import { HeroModal } from './common/ui/HeroModal';
import { HeroTable } from './common/ui/HeroTable';
import { HeroDropdownSelect, HeroDropdownItem } from './common/ui/HeroDropdown';
import { HeroSelect } from './common/ui/HeroSelect';
import { HeroPagination } from './common/ui/HeroPagination';
import { Sale } from '../types/db';
import { isSameBranch } from '../lib/branchUtils';
import { useMultiSort } from '../hooks/useMultiSort';
import { MultiSortBadgeBar } from './common/ui/MultiSortBadgeBar';
const LazyTopAndSlowSellingModal = React.lazy(() =>
  import('./dashboard/TopAndSlowSellingModal').then((m) => ({ default: m.TopAndSlowSellingModal }))
);

interface DashboardProps {
  darkMode?: boolean;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    currentUser,
    sales,
    saleItems,
    products,
    branches,
    deliveries,
    shifts,
    parkedSales
  } = useDb();

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
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  }, [sales]);

  // Total Inventory Valuation (sum of cost price * aggregate stock or branch stock)
  const totalInventoryValuation = useMemo(() => {
    return products
      .filter((p) => !p.isDeleted)
      .reduce((sum, p) => {
        const qty = p.stockQuantity || 0;
        const price = p.sellingPrice || p.costPrice || 0;
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
      qtyByProduct[key].qty += item.quantity || 0;
      qtyByProduct[key].revenue += item.total || 0;
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
      const qty = p.stockQuantity ?? 0;
      const threshold = p.minimumStock ?? p.lowStockThreshold ?? 10;
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
      .filter((s) => new Date(s.createdAt).getTime() >= thirtyDaysAgo.getTime())
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    const prevPeriodSales = validSales
      .filter((s) => {
        const t = new Date(s.createdAt).getTime();
        return t >= sixtyDaysAgo.getTime() && t < thirtyDaysAgo.getTime();
      })
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

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
          const d = new Date(s.createdAt);
          return d.getTime() >= todayStart && d.getHours() >= hr && d.getHours() < nextHr;
        });
        return bucketSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      });

      const todayTotal = values.reduce((a, b) => a + b, 0);
      // If 0 today, fallback smoothly to cumulative curve or actual values
      const displayVals = values.some(v => v > 0) ? values : [0, 0, 0, 0, 0, 0, todayTotal || 0];

      return {
        labels,
        values: displayVals,
        displayRevenue: `₱${todayTotal.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
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
            const st = new Date(s.createdAt).getTime();
            return st >= dayStart && st < dayEnd;
          })
          .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

        values.push(daySum);
        totalWeek += daySum;
      }

      return {
        labels,
        values,
        displayRevenue: `₱${totalWeek.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
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
            const st = new Date(s.createdAt).getTime();
            return st >= dStart && st < dEnd;
          })
          .reduce((acc, s) => acc + (s.grandTotal || 0), 0);

        values.push(sum);
        totalMonth += sum;
      }

      return {
        labels: ['Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
        values: values.some(v => v > 0) ? values : [0, 0, 0, 0, 0, totalMonth || totalRevenue],
        displayRevenue: `₱${(totalMonth || totalRevenue).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
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
            const st = new Date(s.createdAt).getTime();
            return st >= mStart && st < mEnd;
          })
          .reduce((acc, s) => acc + (s.grandTotal || 0), 0);

        values.push(sum);
        total3M += sum;
      }

      return {
        labels,
        values: values.some(v => v > 0) ? values : [0, 0, total3M || totalRevenue],
        displayRevenue: `₱${(total3M || totalRevenue).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
        change: '+3M Trajectory'
      };
    }

    if (timeRange === '1Y') {
      const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const values: number[] = [0, 0, 0, 0];
      const curYear = now.getFullYear();

      validSales.forEach((s) => {
        const d = new Date(s.createdAt);
        if (d.getFullYear() === curYear) {
          const q = Math.floor(d.getMonth() / 3);
          if (q >= 0 && q < 4) {
            values[q] += s.grandTotal || 0;
          }
        }
      });

      const totalYear = values.reduce((a, b) => a + b, 0);

      return {
        labels,
        values: values.some(v => v > 0) ? values : [0, 0, 0, totalYear || totalRevenue],
        displayRevenue: `₱${(totalYear || totalRevenue).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
        change: '+Annual Total'
      };
    }

    // Default: All
    const years = [curYear - 3, curYear - 2, curYear - 1, curYear];
    const labels = years.map(String);
    const values = years.map((y) => {
      return validSales
        .filter((s) => new Date(s.createdAt).getFullYear() === y)
        .reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    });

    return {
      labels,
      values: values.some(v => v > 0) ? values : [0, 0, 0, totalRevenue],
      displayRevenue: `₱${totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`,
      change: '+All-Time Record'
    };
  }, [timeRange, totalRevenue, sales, momGrowth]);

  // Generate SVG Path for the spline area
  const svgPathData = useMemo(() => {
    const width = 800;
    const height = 240;
    const padding = 20;
    const values = chartData.values;
    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y, val };
    });

    if (points.length === 0) return { dLine: '', dArea: '', points: [] };

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
    removeSort: removeSalesSort,
    clearSort: clearSalesSort,
    sortData: sortSalesData
  } = useMultiSort<Sale>({
    customGetters: {
      saleNumber: (s) => s.saleNumber || '',
      customerName: (s) => s.customerName || 'Walk-In Customer',
      cashierName: (s) => s.cashierName || 'Cashier',
      paymentMethod: (s) => s.paymentMethod || '',
      grandTotal: (s) => s.grandTotal || 0,
      createdAt: (s) => new Date(s.createdAt || Date.now()).getTime(),
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
      const cat = p.category || 'General Tiles';
      if (!catMap[cat]) {
        catMap[cat] = { count: 0, totalQty: 0, value: 0 };
      }
      catMap[cat].count += 1;
      catMap[cat].totalQty += p.stockQuantity || 0;
      catMap[cat].value += (p.stockQuantity || 0) * (p.sellingPrice || 0);
    });

    return Object.entries(catMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
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

          {/* Refresh & Period Filter Dropdown (HeroUI v3 Segmented Capsule Pill) */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <HeroButton
              isIconOnly
              size="md"
              variant="flat"
              radius="full"
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              className="bg-default-100 hover:bg-default-200 dark:bg-content2 dark:hover:bg-content3 text-foreground"
              aria-label="Refresh Metrics"
            >
              <RotateCw className={`h-4 w-4 text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </HeroButton>

            <HeroDropdownSelect
              items={periodFilterItems}
              selectedKey={dashboardPeriod}
              onSelectionChange={(k) => setDashboardPeriod(k)}
              startIcon={<Calendar className="h-4 w-4" />}
              size="md"
              variant="pill"
            />
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC CARDS (4-CARD HEROUI AESTHETIC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <HeroCard
          className="p-5 relative overflow-hidden transition-all duration-200 hover:border-default-400 bg-content1 shadow-xs"
          variant="bordered"
          radius="2xl"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-default-500 tracking-tight">
              Total Gross Sales
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
              ₱{totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-default-400 mt-1 flex items-center gap-1.5 font-normal">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>{sales.filter((s) => !s.isDeleted).length} Invoices Recorded</span>
            </div>
          </div>
        </HeroCard>

        {/* Inventory Stock Valuation */}
        <HeroCard
          className="p-5 relative overflow-hidden transition-all duration-200 hover:border-default-400 bg-content1 shadow-xs"
          variant="bordered"
          radius="2xl"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-default-500 tracking-tight">
              Catalog Asset Value
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-500/20">
              {activeSkuCount} Active SKUs
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              ₱{totalInventoryValuation.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-default-400 mt-1 flex items-center gap-1.5 font-normal">
              <Package className="h-3.5 w-3.5 text-sky-500" />
              <button
                type="button"
                onClick={() => onNavigate('inventory-stocks')}
                className="text-sky-500 hover:underline cursor-pointer"
              >
                View Stock Catalog →
              </button>
            </div>
          </div>
        </HeroCard>

        {/* Top Performer Tile - Clickable to open Top 20 & Slow 10 Velocity Analytics */}
        <HeroCard
          className="p-5 relative overflow-hidden transition-all duration-200 hover:border-primary/60 hover:shadow-sm cursor-pointer group bg-content1 shadow-xs"
          variant="bordered"
          radius="2xl"
          onClick={() => setIsTopSellingModalOpen(true)}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-default-500 tracking-tight group-hover:text-primary transition-colors">
              Top Selling Product
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20 group-hover:bg-amber-100 transition-all">
              Top 20 / Slow 10
            </span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors" title={topProduct.name}>
              {topProduct.name}
            </div>
            <div className="text-xs text-default-400 mt-1 flex items-center justify-between font-normal">
              <span>{topProduct.qty} Units Sold</span>
              <span className="text-emerald-500 font-semibold tabular-nums">
                ₱{topProduct.revenue.toLocaleString('en-PH')}
              </span>
            </div>
          </div>
        </HeroCard>

        {/* Operational Pulse & Alerts */}
        <HeroCard
          className="p-5 relative overflow-hidden transition-all duration-200 hover:border-default-400 bg-content1 shadow-xs"
          variant="bordered"
          radius="2xl"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-default-500 tracking-tight">
              Operations & Alerts
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Active Queue
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div
              onClick={() => onNavigate('deliveries-panel')}
              className="p-2 rounded-xl bg-default-100/70 dark:bg-content2/60 hover:bg-default-200/70 cursor-pointer transition-colors"
            >
              <div className="text-sm font-bold text-sky-500 tabular-nums">{pendingDeliveriesCount}</div>
              <div className="text-[10px] text-default-400 font-medium">Cargo</div>
            </div>
            <div
              onClick={() => onNavigate('pos')}
              className="p-2 rounded-xl bg-default-100/70 dark:bg-content2/60 hover:bg-default-200/70 cursor-pointer transition-colors"
            >
              <div className="text-sm font-bold text-amber-500 tabular-nums">{parkedSalesCount}</div>
              <div className="text-[10px] text-default-400 font-medium">Parked</div>
            </div>
            <div
              onClick={() => onNavigate('inventory-stocks')}
              className="p-2 rounded-xl bg-default-100/70 dark:bg-content2/60 hover:bg-default-200/70 cursor-pointer transition-colors"
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
              <div className="flex items-center bg-default-100 dark:bg-content2/80 p-1 rounded-full border border-divider/40 dark:border-white/5 self-start sm:self-auto shadow-xs">
                {(['1D', '1W', '1M', '3M', '1Y', 'All'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer font-sans active:scale-[0.97] ${
                      timeRange === r
                        ? 'bg-white text-foreground dark:bg-content3 dark:text-white shadow-xs'
                        : 'text-default-500 dark:text-default-400 hover:text-foreground'
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
                />

                {/* Interactive Points */}
                {svgPathData.points.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPointIndex === idx ? 6 : 4}
                      className="fill-background stroke-primary transition-all duration-150 cursor-pointer"
                      strokeWidth="2.5"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                    {hoveredPointIndex === idx && (
                      <g>
                        <rect
                          x={Math.max(10, Math.min(pt.x - 55, 690))}
                          y={pt.y - 45}
                          width="110"
                          height="36"
                          rx="8"
                          className="fill-content1 stroke-divider"
                          strokeWidth="1"
                          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                        />
                        <text
                          x={Math.max(10, Math.min(pt.x - 55, 690)) + 55}
                          y={pt.y - 28}
                          textAnchor="middle"
                          className="fill-foreground text-[10px] font-black"
                        >
                          ₱{pt.val.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                        </text>
                        <text
                          x={Math.max(10, Math.min(pt.x - 55, 690)) + 55}
                          y={pt.y - 15}
                          textAnchor="middle"
                          className="fill-default-400 text-[8.5px] font-medium"
                        >
                          {chartData.labels[idx]}
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

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
                    className="w-full bg-default-100 dark:bg-content2/80 border border-divider/40 text-foreground text-xs rounded-full pl-9 pr-3.5 py-2 outline-none focus:border-primary/50 transition-colors font-sans"
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

            {/* Multi-Sort Active Badge Bar */}
            <MultiSortBadgeBar
              sortDescriptors={salesSortDescriptors}
              onRemoveSort={removeSalesSort}
              onClearSort={clearSalesSort}
              columnLabels={{
                saleNumber: 'Invoice #',
                customerName: 'Customer',
                cashierName: 'Cashier',
                paymentMethod: 'Payment Method',
                grandTotal: 'Grand Total',
              }}
              className="mb-3"
            />

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
                          ₱{(sale.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                <h3 className="text-sm font-extrabold text-foreground">Tile Categories</h3>
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

            <div className="space-y-3.5">
              {categoryBreakdown.map((cat, idx) => {
                const percent = totalInventoryValuation > 0
                  ? Math.min(100, Math.round((cat.value / totalInventoryValuation) * 100))
                  : 20;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{cat.name}</span>
                      <span className="text-default-400 font-semibold">{cat.totalQty} Units</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-default-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0
                            ? 'bg-primary'
                            : idx === 1
                            ? 'bg-sky-500'
                            : idx === 2
                            ? 'bg-emerald-500'
                            : idx === 3
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-default-400">
                      <span>₱{cat.value.toLocaleString('en-PH')}</span>
                      <span>{percent}% Share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </HeroCard>

          {/* Logistics & Deliveries Pulse */}
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
                  className="p-2.5 rounded-xl bg-default-100/50 hover:bg-default-100 cursor-pointer transition-colors flex items-center justify-between"
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
              <h3 className="text-base font-extrabold text-foreground">
                Invoice Breakdown: {selectedSale?.saleNumber || ''}
              </h3>
              <p className="text-xs text-default-400">Transaction details and receipt breakdown</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="p-1 rounded-full text-default-400 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
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
                    <thead className="bg-default-100/60 text-default-500 font-semibold text-[10px] uppercase">
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
                            <td className="py-2 px-3 text-right">₱{(item.unitPrice || 0).toLocaleString('en-PH')}</td>
                            <td className="py-2 px-3 text-right font-bold text-foreground">
                              ₱{(item.total || 0).toLocaleString('en-PH')}
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
                  <span>₱{(selectedSale.subtotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-default-500">
                  <span>12% Output VAT:</span>
                  <span>₱{(selectedSale.vat || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount:</span>
                    <span>-₱{(selectedSale.discount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-foreground pt-1.5 border-t border-divider/20">
                  <span>Grand Total:</span>
                  <span className="text-primary font-black">
                    ₱{(selectedSale.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <input
              type="text"
              value={stockSearchQuery}
              onChange={(e) => setStockSearchQuery(e.target.value)}
              placeholder="Search by product code, name, size, or brand..."
              className="w-full bg-content2 dark:bg-content1/70 border border-divider/30 text-foreground text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-primary/50"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto divide-y divide-divider/10 border border-divider/20 rounded-xl">
            {filteredStockProducts.map((prod) => (
              <div key={prod.id} className="p-3 hover:bg-default-100/50 flex items-center justify-between text-xs">
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
                    ₱{(prod.sellingPrice || 0).toLocaleString('en-PH')}
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
              <label className="text-default-500 font-bold block mb-1">Room Length (Meters)</label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={calcLength}
                onChange={(e) => setCalcLength(Number(e.target.value))}
                className="w-full bg-content2 dark:bg-content1/70 border border-divider/30 rounded-xl px-3 py-2 text-foreground font-bold"
              />
            </div>
            <div>
              <label className="text-default-500 font-bold block mb-1">Room Width (Meters)</label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                value={calcWidth}
                onChange={(e) => setCalcWidth(Number(e.target.value))}
                className="w-full bg-content2 dark:bg-content1/70 border border-divider/30 rounded-xl px-3 py-2 text-foreground font-bold"
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
