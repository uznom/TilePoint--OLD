/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProductTrendsModule — Admin / Manager analytics view for product sales trends.
 * Shows top-selling products for a given month or year with revenue trend charts,
 * category distribution (interactive SVG pie/donut), year-over-year comparisons
 * including previous year's top products, customer traffic timelines (hourly/weekly/daily
 * with Year vs Previous Year comparison), and slow-mover identification.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Trophy,
  BarChart3,
  Package,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  PieChart as PieChartIcon,
  Clock,
  Activity,
  History,
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { HeroTable } from './common/ui/HeroTable';
import { HeroButton } from './common/ui/HeroButton';
import { HeroSelect } from './common/ui/HeroSelect';
import { formatCurrency } from '../utils/formatters';
import { Product, SaleItem } from '../types/db';

// ────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────

interface ProductTrendsModuleProps {
  darkMode?: boolean;
}

type PeriodMode = 'monthly' | 'yearly';
type TableViewMode = 'currentTop' | 'prevYearTop' | 'yoyComparison' | 'slowMovers';
type TrafficTimelineMode = 'hourly' | 'dayOfWeek' | 'daily';

interface ProductStat {
  product: Product;
  unitsSold: number;
  revenue: number;
  transactions: number;
  avgUnitPrice: number;
  category: string;
  brand: string;
}

interface MonthlyBucket {
  key: string; // "2026-01", "2026-02", etc.
  year: number;
  month: number;
  label: string;
  revenue: number;
  unitsSold: number;
  transactions: number;
}

interface CategoryStat {
  category: string;
  revenue: number;
  unitsSold: number;
  percentage: number;
  color: string;
  // SVG Arc coordinates
  startAngle: number;
  endAngle: number;
}

interface TrafficBucket {
  key: string;
  label: string;
  subLabel?: string;
  transactions: number;      // Selected Year
  revenue: number;           // Selected Year
  prevTransactions: number;  // Previous Year
  prevRevenue: number;       // Previous Year
  avgTicket: number;
}

// ────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS = [
  '#006FEE', '#17C964', '#F5A524', '#F31260', '#7828C8',
  '#0072F5', '#9353D3', '#F54180', '#24B47E', '#FF6B2C',
  '#3B82F6', '#EC4899', '#14B8A6', '#EAB308', '#8B5CF6',
];

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

// SVG arc path generator
function describeArc(
  x: number,
  y: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    endAngle = startAngle + 2 * Math.PI - 0.001;
  }

  const startX = x + radius * Math.cos(startAngle);
  const startY = y + radius * Math.sin(startAngle);
  const endX = x + radius * Math.cos(endAngle);
  const endY = y + radius * Math.sin(endAngle);

  const innerStartX = x + innerRadius * Math.cos(endAngle);
  const innerStartY = y + innerRadius * Math.sin(endAngle);
  const innerEndX = x + innerRadius * Math.cos(startAngle);
  const innerEndY = y + innerRadius * Math.sin(startAngle);

  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${x} ${y}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ');
  }

  return [
    `M ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
    `L ${innerStartX} ${innerStartY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEndX} ${innerEndY}`,
    'Z',
  ].join(' ');
}

// ────────────────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────────────────

export const ProductTrendsModule: React.FC<ProductTrendsModuleProps> = ({ darkMode: _darkMode }) => {
  const { products, sales, saleItems } = useDb();

  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [compareYear, setCompareYear] = useState<number | null>(now.getFullYear() - 1);
  const [topN, setTopN] = useState(20);
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('currentTop');
  const [trafficTimeline, setTrafficTimeline] = useState<TrafficTimelineMode>('hourly');
  const [pieMode, setPieMode] = useState<'donut' | 'pie'>('donut');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredTrajectoryIndex, setHoveredTrajectoryIndex] = useState<number | null>(null);
  const [hoveredTrafficIndex, setHoveredTrafficIndex] = useState<number | null>(null);

  // Automatically synchronize compareYear when selectedYear changes, defaulting to selectedYear - 1
  useEffect(() => {
    setCompareYear(selectedYear - 1);
  }, [selectedYear]);

  // Available years from sales data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(now.getFullYear());
    yearsSet.add(now.getFullYear() - 1);
    sales.forEach((s) => {
      if (s.isDeleted) return;
      const raw = s.createdAt || (s as any).created_at || (s as any).date;
      const d = parseDate(raw);
      if (d.getFullYear() > 2000) yearsSet.add(d.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [sales]);

  // Available comparison years strictly earlier than selectedYear
  const availableCompareYears = useMemo(() => {
    const past = availableYears.filter((yr) => yr < selectedYear);
    if (!past.includes(selectedYear - 1)) {
      past.push(selectedYear - 1);
      past.sort((a, b) => b - a);
    }
    return past;
  }, [availableYears, selectedYear]);

  // ── Build a map of valid sale IDs → sale records & dates ────────────
  const validSaleMap = useMemo(() => {
    const m = new Map<string, { date: Date; grandTotal: number }>();
    sales.forEach((s) => {
      if (!s.isDeleted && !(s as any).isVoided) {
        const rawDate = s.createdAt || (s as any).created_at || (s as any).date;
        const d = parseDate(rawDate);
        const total = Number(s.grandTotal || (s as any).subtotal || 0);
        const info = { date: d, grandTotal: total };
        if (s.id) m.set(String(s.id), info);
        if (s.saleNumber) m.set(String(s.saleNumber), info);
        if ((s as any).invoice_number) m.set(String((s as any).invoice_number), info);
      }
    });
    return m;
  }, [sales]);

  // Helper to extract exact sale date from item
  const getItemDate = useCallback((item: SaleItem): Date | null => {
    const sId = String(item.saleId || (item as any).sale_id || '');
    const saleInfo = validSaleMap.get(sId);
    if (saleInfo) return saleInfo.date;
    if ((item as any).createdAt || (item as any).created_at) {
      return parseDate((item as any).createdAt || (item as any).created_at);
    }
    return null;
  }, [validSaleMap]);

  // ── Filter sale items by the selected period ────────────────────────
  const filteredSaleItems = useMemo(() => {
    return saleItems.filter((item) => {
      if ((item as any).isDeleted) return false;
      const d = getItemDate(item);
      if (!d) return false;
      if (periodMode === 'monthly') {
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }
      return d.getFullYear() === selectedYear;
    });
  }, [saleItems, getItemDate, periodMode, selectedYear, selectedMonth]);

  // ── Previous period items (for MoM / previous cycle comparison) ─────
  const previousPeriodItems = useMemo(() => {
    return saleItems.filter((item) => {
      if ((item as any).isDeleted) return false;
      const d = getItemDate(item);
      if (!d) return false;
      if (periodMode === 'monthly') {
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
      }
      return d.getFullYear() === selectedYear - 1;
    });
  }, [saleItems, getItemDate, periodMode, selectedYear, selectedMonth]);

  // ── Same month in PREVIOUS YEAR items ───────────────────────────────
  const previousYearSamePeriodItems = useMemo(() => {
    return saleItems.filter((item) => {
      if ((item as any).isDeleted) return false;
      const d = getItemDate(item);
      if (!d) return false;
      const targetYear = selectedYear - 1;
      if (periodMode === 'monthly') {
        return d.getFullYear() === targetYear && d.getMonth() === selectedMonth;
      }
      return d.getFullYear() === targetYear;
    });
  }, [saleItems, getItemDate, periodMode, selectedYear, selectedMonth]);

  // ── Aggregate product stats ─────────────────────────────────────────
  const computeStats = useCallback(
    (items: SaleItem[]): ProductStat[] => {
      const statsMap: Record<string, { qty: number; revenue: number; transactions: number }> = {};
      items.forEach((item) => {
        const pId = String(item.productId || (item as any).product_id || item.productName || '');
        if (!pId) return;
        if (!statsMap[pId]) statsMap[pId] = { qty: 0, revenue: 0, transactions: 0 };
        statsMap[pId].qty += Number(item.quantity || 0);
        statsMap[pId].revenue += Number(item.total || (Number(item.quantity || 0) * Number(item.unitPrice || 0)));
        statsMap[pId].transactions += 1;
      });

      const nonDeleted = products.filter((p) => !p.isDeleted);
      return nonDeleted.map((p) => {
        const stat = statsMap[p.id] || statsMap[p.productName] || statsMap[p.productCode] || { qty: 0, revenue: 0, transactions: 0 };
        return {
          product: p,
          unitsSold: stat.qty,
          revenue: stat.revenue,
          transactions: stat.transactions,
          avgUnitPrice: stat.qty > 0 ? stat.revenue / stat.qty : p.sellingPrice || 0,
          category: p.category || 'General',
          brand: p.brand || 'Generic',
        };
      });
    },
    [products]
  );

  const currentStats = useMemo(() => computeStats(filteredSaleItems), [computeStats, filteredSaleItems]);
  const previousStats = useMemo(() => computeStats(previousPeriodItems), [computeStats, previousPeriodItems]);
  const previousYearStats = useMemo(() => computeStats(previousYearSamePeriodItems), [computeStats, previousYearSamePeriodItems]);

  // ── Top sellers & slow movers ───────────────────────────────────────
  const currentTopSellers = useMemo(() => {
    return [...currentStats]
      .filter((s) => s.unitsSold > 0 || s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
      .slice(0, topN);
  }, [currentStats, topN]);

  const prevYearTopSellers = useMemo(() => {
    return [...previousYearStats]
      .filter((s) => s.unitsSold > 0 || s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
      .slice(0, topN);
  }, [previousYearStats, topN]);

  const yoyComparisonList = useMemo(() => {
    const productMap = new Map<string, { current: ProductStat; prevYear: ProductStat }>();
    currentStats.forEach((cs) => {
      const prev = previousYearStats.find((ps) => ps.product.id === cs.product.id) || {
        product: cs.product,
        unitsSold: 0,
        revenue: 0,
        transactions: 0,
        avgUnitPrice: cs.avgUnitPrice,
        category: cs.category,
        brand: cs.brand,
      };
      if (cs.unitsSold > 0 || prev.unitsSold > 0) {
        productMap.set(cs.product.id, { current: cs, prevYear: prev });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => (b.current.revenue + b.prevYear.revenue) - (a.current.revenue + a.prevYear.revenue))
      .slice(0, topN);
  }, [currentStats, previousYearStats, topN]);

  const slowMovers = useMemo(() => {
    return [...currentStats]
      .filter((s) => s.product.stockQuantity > 0)
      .sort((a, b) => {
        if (a.unitsSold !== b.unitsSold) return a.unitsSold - b.unitsSold;
        const valB = b.product.stockQuantity * (b.product.costPrice || b.product.sellingPrice || 0);
        const valA = a.product.stockQuantity * (a.product.costPrice || a.product.sellingPrice || 0);
        return valB - valA;
      })
      .slice(0, topN);
  }, [currentStats, topN]);

  // ── Summary KPIs ────────────────────────────────────────────────────
  const summaryKPIs = useMemo(() => {
    const itemsRevenue = currentStats.reduce((sum, s) => sum + s.revenue, 0);
    const totalUnits = currentStats.reduce((sum, s) => sum + s.unitsSold, 0);
    const totalTxns = currentStats.reduce((sum, s) => sum + s.transactions, 0);

    let salesTableRevenue = 0;
    sales.forEach((s) => {
      if (s.isDeleted || (s as any).isVoided) return;
      const raw = s.createdAt || (s as any).created_at || (s as any).date;
      const d = parseDate(raw);
      if (periodMode === 'monthly') {
        if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
          salesTableRevenue += Number(s.grandTotal || (s as any).subtotal || 0);
        }
      } else {
        if (d.getFullYear() === selectedYear) {
          salesTableRevenue += Number(s.grandTotal || (s as any).subtotal || 0);
        }
      }
    });

    const totalRevenue = Math.max(itemsRevenue, salesTableRevenue);
    const avgTicket = totalTxns > 0 ? totalRevenue / totalTxns : 0;

    const prevYearRevenue = previousYearStats.reduce((sum, s) => sum + s.revenue, 0);
    const prevYearUnits = previousYearStats.reduce((sum, s) => sum + s.unitsSold, 0);

    const prevRevenue = previousStats.reduce((sum, s) => sum + s.revenue, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const yoyChange = prevYearRevenue > 0 ? ((totalRevenue - prevYearRevenue) / prevYearRevenue) * 100 : 0;

    const uniqueProducts = currentStats.filter((s) => s.unitsSold > 0).length;

    return {
      totalRevenue, totalUnits, totalTxns, avgTicket, uniqueProducts,
      revenueChange, yoyChange, prevYearRevenue, prevYearUnits,
    };
  }, [currentStats, previousStats, previousYearStats, sales, periodMode, selectedYear, selectedMonth]);

  // ── Monthly 12-Month Rolling Revenue Trajectory Chart ───────────────
  const monthlyBuckets = useMemo((): MonthlyBucket[] => {
    const buckets: MonthlyBucket[] = [];
    const baseMonth = periodMode === 'monthly' ? selectedMonth : 11;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(selectedYear, baseMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key,
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_ABBR[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`,
        revenue: 0,
        unitsSold: 0,
        transactions: 0,
      });
    }

    // 1. Primary: Aggregate revenue & transactions from sales table directly
    sales.forEach((s) => {
      if (s.isDeleted || (s as any).isVoided) return;
      const raw = s.createdAt || (s as any).created_at || (s as any).date;
      if (!raw) return;
      const d = parseDate(raw);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        bucket.transactions += 1;
        bucket.revenue += Number(s.grandTotal || (s as any).subtotal || 0);
      }
    });

    // 2. Units sold from sale items (and add revenue if sales table was empty)
    let itemRevenueMap: Record<string, number> = {};
    saleItems.forEach((item) => {
      if ((item as any).isDeleted) return;
      const d = getItemDate(item);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        bucket.unitsSold += Number(item.quantity || 0);
        itemRevenueMap[key] = (itemRevenueMap[key] || 0) + Number(item.total || (Number(item.quantity || 0) * Number(item.unitPrice || 0)));
      }
    });

    buckets.forEach((b) => {
      if (b.revenue === 0 && (itemRevenueMap[b.key] || 0) > 0) {
        b.revenue = itemRevenueMap[b.key];
      }
    });

    return buckets;
  }, [sales, saleItems, getItemDate, selectedYear, selectedMonth, periodMode]);

  const maxTrajectoryRevenue = Math.max(...monthlyBuckets.map((b) => b.revenue), 1000);

  // ── Category Breakdown with SVG Arc Calculation ─────────────────────
  const categoryStats = useMemo((): CategoryStat[] => {
    const catMap: Record<string, { revenue: number; unitsSold: number }> = {};
    currentStats.forEach((s) => {
      if (s.unitsSold === 0 && s.revenue === 0) return;
      const cat = s.category || 'General';
      if (!catMap[cat]) catMap[cat] = { revenue: 0, unitsSold: 0 };
      catMap[cat].revenue += s.revenue;
      catMap[cat].unitsSold += s.unitsSold;
    });

    const totalRevenue = Object.values(catMap).reduce((sum, v) => sum + v.revenue, 0);
    const sorted = Object.entries(catMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([category, data], idx) => ({
        category,
        revenue: data.revenue,
        unitsSold: data.unitsSold,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        startAngle: 0,
        endAngle: 0,
      }));

    let cumulativeAngle = -Math.PI / 2; // Start from top
    sorted.forEach((stat) => {
      const sliceAngle = (stat.percentage / 100) * 2 * Math.PI;
      stat.startAngle = cumulativeAngle;
      stat.endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle += sliceAngle;
    });

    return sorted;
  }, [currentStats]);

  const totalCategoryRevenue = useMemo(() => {
    return categoryStats.reduce((sum, c) => sum + c.revenue, 0);
  }, [categoryStats]);

  // ── Customer Traffic Breakdown (Current Year vs Previous Year) ───────
  const selectedPeriodSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.isDeleted || (s as any).isVoided) return false;
      const raw = s.createdAt || (s as any).created_at || (s as any).date;
      if (!raw) return false;
      const d = parseDate(raw);
      if (periodMode === 'monthly') {
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }
      return d.getFullYear() === selectedYear;
    });
  }, [sales, periodMode, selectedYear, selectedMonth]);

  const comparePeriodSales = useMemo(() => {
    if (compareYear === null) return [];
    return sales.filter((s) => {
      if (s.isDeleted || (s as any).isVoided) return false;
      const raw = s.createdAt || (s as any).created_at || (s as any).date;
      if (!raw) return false;
      const d = parseDate(raw);
      if (periodMode === 'monthly') {
        return d.getFullYear() === compareYear && d.getMonth() === selectedMonth;
      }
      return d.getFullYear() === compareYear;
    });
  }, [sales, periodMode, compareYear, selectedMonth]);

  const hasCompareTransactions = compareYear !== null && comparePeriodSales.length > 0;

  const trafficBuckets = useMemo((): TrafficBucket[] => {
    if (trafficTimeline === 'hourly') {
      const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
      return hours.map((hr) => {
        const label = hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
        const matched = selectedPeriodSales.filter((s) => {
          const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
          return d.getHours() === hr;
        });
        const prevMatched = hasCompareTransactions
          ? comparePeriodSales.filter((s) => {
              const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
              return d.getHours() === hr;
            })
          : [];

        const rev = matched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);
        const prevRev = prevMatched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);

        return {
          key: `hr-${hr}`,
          label,
          subLabel: `${hr}:00 - ${hr}:59`,
          transactions: matched.length,
          revenue: rev,
          prevTransactions: prevMatched.length,
          prevRevenue: prevRev,
          avgTicket: matched.length > 0 ? rev / matched.length : 0,
        };
      });
    }

    if (trafficTimeline === 'dayOfWeek') {
      return [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
        const label = DAY_ABBR[dayIdx];
        const matched = selectedPeriodSales.filter((s) => {
          const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
          return d.getDay() === dayIdx;
        });
        const prevMatched = hasCompareTransactions
          ? comparePeriodSales.filter((s) => {
              const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
              return d.getDay() === dayIdx;
            })
          : [];

        const rev = matched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);
        const prevRev = prevMatched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);

        return {
          key: `day-${dayIdx}`,
          label,
          subLabel: DAY_NAMES[dayIdx],
          transactions: matched.length,
          revenue: rev,
          prevTransactions: prevMatched.length,
          prevRevenue: prevRev,
          avgTicket: matched.length > 0 ? rev / matched.length : 0,
        };
      });
    }

    // Daily calendar days
    if (periodMode === 'monthly') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const list: TrafficBucket[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const matched = selectedPeriodSales.filter((s) => {
          const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
          return d.getDate() === day;
        });
        const prevMatched = hasCompareTransactions
          ? comparePeriodSales.filter((s) => {
              const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
              return d.getDate() === day;
            })
          : [];

        const rev = matched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);
        const prevRev = prevMatched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);

        list.push({
          key: `day-${day}`,
          label: `${day}`,
          subLabel: `${MONTH_ABBR[selectedMonth]} ${day}`,
          transactions: matched.length,
          revenue: rev,
          prevTransactions: prevMatched.length,
          prevRevenue: prevRev,
          avgTicket: matched.length > 0 ? rev / matched.length : 0,
        });
      }
      return list;
    } else {
      return MONTH_ABBR.map((abbr, mIdx) => {
        const matched = selectedPeriodSales.filter((s) => {
          const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
          return d.getMonth() === mIdx;
        });
        const prevMatched = hasCompareTransactions
          ? comparePeriodSales.filter((s) => {
              const d = parseDate(s.createdAt || (s as any).created_at || (s as any).date);
              return d.getMonth() === mIdx;
            })
          : [];

        const rev = matched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);
        const prevRev = prevMatched.reduce((sum, s) => sum + Number(s.grandTotal || (s as any).subtotal || 0), 0);

        return {
          key: `month-${mIdx}`,
          label: abbr,
          subLabel: MONTH_NAMES[mIdx],
          transactions: matched.length,
          revenue: rev,
          prevTransactions: prevMatched.length,
          prevRevenue: prevRev,
          avgTicket: matched.length > 0 ? rev / matched.length : 0,
        };
      });
    }
  }, [trafficTimeline, selectedPeriodSales, comparePeriodSales, hasCompareTransactions, periodMode, selectedYear, selectedMonth]);

  const maxTrafficCount = Math.max(
    ...trafficBuckets.map((b) => (hasCompareTransactions ? Math.max(b.transactions, b.prevTransactions) : b.transactions)),
    1
  );

  const busiestTrafficBucket = useMemo(() => {
    return [...trafficBuckets].sort((a, b) => b.transactions - a.transactions)[0] || null;
  }, [trafficBuckets]);

  const totalTrafficCurrent = selectedPeriodSales.length;
  const totalTrafficCompare = comparePeriodSales.length;
  const trafficYoYGrowth = hasCompareTransactions && totalTrafficCompare > 0
    ? ((totalTrafficCurrent - totalTrafficCompare) / totalTrafficCompare) * 100
    : 0;

  // Labels
  const periodLabel = periodMode === 'monthly'
    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    : `Year ${selectedYear}`;

  const previousPeriodLabel = periodMode === 'monthly'
    ? `${MONTH_NAMES[selectedMonth === 0 ? 11 : selectedMonth - 1]} ${selectedMonth === 0 ? selectedYear - 1 : selectedYear}`
    : `Year ${selectedYear - 1}`;

  const prevYearPeriodLabel = periodMode === 'monthly'
    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear - 1}`
    : `Year ${selectedYear - 1}`;

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    let dataRows: string[] = [];
    if (tableViewMode === 'slowMovers') {
      dataRows = [
        ['Rank', 'Code', 'Name', 'Category', 'Stock Available', 'Held Capital Value (PHP)', 'Period Sales'].join(','),
        ...slowMovers.map((s, idx) => [
          idx + 1,
          s.product.productCode,
          `"${s.product.productName}"`,
          `"${s.category}"`,
          s.product.stockQuantity,
          (s.product.stockQuantity * (s.product.costPrice || s.product.sellingPrice)).toFixed(2),
          s.unitsSold,
        ].join(',')),
      ];
    } else if (tableViewMode === 'prevYearTop') {
      dataRows = [
        ['Rank Last Year', 'Code', 'Name', 'Category', `Units Sold (${prevYearPeriodLabel})`, `Revenue (${prevYearPeriodLabel})`, `Units Sold This Year (${periodLabel})`].join(','),
        ...prevYearTopSellers.map((s, idx) => {
          const curr = currentStats.find((cs) => cs.product.id === s.product.id);
          return [
            idx + 1,
            s.product.productCode,
            `"${s.product.productName}"`,
            `"${s.category}"`,
            s.unitsSold,
            s.revenue.toFixed(2),
            curr?.unitsSold || 0,
          ].join(',');
        }),
      ];
    } else {
      dataRows = [
        ['Rank', 'Product Code', 'Product Name', 'Category', 'Brand', 'Units Sold', 'Revenue', 'Avg Price', 'Transactions'].join(','),
        ...currentTopSellers.map((s, idx) => [
          idx + 1,
          s.product.productCode,
          `"${s.product.productName}"`,
          `"${s.category}"`,
          `"${s.brand}"`,
          s.unitsSold,
          s.revenue.toFixed(2),
          s.avgUnitPrice.toFixed(2),
          s.transactions,
        ].join(',')),
      ];
    }

    const csvContent = '\uFEFF' + dataRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-trends-${tableViewMode}-${periodLabel.replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [tableViewMode, slowMovers, prevYearTopSellers, currentTopSellers, currentStats, prevYearPeriodLabel, periodLabel]);

  // ── Change indicator badge ──────────────────────────────────────────
  const ChangeIndicator: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '%' }) => {
    if (value === 0 || !isFinite(value)) {
      return (
        <span className="flex items-center gap-0.5 text-default-400 text-[11px] font-semibold">
          <Minus className="h-3 w-3" /> 0{suffix}
        </span>
      );
    }
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-0.5 text-[11px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
      </span>
    );
  };

  // ────────────────────────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in text-foreground font-sans pb-12">
      {/* ── HEADER WITH DEDICATED ACTION BUTTON ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Product Trend Analytics & Velocity
          </h1>
          <p className="text-xs text-default-500 mt-0.5 font-medium">
            Analyze bestseller velocity, category shares, customer rush hours, and historical year-over-year trends
          </p>
        </div>

        {/* Clean Export CSV button placement with aligned icon */}
        <div className="flex items-center gap-2 shrink-0">
          <HeroButton
            variant="solid"
            color="primary"
            size="sm"
            radius="full"
            onClick={handleExportCSV}
            startContent={<Download className="h-3.5 w-3.5 shrink-0" />}
            className="text-xs font-bold px-4 shadow-sm inline-flex items-center justify-center"
          >
            Export CSV
          </HeroButton>
        </div>
      </div>

      {/* ── HEROUI V3 PERIOD FILTER TOOLBAR ─────────────────────────── */}
      <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-3.5 shadow-elevation-soft">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Monthly / Yearly Mode Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-2xs shrink-0">
            {(['monthly', 'yearly'] as PeriodMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPeriodMode(mode)}
                className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer active:scale-95 ${
                  periodMode === mode
                    ? 'bg-white dark:bg-zinc-700 text-foreground shadow-xs'
                    : 'text-default-500 hover:text-foreground'
                }`}
              >
                {mode === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>

          {/* HeroUI v3 Year Select with dedicated fixed container */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-default-500 whitespace-nowrap">Year:</span>
            <div className="w-28 shrink-0">
              <HeroSelect
                size="sm"
                radius="full"
                variant="bordered"
                fullWidth
                className="text-xs font-bold"
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                items={availableYears.map((yr) => ({
                  key: String(yr),
                  label: String(yr),
                  value: String(yr),
                }))}
              />
            </div>
          </div>

          {/* HeroUI v3 Month Select (only in monthly mode) */}
          {periodMode === 'monthly' && (
            <div className="flex items-center gap-2 shrink-0 ml-2 sm:ml-3">
              <span className="text-xs font-bold text-default-500 whitespace-nowrap">Month:</span>
              <div className="w-36 shrink-0">
                <HeroSelect
                  size="sm"
                  radius="full"
                  variant="bordered"
                  fullWidth
                  className="text-xs font-bold"
                  value={String(selectedMonth)}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  items={MONTH_NAMES.map((name, idx) => ({
                    key: String(idx),
                    label: name,
                    value: String(idx),
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Target and Benchmark Period Context Badges */}
        <div className="flex items-center gap-2 text-xs flex-wrap shrink-0">
          <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold whitespace-nowrap">
            Target: {periodLabel}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-bold whitespace-nowrap">
            Benchmark: {prevYearPeriodLabel}
          </span>
        </div>
      </div>

      {/* ── KPI SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Total Revenue',
            value: formatCurrency(summaryKPIs.totalRevenue),
            change: summaryKPIs.revenueChange,
            sub: `vs ${previousPeriodLabel}`,
            icon: DollarSign,
            iconBg: 'bg-emerald-500/10 text-emerald-500',
          },
          {
            label: 'YoY Growth',
            value: `${summaryKPIs.yoyChange >= 0 ? '+' : ''}${summaryKPIs.yoyChange.toFixed(1)}%`,
            change: summaryKPIs.yoyChange,
            sub: `vs ${prevYearPeriodLabel}`,
            icon: History,
            iconBg: 'bg-primary/10 text-primary',
          },
          {
            label: 'Units Sold',
            value: summaryKPIs.totalUnits.toLocaleString(),
            change: 0,
            hideChange: true,
            sub: `${summaryKPIs.uniqueProducts} catalog items active`,
            icon: ShoppingCart,
            iconBg: 'bg-sky-500/10 text-sky-500',
          },
          {
            label: 'Avg Ticket Size',
            value: formatCurrency(summaryKPIs.avgTicket),
            change: 0,
            hideChange: true,
            sub: `across ${summaryKPIs.totalTxns} checkouts`,
            icon: TrendingUp,
            iconBg: 'bg-amber-500/10 text-amber-500',
          },
          {
            label: 'Prev Year Revenue',
            value: formatCurrency(summaryKPIs.prevYearRevenue),
            change: 0,
            hideChange: true,
            sub: `Same period in ${selectedYear - 1}`,
            icon: Trophy,
            iconBg: 'bg-purple-500/10 text-purple-500',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-4 shadow-elevation-soft space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-default-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-1.5 rounded-xl ${kpi.iconBg}`}>
                <kpi.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight tabular-nums">{kpi.value}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-default-400">
              {!kpi.hideChange && <ChangeIndicator value={kpi.change} />}
              <span className="truncate">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 1: 12-MONTH ROLLING REVENUE TRAJECTORY CHART + INTERACTIVE CATEGORY SVG PIE/DONUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 12-Month Rolling Revenue Trajectory Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-5 shadow-elevation-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                Revenue Trajectory (12-Month Rolling Curve)
              </h3>
              <p className="text-[10px] text-default-400 mt-0.5">
                Financial revenue momentum across the past 12 consecutive months
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Peak: {formatCurrency(maxTrajectoryRevenue)}
              </span>
            </div>
          </div>

          {/* SVG & Bar Chart Hybrid */}
          <div className="relative pt-4 pb-2">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-25">
              <div className="border-b border-dashed border-divider flex items-center justify-between text-[9px] text-default-400 pr-1">
                <span>{formatCurrency(maxTrajectoryRevenue)}</span>
              </div>
              <div className="border-b border-dashed border-divider flex items-center justify-between text-[9px] text-default-400 pr-1">
                <span>{formatCurrency(maxTrajectoryRevenue * 0.5)}</span>
              </div>
              <div className="border-b border-divider flex items-center justify-between text-[9px] text-default-400 pr-1">
                <span>₱0</span>
              </div>
            </div>

            {/* Bars & Interactive Columns */}
            <div className="flex items-end gap-1 sm:gap-2 h-48 sm:h-56 relative z-10 pt-6">
              {monthlyBuckets.map((bucket, idx) => {
                const heightPct = maxTrajectoryRevenue > 0 ? (bucket.revenue / maxTrajectoryRevenue) * 100 : 0;
                const isSelectedPeriod =
                  periodMode === 'monthly'
                    ? bucket.year === selectedYear && bucket.month === selectedMonth
                    : bucket.year === selectedYear;
                const isHovered = hoveredTrajectoryIndex === idx;

                return (
                  <div
                    key={bucket.key}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    onMouseEnter={() => setHoveredTrajectoryIndex(idx)}
                    onMouseLeave={() => setHoveredTrajectoryIndex(null)}
                  >
                    {/* Hover Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white text-[10px] font-bold p-2.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap text-center border border-white/10 animate-fade-in">
                        <div className="text-primary-300 font-extrabold">{bucket.label}</div>
                        <div className="text-xs text-emerald-400 font-mono mt-0.5">{formatCurrency(bucket.revenue)}</div>
                        <div className="text-[9px] text-zinc-400 font-normal">
                          {bucket.unitsSold.toLocaleString()} units • {bucket.transactions} orders
                        </div>
                      </div>
                    )}

                    {/* Bar Pillar */}
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                          isSelectedPeriod
                            ? 'bg-gradient-to-t from-primary to-sky-400 shadow-[0_4px_12px_rgba(0,111,238,0.4)]'
                            : isHovered
                            ? 'bg-primary/70'
                            : bucket.revenue > 0
                            ? 'bg-zinc-300 dark:bg-zinc-700'
                            : 'bg-zinc-200/50 dark:bg-zinc-800/40'
                        }`}
                        style={{
                          height: `${Math.max(heightPct, bucket.revenue > 0 ? 4 : 2)}%`,
                          minHeight: '4px',
                        }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span
                      className={`text-[9px] font-semibold mt-2 truncate w-full text-center transition-colors ${
                        isSelectedPeriod ? 'text-primary font-bold' : isHovered ? 'text-foreground' : 'text-default-400'
                      }`}
                    >
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Revenue Split — Real Interactive SVG Pie / Donut Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-5 shadow-elevation-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Category Revenue Split
            </h3>

            {/* Donut / Pie toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-full border border-zinc-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => setPieMode('donut')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                  pieMode === 'donut' ? 'bg-white dark:bg-zinc-700 text-foreground shadow-xs' : 'text-default-400'
                }`}
              >
                Donut
              </button>
              <button
                type="button"
                onClick={() => setPieMode('pie')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                  pieMode === 'pie' ? 'bg-white dark:bg-zinc-700 text-foreground shadow-xs' : 'text-default-400'
                }`}
              >
                Pie
              </button>
            </div>
          </div>

          {/* SVG Pie / Donut Canvas */}
          <div className="flex justify-center items-center py-2 relative">
            <svg viewBox="0 0 200 200" className="w-44 h-44 overflow-visible">
              {categoryStats.length === 0 ? (
                <circle cx="100" cy="100" r="75" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="25" />
              ) : (
                categoryStats.map((cs) => {
                  const isHovered = hoveredCategory === cs.category;
                  const outerR = isHovered ? 82 : 75;
                  const innerR = pieMode === 'donut' ? (isHovered ? 45 : 48) : 0;
                  const pathData = describeArc(100, 100, outerR, innerR, cs.startAngle, cs.endAngle);

                  return (
                    <path
                      key={cs.category}
                      d={pathData}
                      fill={cs.color}
                      className="transition-all duration-200 cursor-pointer active:scale-95"
                      opacity={hoveredCategory && !isHovered ? 0.45 : 1}
                      onMouseEnter={() => setHoveredCategory(cs.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <title>{`${cs.category}: ${formatCurrency(cs.revenue)} (${cs.percentage.toFixed(1)}%)`}</title>
                    </path>
                  );
                })
              )}
            </svg>

            {/* Center Dynamic Label for Donut */}
            {pieMode === 'donut' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center px-4 max-w-[120px]">
                  {hoveredCategory ? (
                    <>
                      <div className="text-[10px] font-bold text-primary truncate">{hoveredCategory}</div>
                      <div className="text-xs font-black text-foreground tabular-nums">
                        {categoryStats.find((c) => c.category === hoveredCategory)?.percentage.toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-default-500 font-mono">
                        {formatCurrency(categoryStats.find((c) => c.category === hoveredCategory)?.revenue || 0)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[9px] font-semibold text-default-400 uppercase tracking-wider">Total Sales</div>
                      <div className="text-xs font-black text-foreground tabular-nums mt-0.5">
                        {formatCurrency(totalCategoryRevenue)}
                      </div>
                      <div className="text-[9px] text-default-500 font-medium">
                        {categoryStats.length} Categories
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Legend List */}
          <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
            {categoryStats.slice(0, 6).map((cs) => {
              const isHovered = hoveredCategory === cs.category;
              return (
                <div
                  key={cs.category}
                  onMouseEnter={() => setHoveredCategory(cs.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between text-[11px] p-1 rounded-lg transition-colors cursor-pointer ${
                    isHovered ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cs.color }} />
                    <span className="truncate text-foreground font-medium">{cs.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-default-500 font-semibold tabular-nums">{cs.percentage.toFixed(1)}%</span>
                    <span className="text-foreground font-bold tabular-nums font-mono">{formatCurrency(cs.revenue)}</span>
                  </div>
                </div>
              );
            })}
            {categoryStats.length > 6 && (
              <div className="text-[10px] text-default-400 text-center font-medium pt-1">
                +{categoryStats.length - 6} more categories
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: CUSTOMER TRAFFIC & VELOCITY TIMELINES (DYNAMIC YEAR COMPARISON) ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-5 shadow-elevation-soft space-y-4 relative z-10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="h-4 w-4 text-primary" />
              Customer Footfall & Purchasing Velocity Timelines
            </h3>
            <p className="text-[10px] text-default-400 mt-0.5">
              {hasCompareTransactions
                ? `Comparing footfall traffic and rush hour shopping velocity between ${selectedYear} and ${compareYear}`
                : compareYear !== null
                ? `Footfall traffic and rush hour shopping velocity for ${selectedYear} (No comparison transactions recorded for ${compareYear})`
                : `Footfall traffic and rush hour shopping velocity for ${selectedYear}`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Year Legend Chips */}
            <div className="flex items-center gap-2 text-[10px] font-semibold shrink-0">
              <span className="flex items-center gap-1 text-primary whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                {selectedYear} (This Year)
              </span>
              {hasCompareTransactions ? (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  {compareYear} (Comparison)
                </span>
              ) : compareYear !== null ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold border border-amber-500/20 whitespace-nowrap">
                  No {compareYear} data
                </span>
              ) : null}
            </div>

            {/* Dynamic Comparison Year Selector with dedicated fixed container */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-default-500 whitespace-nowrap">Compare:</span>
              <div className="w-40 shrink-0">
                <HeroSelect
                  size="sm"
                  radius="full"
                  variant="bordered"
                  fullWidth
                  className="text-xs font-bold"
                  value={compareYear !== null ? String(compareYear) : 'none'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompareYear(val === 'none' ? null : Number(val));
                  }}
                  items={[
                    ...availableCompareYears.map((yr) => ({
                      key: String(yr),
                      label: yr === selectedYear - 1 ? `${yr} (Default)` : String(yr),
                      value: String(yr),
                    })),
                    { key: 'none', label: 'None (Solo)', value: 'none' },
                  ]}
                />
              </div>
            </div>

            {/* Timeline View Mode Selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-2xs shrink-0 ml-2">
              {[
                { id: 'hourly', label: 'Hourly Rush' },
                { id: 'dayOfWeek', label: 'Day of Week' },
                { id: 'daily', label: periodMode === 'monthly' ? 'Calendar Days' : 'Monthly Curve' },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setTrafficTimeline(view.id as TrafficTimelineMode)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all cursor-pointer active:scale-[0.97] ${
                    trafficTimeline === view.id
                      ? 'bg-white dark:bg-zinc-700 text-foreground shadow-xs'
                      : 'text-default-500 hover:text-foreground'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Traffic Highlight Metrics */}
        <div className={`grid gap-3 pt-1 ${hasCompareTransactions ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl">
            <div className="text-[10px] text-default-500 font-semibold uppercase">{selectedYear} Orders</div>
            <div className="text-base font-bold text-foreground font-mono mt-0.5">
              {totalTrafficCurrent.toLocaleString()} checkouts
            </div>
          </div>

          {hasCompareTransactions && (
            <>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl">
                <div className="text-[10px] text-default-500 font-semibold uppercase">{compareYear} Orders</div>
                <div className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                  {totalTrafficCompare.toLocaleString()} checkouts
                </div>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl">
                <div className="text-[10px] text-default-500 font-semibold uppercase">YoY Footfall Momentum</div>
                <div className="mt-0.5 flex items-center gap-1 text-base font-bold font-mono">
                  <ChangeIndicator value={trafficYoYGrowth} />
                </div>
              </div>
            </>
          )}

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl">
            <div className="text-[10px] text-default-500 font-semibold uppercase">Busiest Window</div>
            <div className="text-base font-bold text-primary font-mono mt-0.5 truncate">
              {busiestTrafficBucket?.label || 'N/A'} ({busiestTrafficBucket?.transactions || 0} orders)
            </div>
          </div>

          {!hasCompareTransactions && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl">
              <div className="text-[10px] text-default-500 font-semibold uppercase">Comparison Status</div>
              <div className="text-xs font-semibold text-default-400 font-sans mt-1">
                {compareYear !== null ? `No ${compareYear} data in period` : 'Comparison disabled'}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Pillar Histogram: Dual Pillars (When compare transactions exist) or Single Pillar (When none) */}
        <div className="pt-2">
          <div className="flex items-end gap-1 sm:gap-2.5 h-36 sm:h-44 pt-4">
            {trafficBuckets.map((bucket, idx) => {
              const currentHeightPct = maxTrafficCount > 0 ? (bucket.transactions / maxTrafficCount) * 100 : 0;
              const prevHeightPct = maxTrafficCount > 0 ? (bucket.prevTransactions / maxTrafficCount) * 100 : 0;
              const isHovered = hoveredTrafficIndex === idx;
              const diffGrowth = bucket.prevTransactions > 0
                ? ((bucket.transactions - bucket.prevTransactions) / bucket.prevTransactions) * 100
                : bucket.transactions > 0 ? 100 : 0;

              return (
                <div
                  key={bucket.key}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredTrafficIndex(idx)}
                  onMouseLeave={() => setHoveredTrafficIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white text-[10px] font-bold p-2.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap text-center border border-white/10 animate-fade-in">
                      <div className="text-primary-300 font-extrabold">{bucket.subLabel || bucket.label}</div>
                      {hasCompareTransactions ? (
                        <>
                          <div className="mt-1 flex items-center justify-center gap-2 font-mono">
                            <span className="text-emerald-400">{selectedYear}: {bucket.transactions} orders</span>
                            <span className="text-purple-400">{compareYear}: {bucket.prevTransactions} orders</span>
                          </div>
                          <div className="text-[9px] text-zinc-400 font-normal mt-0.5">
                            Revenue: {formatCurrency(bucket.revenue)} vs {formatCurrency(bucket.prevRevenue)}
                          </div>
                          <div className="text-[9px] font-bold mt-0.5">
                            <ChangeIndicator value={diffGrowth} /> YoY Traffic
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mt-1 font-mono text-emerald-400">
                            {selectedYear}: {bucket.transactions} orders
                          </div>
                          <div className="text-[9px] text-zinc-400 font-normal mt-0.5">
                            Revenue: {formatCurrency(bucket.revenue)} &bull; Avg: {formatCurrency(bucket.avgTicket)}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Dual or Single Pillars */}
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full">
                    {/* Current Year Pillar */}
                    <div
                      className={`rounded-t-sm transition-all duration-200 ${
                        hasCompareTransactions
                          ? 'w-full max-w-[14px] sm:max-w-[18px]'
                          : 'w-full max-w-[22px] sm:max-w-[28px]'
                      } ${
                        isHovered
                          ? 'bg-primary'
                          : bucket.transactions > 0
                          ? 'bg-primary/90'
                          : 'bg-zinc-200/40 dark:bg-zinc-800/40'
                      }`}
                      style={{
                        height: `${Math.max(currentHeightPct, bucket.transactions > 0 ? 6 : 2)}%`,
                        minHeight: '3px',
                      }}
                      title={`${selectedYear}: ${bucket.transactions} checkouts`}
                    />

                    {/* Comparison Year Pillar — Dynamically hidden if no comparison transactions exist */}
                    {hasCompareTransactions && (
                      <div
                        className={`w-full max-w-[14px] sm:max-w-[18px] rounded-t-sm transition-all duration-200 ${
                          isHovered
                            ? 'bg-purple-500'
                            : bucket.prevTransactions > 0
                            ? 'bg-purple-500/80 dark:bg-purple-400/70'
                            : 'bg-zinc-200/40 dark:bg-zinc-800/40'
                        }`}
                        style={{
                          height: `${Math.max(prevHeightPct, bucket.prevTransactions > 0 ? 6 : 2)}%`,
                          minHeight: '3px',
                        }}
                        title={`${compareYear}: ${bucket.prevTransactions} checkouts`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[9px] font-semibold mt-2 truncate w-full text-center ${
                      isHovered ? 'text-primary font-black' : 'text-default-400'
                    }`}
                  >
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: PRODUCT TABLES (CURRENT TOP SELLERS / PREV YEAR TOP SELLERS / YOY HEAD-TO-HEAD) ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl p-5 shadow-elevation-soft space-y-4">
        {/* Table View Mode Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-divider/20 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTableViewMode('currentTop')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                tableViewMode === 'currentTop'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-default-600 hover:text-foreground'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              Top Bestsellers ({periodLabel})
            </button>

            {/* PREVIOUS YEAR TOP PRODUCTS (Exact User Request) */}
            <button
              type="button"
              onClick={() => setTableViewMode('prevYearTop')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                tableViewMode === 'prevYearTop'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-default-600 hover:text-foreground'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Top Products in {prevYearPeriodLabel}
            </button>

            <button
              type="button"
              onClick={() => setTableViewMode('yoyComparison')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                tableViewMode === 'yoyComparison'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-default-600 hover:text-foreground'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              YoY Velocity Comparison
            </button>

            <button
              type="button"
              onClick={() => setTableViewMode('slowMovers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                tableViewMode === 'slowMovers'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-default-600 hover:text-foreground'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Dead Stock / Slow Movers
            </button>
          </div>

          {/* Top N filter */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-full border border-zinc-200/50 dark:border-white/5">
            {[10, 20, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTopN(n)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                  topN === n ? 'bg-white dark:bg-zinc-700 text-foreground shadow-xs' : 'text-default-400'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>

        {/* ── 1. CURRENT PERIOD TOP SELLERS TABLE ── */}
        {tableViewMode === 'currentTop' && (
          <div className="overflow-x-auto text-xs">
            <HeroTable isStriped className="min-w-full">
              <HeroTable.Header>
                <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">
                  <HeroTable.Column className="py-3 px-3 w-10">#</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Product</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Category</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Units Sold</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Revenue</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Avg Unit Price</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3 text-center">Share of Sales</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3 text-center">YoY Trend</HeroTable.Column>
                </tr>
              </HeroTable.Header>
              <HeroTable.Body>
                {currentTopSellers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-default-400 text-sm">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No product sales recorded for {periodLabel}
                    </td>
                  </tr>
                ) : (
                  currentTopSellers.map((s, idx) => {
                    const share = summaryKPIs.totalRevenue > 0 ? (s.revenue / summaryKPIs.totalRevenue) * 100 : 0;
                    const prevYearStat = previousYearStats.find((ps) => ps.product.id === s.product.id);
                    const yoyRevGrowth = prevYearStat && prevYearStat.revenue > 0
                      ? ((s.revenue - prevYearStat.revenue) / prevYearStat.revenue) * 100
                      : s.revenue > 0 ? 100 : 0;

                    return (
                      <tr key={s.product.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                        <td className="py-3 px-3 font-bold text-default-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-bold text-foreground text-[11px] truncate max-w-56" title={s.product.productName}>
                              {s.product.productName}
                            </div>
                            <div className="text-[10px] text-default-400 font-mono">{s.product.productCode}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-default-600 border border-zinc-200/50 dark:border-white/5">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[11px]">
                          {s.unitsSold.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-[11px]">
                          {formatCurrency(s.revenue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-default-500">
                          {formatCurrency(s.avgUnitPrice)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-default-500 tabular-nums w-8 text-right">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <ChangeIndicator value={yoyRevGrowth} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </HeroTable.Body>
            </HeroTable>
          </div>
        )}

        {/* ── 2. PREVIOUS YEAR TOP PRODUCTS (Same month/period last year) ── */}
        {tableViewMode === 'prevYearTop' && (
          <div className="space-y-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <History className="h-4 w-4" />
                Historical Benchmark: Top selling products recorded in {prevYearPeriodLabel}
              </span>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                Total Benchmark Revenue: {formatCurrency(summaryKPIs.prevYearRevenue)}
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <HeroTable isStriped className="min-w-full">
                <HeroTable.Header>
                  <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">
                    <HeroTable.Column className="py-3 px-3 w-10">Last Year Rank</HeroTable.Column>
                    <HeroTable.Column className="py-3 px-3">Product</HeroTable.Column>
                    <HeroTable.Column className="py-3 px-3">Category</HeroTable.Column>
                    <HeroTable.Column align="end" className="py-3 px-3 text-right">Units ({selectedYear - 1})</HeroTable.Column>
                    <HeroTable.Column align="end" className="py-3 px-3 text-right">Revenue ({selectedYear - 1})</HeroTable.Column>
                    <HeroTable.Column align="end" className="py-3 px-3 text-right">Units This Year ({selectedYear})</HeroTable.Column>
                    <HeroTable.Column align="end" className="py-3 px-3 text-right">Revenue This Year ({selectedYear})</HeroTable.Column>
                    <HeroTable.Column className="py-3 px-3 text-center">Current Status</HeroTable.Column>
                  </tr>
                </HeroTable.Header>
                <HeroTable.Body>
                  {prevYearTopSellers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-default-400 text-sm">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No historical product sales recorded for {prevYearPeriodLabel}
                      </td>
                    </tr>
                  ) : (
                    prevYearTopSellers.map((s, idx) => {
                      const curr = currentStats.find((cs) => cs.product.id === s.product.id);
                      const currUnits = curr?.unitsSold || 0;
                      const currRevenue = curr?.revenue || 0;
                      const growth = s.revenue > 0 ? ((currRevenue - s.revenue) / s.revenue) * 100 : 0;

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-default-500">
                          Inactive This Period
                        </span>
                      );
                      if (currUnits > s.unitsSold) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            🚀 Growing (+{growth.toFixed(0)}%)
                          </span>
                        );
                      } else if (currUnits > 0) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            📉 Retained ({growth.toFixed(0)}%)
                          </span>
                        );
                      }

                      return (
                        <tr key={s.product.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                          <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400 font-mono text-[11px] text-center">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div>
                              <div className="font-bold text-foreground text-[11px] truncate max-w-56" title={s.product.productName}>
                                {s.product.productName}
                              </div>
                              <div className="text-[10px] text-default-400 font-mono">{s.product.productCode}</div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-default-600 border border-zinc-200/50 dark:border-white/5">
                              {s.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400 text-[11px]">
                            {s.unitsSold.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-[11px]">
                            {formatCurrency(s.revenue)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[11px]">
                            {currUnits.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[11px]">
                            {formatCurrency(currRevenue)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </HeroTable.Body>
              </HeroTable>
            </div>
          </div>
        )}

        {/* ── 3. YOY VELOCITY HEAD-TO-HEAD COMPARISON ── */}
        {tableViewMode === 'yoyComparison' && (
          <div className="overflow-x-auto text-xs">
            <HeroTable isStriped className="min-w-full">
              <HeroTable.Header>
                <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">
                  <HeroTable.Column className="py-3 px-3 w-10">#</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Product</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Category</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Units {selectedYear - 1}</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Units {selectedYear}</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Revenue {selectedYear - 1}</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Revenue {selectedYear}</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3 text-center">YoY Revenue Trend</HeroTable.Column>
                </tr>
              </HeroTable.Header>
              <HeroTable.Body>
                {yoyComparisonList.map((item, idx) => {
                  const revDiff = item.prevYear.revenue > 0
                    ? ((item.current.revenue - item.prevYear.revenue) / item.prevYear.revenue) * 100
                    : item.current.revenue > 0 ? 100 : 0;

                  return (
                    <tr key={item.current.product.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                      <td className="py-3 px-3 font-bold text-default-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground text-[11px] truncate max-w-56">{item.current.product.productName}</div>
                        <div className="text-[10px] text-default-400 font-mono">{item.current.product.productCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-default-600">
                          {item.current.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-default-500">{item.prevYear.unitsSold.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">{item.current.unitsSold.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-default-500">{formatCurrency(item.prevYear.revenue)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">{formatCurrency(item.current.revenue)}</td>
                      <td className="py-3 px-3 text-center">
                        <ChangeIndicator value={revDiff} />
                      </td>
                    </tr>
                  );
                })}
              </HeroTable.Body>
            </HeroTable>
          </div>
        )}

        {/* ── 4. SLOW-MOVING & DEAD STOCK TABLE ── */}
        {tableViewMode === 'slowMovers' && (
          <div className="overflow-x-auto text-xs">
            <HeroTable isStriped className="min-w-full">
              <HeroTable.Header>
                <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">
                  <HeroTable.Column className="py-3 px-3 w-10">#</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Product</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3">Category</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Units Sold in Period</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Warehouse Stock</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Unit Cost</HeroTable.Column>
                  <HeroTable.Column align="end" className="py-3 px-3 text-right">Held Capital Value</HeroTable.Column>
                  <HeroTable.Column className="py-3 px-3 text-center">Stock Action</HeroTable.Column>
                </tr>
              </HeroTable.Header>
              <HeroTable.Body>
                {slowMovers.map((s, idx) => {
                  const heldCapital = s.product.stockQuantity * (s.product.costPrice || s.product.sellingPrice || 0);
                  return (
                    <tr key={s.product.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                      <td className="py-3 px-3 font-bold text-amber-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground text-[11px] truncate max-w-56">{s.product.productName}</div>
                        <div className="text-[10px] text-default-400 font-mono">{s.product.productCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-default-600">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-500 text-[11px]">
                        {s.unitsSold.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-[11px]">
                        {s.product.stockQuantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-default-500 text-[11px]">
                        {formatCurrency(s.product.costPrice || s.product.sellingPrice || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-500 text-[11px]">
                        {formatCurrency(heldCapital)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Bundle / Promo Candidate
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </HeroTable.Body>
            </HeroTable>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTrendsModule;
