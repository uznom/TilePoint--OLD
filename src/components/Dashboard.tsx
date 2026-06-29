/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import {
  Package,
  FolderOpen,
  Users,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Layers,
  ArrowRight,
  ClipboardList,
  Building,
  ShieldCheck,
  Wifi,
  Radio,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Check,
  Edit,
  X,
  ArrowRightLeft,
  Truck,
  TrendingDown,
  Activity,
  History,
  FileText,
  Database,
  Upload,
  Image,
  Printer,
  Search,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types/db';
import { AdminProfitDashboard } from './AdminProfitDashboard';

interface DashboardProps {
  darkMode: boolean;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ darkMode, onNavigate }) => {
  const {
    stats: globalStats,
    products,
    sales,
    saleItems,
    purchaseOrders,
    branches,
    auditLogs,
    currentUser,
    stockTransfers,
    updateStockTransferStatus,
    createStockTransfer,
    branchStock,
    suppliers,
    updateBranch,
    updateCurrentUser,
    checkoutSale,
    simulationModeActive
  } = useDb();

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Drilldown states for Inventory Health Interactive Cards
  const [activeDrilldown, setActiveDrilldown] = useState<'none' | 'low' | 'critical' | 'out_of_stock' | 'products'>('none');
  
  // Localized Notification Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Admin Drill-down & Analytics States
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [branchSortKey, setBranchSortKey] = useState<'sales' | 'growth' | 'name' | 'staff'>('sales');
  const [branchSortOrder, setBranchSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bestsellerSortBy, setBestsellerSortBy] = useState<'qty' | 'revenue'>('qty');
  const [bestsellerLimit, setBestsellerLimit] = useState<number>(5);

  // --- INTERACTIVE STATE OPTIONS ---
  // Weekly Corporate Sales Trend parameters
  const [weeklyMetric, setWeeklyMetric] = useState<'revenue' | 'orders' | 'boxes'>('revenue');
  const [selectedWeeklyDay, setSelectedWeeklyDay] = useState<number | null>(null);

  // 6-Month Enterprise Revenue Wave parameters
  const [waveStyle, setWaveStyle] = useState<'spline' | 'step' | 'linear'>('spline');
  const [forecastEnabled, setForecastEnabled] = useState<boolean>(false);
  const [selectedForecastMonth, setSelectedForecastMonth] = useState<number | null>(null);

  // Branch Quota / Goal Quick Editor Inline State
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Corporate Target State
  const [corporateTarget, setCorporateTarget] = useState<number>(() => {
    return Number(localStorage.getItem('tilepoint_corporate_target_v1')) || 10000000;
  });
  const [isEditingCorporateTarget, setIsEditingCorporateTarget] = useState<boolean>(false);
  const [tempCorporateTargetInput, setTempCorporateTargetInput] = useState<string>('');
  const [editingBranchQuota, setEditingBranchQuota] = useState<number>(2000000);
  const [editingBranchStaff, setEditingBranchStaff] = useState<number>(10);

  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);

  // Real-time Admin Daily Sales Monitor states
  const [dailySalesSearch, setDailySalesSearch] = useState<string>('');
  const [activeDailyPaymentFilter, setActiveDailyPaymentFilter] = useState<string>('all');
  const [showAllDailyTransactions, setShowAllDailyTransactions] = useState<boolean>(false);
  const [showDailySalesMonitor, setShowDailySalesMonitor] = useState<boolean>(true);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'operations' | 'profit-loss'>('operations');

  const showToastMsg = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };



  // Resolve current active branch filter based on user role and Admin select choice
  const activeBranchId = currentUser.role === UserRole.ADMIN
    ? (selectedBranchId === 'all' ? null : selectedBranchId)
    : currentUser.branchAssignmentId;

  // Enforce branch-level isolation for non-admin users
  const filteredSales = currentUser.role === UserRole.ADMIN
    ? (selectedBranchId === 'all' ? sales : sales.filter(s => s.branchId === selectedBranchId))
    : sales.filter(s => s.branchId === currentUser.branchAssignmentId);

  const filteredPurchaseOrders = currentUser.role === UserRole.ADMIN
    ? (selectedBranchId === 'all' ? purchaseOrders : purchaseOrders.filter(po => po.branchId === selectedBranchId))
    : purchaseOrders.filter(po => po.branchId === currentUser.branchAssignmentId);

  // Helper to resolve specific product stock count within current active filter context
  const getProductStockForCurrentContext = (pId: string) => {
    if (activeBranchId) {
      const bs = branchStock.find(item => item.productId === pId && item.branchId === activeBranchId);
      return bs ? bs.quantity : 0;
    }
    const p = products.find(item => item.id === pId);
    return p ? p.stockQuantity : 0;
  };

  // Today's Sales
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySalesItems = filteredSales.filter(s => s.createdAt.startsWith(todayStr) && !s.isDeleted);
  const computedTodaySales = todaySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Weekly Sales
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklySalesItems = filteredSales.filter(s => new Date(s.createdAt) >= sevenDaysAgo && !s.isDeleted);
  const computedWeeklySales = weeklySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Monthly Revenue (current month)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthlySalesItems = filteredSales.filter(s => s.createdAt.startsWith(currentMonthStr) && !s.isDeleted);
  const computedMonthlyRevenue = monthlySalesItems.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Corporate aggregate metric calculation (All branches, regardless of assignment)
  const corporateTodaySales = sales.filter(s => s.createdAt.startsWith(todayStr) && !s.isDeleted).reduce((acc, s) => acc + s.grandTotal, 0);
  const corporateMonthlyRevenue = sales.filter(s => s.createdAt.startsWith(currentMonthStr) && !s.isDeleted).reduce((acc, s) => acc + s.grandTotal, 0);
  const activeBranchesCount = branches.filter(b => !b.isDeleted).length;

  // Inventory value computed dynamically based on cost basis and selected branch
  const totalInventoryCostValue = branchStock
    .filter(bs => !activeBranchId || bs.branchId === activeBranchId)
    .reduce((acc, bs) => {
      const product = products.find(p => p.id === bs.productId && !p.isDeleted);
      return acc + (product ? bs.quantity * product.costPrice : 0);
    }, 0);

  const activeProducts = products.filter(p => !p.isDeleted);
  
  // Quantitative lists for health drilling using context-aware stock counts
  const lowStockProducts = activeProducts.filter(p => {
    const stock = getProductStockForCurrentContext(p.id);
    return stock > 0 && stock <= p.minimumStock;
  });
  const outOfStockProducts = activeProducts.filter(p => getProductStockForCurrentContext(p.id) === 0);
  const criticalStockProducts = activeProducts.filter(p => {
    const stock = getProductStockForCurrentContext(p.id);
    return stock > 0 && stock <= 10;
  });

  const stats = {
    ...globalStats,
    todaySales: computedTodaySales,
    weeklySales: computedWeeklySales,
    monthlyRevenue: computedMonthlyRevenue,
    totalProducts: activeProducts.length,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    criticalStockCount: criticalStockProducts.length,
  };

  const pendingOrders = filteredPurchaseOrders.filter(po => po.status === 'Pending' || po.status === 'Ordered');

  // Chart values calculation
  const getWeeklyChartData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const currentDayIdx = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const adjustedCurrentDayIdx = currentDayIdx === 0 ? 6 : currentDayIdx - 1;

    return days.map((day, idx) => {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - (adjustedCurrentDayIdx - idx));
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      const daySales = filteredSales.filter(s => s.createdAt.startsWith(targetDateStr) && !s.isDeleted);
      
      let liveValue = 0;
      if (weeklyMetric === 'revenue') {
        liveValue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
      } else if (weeklyMetric === 'orders') {
        liveValue = daySales.length;
      } else if (weeklyMetric === 'boxes') {
        const saleIds = new Set(daySales.map(s => s.id));
        liveValue = saleItems.filter(si => saleIds.has(si.saleId) && !si.isDeleted).reduce((sum, si) => sum + si.quantity, 0);
      }

      return {
        day,
        amount: liveValue,
        rawSales: daySales
      };
    });
  };

  const getMonthlyChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    let list = months.map((month, idx) => {
      const monthPrefix = `2026-${String(idx + 1).padStart(2, '0')}`;
      const monthSales = filteredSales.filter(s => s.createdAt.startsWith(monthPrefix) && !s.isDeleted);
      const computedRev = monthSales.reduce((sum, s) => sum + s.grandTotal, 0);

      return { 
        month, 
        revenue: Math.round(computedRev),
        isPredicted: false
      };
    });

    if (forecastEnabled) {
      const forecastMonths = ['Jul', 'Aug', 'Sep'];
      let currentVal = list[5].revenue;
      let trendVal = (list[5].revenue - list[4].revenue) * 0.3;

      forecastMonths.forEach((m, idx) => {
        const forecastedRevenue = Math.round(currentVal * (1 + 0.04 * (idx + 1)) + trendVal);
        list.push({
          month: m,
          revenue: forecastedRevenue,
          isPredicted: true
        });
        currentVal = forecastedRevenue;
      });
    }

    return list;
  };

  const weeklyChartData = getWeeklyChartData();
  const monthlyChartData = getMonthlyChartData();

  const maxWeeklyAmount = Math.max(...weeklyChartData.map(d => d.amount));
  const maxMonthlyAmount = Math.max(...monthlyChartData.map(d => d.revenue));

  const getMonthlyRatio = (val: number) => {
    if (!maxMonthlyAmount || isNaN(maxMonthlyAmount) || maxMonthlyAmount <= 0) return 0;
    const res = val / maxMonthlyAmount;
    return isNaN(res) || !isFinite(res) ? 0 : res;
  };

  const generateSvgPaths = (data: { month: string; revenue: number; isPredicted?: boolean }[]) => {
    const width = 560;
    const height = 150;
    const paddingLeft = 30;
    const totalHeight = 190;

    const points = data.map((d, idx) => {
      const cx = paddingLeft + (idx / (data.length - 1)) * (width - 40);
      const cy = totalHeight - (getMonthlyRatio(d.revenue) * height);
      return { cx, cy, isPredicted: d.isPredicted, revenue: d.revenue, month: d.month };
    });

    if (points.length === 0) return { areaD: '', lineD: '', points: [] };

    let lineD = '';
    let areaD = '';

    if (waveStyle === 'linear') {
      lineD = `M ${points[0].cx} ${points[0].cy} ` + points.slice(1).map(p => `L ${p.cx} ${p.cy}`).join(' ');
    } else if (waveStyle === 'step') {
      lineD = `M ${points[0].cx} ${points[0].cy} `;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const curr = points[i];
        const midX = (prev.cx + curr.cx) / 2;
        lineD += `L ${midX} ${prev.cy} L ${midX} ${curr.cy} L ${curr.cx} ${curr.cy} `;
      }
    } else {
      lineD = `M ${points[0].cx} ${points[0].cy} `;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX1 = p0.cx + (p1.cx - p0.cx) / 3;
        const cpY1 = p0.cy;
        const cpX2 = p0.cx + 2 * (p1.cx - p0.cx) / 3;
        const cpY2 = p1.cy;
        lineD += `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.cx} ${p1.cy} `;
      }
    }

    areaD = `${lineD} L ${points[points.length - 1].cx} 200 L ${points[0].cx} 200 Z`;

    return { areaD, lineD, points };
  };

  const svgPaths = generateSvgPaths(monthlyChartData);

  const categorySummary = activeProducts.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categorySummary)
    .map(([name, count]) => ({ name: String(name), count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const getBranchName = (id: string | null) => {
    if (!id) return 'Corporate Hub';
    const b = branches.find(br => br.id === id);
    return b ? b.name : `Branch ${id}`;
  };

  // Branch Performance data with baseline projections + live sales
  const branchPerformance = branches.map(b => {
    const liveSales = sales
      .filter(s => s.branchId === b.id && !s.isDeleted)
      .reduce((acc, s) => acc + s.grandTotal, 0);
    
    // Baseline mapped representatively plus current session sales
    const totalSales = b.monthlySales + liveSales;
    
    let textGrowth = "+12%";
    let growth = 12;
    let trend: 'up' | 'down' = 'up';
    if (b.id === 'B1') { textGrowth = "+12%"; growth = 12; trend = 'up'; }
    else if (b.id === 'B2') { textGrowth = "+8%"; growth = 8; trend = 'up'; }
    else if (b.id === 'B3') { textGrowth = "-5%"; growth = -5; trend = 'down'; }
    else if (b.id === 'B4') { textGrowth = "+3.5%"; growth = 3.5; trend = 'up'; }

    return {
      ...b,
      totalSales,
      growth,
      textGrowth,
      trend
    };
  });

  const sortedBranchPerformance = [...branchPerformance].sort((a, b) => {
    let comparison = 0;
    if (branchSortKey === 'sales') {
      comparison = a.totalSales - b.totalSales;
    } else if (branchSortKey === 'growth') {
      comparison = a.growth - b.growth;
    } else if (branchSortKey === 'staff') {
      comparison = a.staffCount - b.staffCount;
    } else {
      comparison = a.name.localeCompare(b.name);
    }
    return branchSortOrder === 'desc' ? -comparison : comparison;
  });

  // Calculate Best Selling Products dynamically based on filtered active sales
  const activeSalesIds = new Set(filteredSales.filter(s => !s.isDeleted).map(s => s.id));
  const filteredSaleItems = saleItems.filter(si => activeSalesIds.has(si.saleId) && !si.isDeleted);

  // Group sale items by product identifier
  const productSalesMap = filteredSaleItems.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = {
        productId: item.productId,
        productName: item.productName,
        quantitySold: 0,
        revenue: 0
      };
    }
    acc[item.productId].quantitySold += item.quantity;
    acc[item.productId].revenue += item.total;
    return acc;
  }, {} as Record<string, { productId: string; productName: string; quantitySold: number; revenue: number }>);

  // Merge full product attributes for presentation
  const bestsellingProducts = (Object.values(productSalesMap) as { productId: string; productName: string; quantitySold: number; revenue: number }[]).map(saleData => {
    const p = products.find(prod => prod.id === saleData.productId);
    return {
      ...saleData,
      sku: p?.sku || 'N/A',
      category: p?.category || 'Hardware',
      stockQuantity: p ? getProductStockForCurrentContext(p.id) : 0,
    };
  });

  // Slow moving Tile Aging data dynamically modeled based on active catalog products & assigned branches
  const getDynamicSlowMovingCandidates = () => {
    const list: Array<{
      productId: string;
      productName: string;
      branchId: string;
      branchName: string;
      daysUnsold: number;
      riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      suggestedAction: string;
      targetBranchId: string;
    }> = [];

    products.filter(p => !p.isDeleted).forEach((p) => {
      branches.filter(b => !b.isDeleted).forEach((b) => {
        const stock = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id)?.quantity || 0;
        if (stock <= 0) return;

        // Find sales for this product at this branch
        const bSaleItems = saleItems.filter(si => si.productId === p.id && !si.isDeleted);
        const bSaleIds = new Set(bSaleItems.map(si => si.saleId));
        const bSales = sales.filter(s => bSaleIds.has(s.id) && s.branchId === b.id && !s.isDeleted);

        let lastSaleDate = new Date(p.createdAt || '2026-01-01');
        if (bSales.length > 0) {
          const saleTimes = bSales.map(s => new Date(s.createdAt).getTime());
          const latestTime = Math.max(...saleTimes);
          if (!isNaN(latestTime)) {
            lastSaleDate = new Date(latestTime);
          }
        }

        const now = new Date();
        const diffTime = now.getTime() - lastSaleDate.getTime();
        const daysUnsold = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        if (daysUnsold >= 30 && b.id !== 'B1') {
          let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          let suggestedAction = 'Consolidate directly to Main hub';
          if (daysUnsold >= 120) {
            riskLevel = 'HIGH';
            suggestedAction = 'Redistribute to Main showroom';
          } else if (daysUnsold >= 60) {
            riskLevel = 'MEDIUM';
            suggestedAction = 'Local Discounted Bundle Clearance';
          }

          list.push({
            productId: p.id,
            productName: p.productName,
            branchId: b.id,
            branchName: b.name,
            daysUnsold,
            riskLevel,
            suggestedAction,
            targetBranchId: 'B1'
          });
        }
      });
    });

    return list;
  };

  const slowMovingCandidates = getDynamicSlowMovingCandidates();

  // Initiate stock redistribution transfers dynamically
  const handleExecuteRedistribution = (candidate: typeof slowMovingCandidates[0]) => {
    try {
      const items = [{ productId: candidate.productId, quantity: 20 }];
      const reason = `${currentUser.role} Action: Automated redistribution of slow moving tile (unsold for ${candidate.daysUnsold} days) to showroom`;
      
      createStockTransfer(candidate.branchId, candidate.targetBranchId, 'Redistribution', items, reason);
      showToastMsg(`Created redistribution transfer request of ${candidate.productName} from ${candidate.branchName}!`, 'success');
    } catch (e) {
      console.error(e);
      showToastMsg('Failed to execute stock redistribution transfer request.', 'error');
    }
  };

  const handleApproveTransfer = (id: string, transferNo: string) => {
    try {
      updateStockTransferStatus(id, 'Approved');
      showToastMsg(`Approved and Shipped Transfer Request ${transferNo}! Assets routed.`, 'success');
    } catch (e) {
      console.error(e);
      showToastMsg('Approval processing error.', 'error');
    }
  };

  const handleDeclineTransfer = (id: string, transferNo: string) => {
    try {
      updateStockTransferStatus(id, 'Cancelled');
      showToastMsg(`Rejected and Cancelled Stock Transfer Request ${transferNo}.`, 'info');
    } catch (e) {
      console.error(e);
      showToastMsg('Rejection processing error.', 'error');
    }
  };



  /*****************************************************************************
   * 1. ADMIN COMMAND CENTER VIEWS
   *****************************************************************************/
  if (currentUser.role === UserRole.ADMIN) {
    // Alarms compiling logic derived straight from database context variables
    const alarmsList = [];
    if (outOfStockProducts.length > 0) {
      alarmsList.push({
        id: 'A1',
        type: 'critical',
        message: `Critically out of stock: ${outOfStockProducts.length} items have fallen to 0 units. Retail sales blocked.`
      });
    }
    const pendingCount = stockTransfers.filter(t => t.status === 'Pending').length;
    if (pendingCount > 0) {
      alarmsList.push({
        id: 'A2',
        type: 'warning',
        message: `Transfer Waiting Signature: ${pendingCount} inter-branch cargo flows require immediate Admin approval.`
      });
    }
    if (lowStockProducts.length > 0) {
      alarmsList.push({
        id: 'A3',
        type: 'info',
        message: `Operational Alert: ${lowStockProducts.length} products have broken security minimum stock counts.`
      });
    }
    const overduePOsCount = purchaseOrders.filter(po => po.status === 'Ordered').length;
    if (overduePOsCount > 0) {
      alarmsList.push({
        id: 'A4',
        type: 'warning',
        message: `Supply pipeline outstanding: ${overduePOsCount} open purchase orders are awaiting supplier arrival.`
      });
    }

    return (
      <div className="space-y-6 animate-fade-in text-m3-on-surface">
        
        {/* Dynamic Toast feedback panel */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-slide-left ${
            toast.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : toast.type === 'error' 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}>
            <Activity className="h-5 w-5 animate-pulse shrink-0" />
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-m3-on-surface/10 rounded-lg text-current">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Corporate Header Section */}
        <div className="android-glass border border-m3-outline-variant/30 rounded-[28px] p-6 shadow-lg bg-gradient-to-br from-m3-primary/5 to-m3-secondary/5 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-m3-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-m3-primary/10 text-m3-primary px-3 py-1 rounded-full border border-m3-primary/20 font-mono font-bold uppercase tracking-widest">
                  Executive Command Suite
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-m3-on-surface-variant font-mono">Consolidated HQ Ledger Active</span>
              </div>
              <h2 className="text-2xl font-black mt-2 tracking-tight text-m3-primary">Enterprise Business Dashboard</h2>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed mt-1 max-w-xl">
                Oversight terminal for <span className="font-bold text-m3-primary">Erica Manaban</span>. Admin clearing processes are live. Inter-branch stock redistribution triggers, purchase approvals, and company-wide sales analytics are consolidated.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 items-stretch sm:items-end md:items-center w-full md:w-auto">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[9px] text-m3-primary font-mono uppercase font-black pl-1">Active View-Port Branch:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    showToastMsg(`Switched Command View-Port to: ${e.target.value === 'all' ? 'All Corporate Branches' : getBranchName(e.target.value)}`, 'info');
                  }}
                  className="bg-m3-surface-low border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 text-m3-on-surface focus:outline-none cursor-pointer hover:border-m3-primary transition-colors min-w-[210px] [color-scheme:dark]"
                >
                  <option value="all">All Branches (Consolidated)</option>
                  {branches.filter(b => !b.isDeleted).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="p-3 text-xs bg-m3-surface-low rounded-2xl border border-m3-outline-variant/30 hover:bg-m3-primary/10 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 font-sans font-bold text-m3-on-surface"
                  title="Force refresh database records"
                >
                  <RefreshCw className="h-4 w-4 text-m3-primary" /> Reload Feed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 bg-m3-surface-low p-1.5 rounded-[20px] border border-m3-outline-variant/35 w-full max-w-md">
          <button
            onClick={() => {
              setActiveDashboardTab('operations');
              showToastMsg('Accessing Operations Control Desk', 'success');
            }}
            className={`flex-1 py-3 px-4 rounded-[16px] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeDashboardTab === 'operations'
                ? 'bg-m3-primary text-m3-on-primary shadow-md font-black'
                : 'text-zinc-400 hover:text-m3-on-surface hover:bg-m3-primary/5'
            }`}
          >
            <Activity className="h-4 w-4" />
            Operations
          </button>
          <button
            onClick={() => {
              setActiveDashboardTab('profit-loss');
              showToastMsg('Accessing Consolidated P&L Dashboard', 'success');
            }}
            className={`flex-1 py-3 px-4 rounded-[16px] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeDashboardTab === 'profit-loss'
                ? 'bg-m3-primary text-m3-on-primary shadow-md font-black'
                : 'text-zinc-400 hover:text-m3-on-surface hover:bg-m3-primary/5'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Profit & Loss
          </button>
        </div>

        {activeDashboardTab === 'profit-loss' ? (
          <AdminProfitDashboard
            darkMode={darkMode}
            selectedBranchId={selectedBranchId}
            setSelectedBranchId={setSelectedBranchId}
            getBranchName={getBranchName}
            showToastMsg={showToastMsg}
          />
        ) : (
          <>
            {/* REAL-TIME ADMIN DAILY SALES TRANSMISSION MONITOR */}
            <div className="bg-m3-surface-low rounded-[32px] border border-m3-outline-variant/35 shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-m3-outline-variant/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-base font-black text-m3-on-surface uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Live Daily Sales Oversight Terminal
                </h3>
                <p className="text-[11px] text-m3-on-surface-variant font-mono mt-0.5">
                  Real-time transaction tracking, cashier clearing queues, and multi-browser printed ledgers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {simulationModeActive && (
              <button
                type="button"
                onClick={() => {
                  // Simulate 1-click live sale
                  const activeProducts = products.filter(p => !p.isDeleted);
                  if (activeProducts.length === 0) {
                    showToastMsg('Catalog is empty. Add products in the Inventory page first.', 'error');
                    return;
                  }
                  
                  const count = Math.floor(Math.random() * 2) + 1; // 1 or 2 items
                  const selectedItems: { product: any; quantity: number }[] = [];
                  for (let i = 0; i < count; i++) {
                    const idx = Math.floor(Math.random() * activeProducts.length);
                    const prod = activeProducts[idx];
                    selectedItems.push({ product: prod, quantity: Math.floor(Math.random() * 3) + 1 });
                  }

                  const firstNames = ['John', 'Maria', 'Arnel', 'Emmel', 'Clarisse', 'Dante', 'Gener', 'Krystel', 'Leah'];
                  const lastNames = ['Cruz', 'Santos', 'Reyes', 'Pineda', 'Santiago', 'Manaban', 'Lopez', 'Dela Cruz'];
                  const randomCustomer = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
                  
                  const paymentMethods: ('Cash' | 'Card' | 'Bank Transfer' | 'GCash')[] = ['Cash', 'Card', 'Bank Transfer', 'GCash'];
                  const randomPayment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                  
                  try {
                    const subtotal = selectedItems.reduce((acc, it) => acc + (it.product.sellingPrice * it.quantity), 0);
                    const vat = parseFloat((subtotal * 0.12).toFixed(2));
                    const grandTotal = subtotal + vat;
                    
                    checkoutSale(
                      selectedItems,
                      randomCustomer,
                      'Simulated via Admin Live Monitoring Oversight Console',
                      0,
                      randomPayment as any,
                      randomPayment === 'Cash' ? Math.ceil(grandTotal / 500) * 500 : grandTotal
                    );
                    showToastMsg(`Simulated Sale Completed! Customer: ${randomCustomer} • Total: ₱${grandTotal.toLocaleString()}`, 'success');
                  } catch (err) {
                    console.error("Simulation failure", err);
                    showToastMsg('Simulation dispatch failed', 'error');
                  }
                }}
                className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-500/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="Generates a mock transaction of today instantly to test the real-time pipeline"
              >
                Simulate checkout
              </button>
              )}

              <button
                type="button"
                onClick={() => {
                  // Beautiful printed summary document
                  const todaySalesIds = new Set(todaySalesItems.map(s => s.id));
                  const todayBoxesSold = saleItems
                    .filter(si => todaySalesIds.has(si.saleId) && !si.isDeleted)
                    .reduce((sum, item) => sum + item.quantity, 0);

                  const cashToday = todaySalesItems.filter(s => s.paymentMethod === 'Cash').reduce((acc, s) => acc + s.grandTotal, 0);
                  const cardToday = todaySalesItems.filter(s => s.paymentMethod === 'Credit Card').reduce((acc, s) => acc + s.grandTotal, 0);
                  const bankToday = todaySalesItems.filter(s => s.paymentMethod === 'Bank Transfer').reduce((acc, s) => acc + s.grandTotal, 0);
                  const gcashToday = todaySalesItems.filter(s => s.paymentMethod === 'GCash' || s.paymentMethod === 'Maya').reduce((acc, s) => acc + s.grandTotal, 0);

                  const printContent = `
                    <html>
                      <head>
                        <title>TilePoint Daily Sales Report - ${todayStr}</title>
                        <style>
                          body {
                            font-family: Arial, sans-serif;
                            color: #333333;
                            padding: 24px;
                            line-height: 1.4;
                            background: #ffffff;
                          }
                          .header {
                            border-bottom: 3px solid #111111;
                            padding-bottom: 12px;
                            margin-bottom: 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                          }
                          .title {
                            font-size: 22px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                          }
                          .branch-info {
                            font-size: 11px;
                            color: #666;
                            text-align: right;
                          }
                          .stats-grid {
                            display: grid;
                            grid-template-cols: repeat(4, 1fr);
                            gap: 15px;
                            margin-bottom: 25px;
                          }
                          .stat-box {
                            background: #f8f9fa;
                            border: 1px solid #dee2e6;
                            padding: 12px;
                            border-radius: 8px;
                          }
                          .stat-label {
                            font-size: 9px;
                            text-transform: uppercase;
                            color: #6c757d;
                            font-weight: bold;
                            letter-spacing: 0.5px;
                          }
                          .stat-val {
                            font-size: 16px;
                            font-weight: bold;
                            color: #111;
                            margin-top: 4px;
                          }
                          table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 25px;
                          }
                          th {
                            background: #f1f3f5;
                            text-align: left;
                            font-size: 10px;
                            text-transform: uppercase;
                            padding: 10px;
                            border-bottom: 2px solid #dee2e6;
                            color: #495057;
                          }
                          td {
                            padding: 10px;
                            font-size: 11px;
                            border-bottom: 1px solid #dee2e6;
                          }
                          .total-row td {
                            font-weight: bold;
                            background: #f8f9fa;
                            border-top: 2px solid #111;
                          }
                          .disclaimer {
                            font-size: 9px;
                            color: #868e96;
                            text-align: center;
                            margin-top: 50px;
                            border-top: 1px dashed #dee2e6;
                            padding-top: 15px;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <div class="title">TilePoint Daily Sales Monitor Ledger</div>
                            <div style="font-size: 12px; margin-top: 5px; font-weight: bold; color: #555;">Corporate Oversight Report for Erica Manaban</div>
                          </div>
                          <div class="branch-info">
                            <div>Date: <strong>${todayStr}</strong></div>
                            <div>Authorized Port: <strong>${selectedBranchId === 'all' ? 'Consolidated All Branches' : getBranchName(selectedBranchId)}</strong></div>
                          </div>
                        </div>

                        <div class="stats-grid">
                          <div class="stat-box">
                            <div class="stat-label">TODAY'S CUMULATIVE REVENUE</div>
                            <div class="stat-val">₱${computedTodaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div class="stat-box">
                            <div class="stat-label">NUMBER OF CHECKOUTS</div>
                            <div class="stat-val">${todaySalesItems.length} Sales</div>
                          </div>
                          <div class="stat-box">
                            <div class="stat-label">TOTAL CARGO BOX QUANTITY</div>
                            <div class="stat-val">${todayBoxesSold} Tiles</div>
                          </div>
                          <div class="stat-box">
                            <div class="stat-label">GENERATED BY</div>
                            <div class="stat-val">${currentUser.fullName}</div>
                          </div>
                        </div>

                        <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Payment Drawer Breakdown</h3>
                        <table>
                          <thead>
                            <tr>
                              <th>Payment Mode</th>
                              <th>Total Cleared Vol</th>
                              <th>Transaction Count</th>
                              <th>Reconciliation Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Cash</td>
                              <td><strong>₱${cashToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                              <td>${todaySalesItems.filter(s => s.paymentMethod === 'Cash').length}</td>
                              <td>Verified Active</td>
                            </tr>
                            <tr>
                              <td>Card</td>
                              <td><strong>₱${cardToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                              <td>${todaySalesItems.filter(s => s.paymentMethod === 'Credit Card').length}</td>
                              <td>Settle Pending</td>
                            </tr>
                            <tr>
                              <td>GCash / Mobile Wallet</td>
                              <td><strong>₱${gcashToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                              <td>${todaySalesItems.filter(s => s.paymentMethod === 'GCash' || s.paymentMethod === 'Maya').length}</td>
                              <td>Settled Live</td>
                            </tr>
                            <tr>
                              <td>Bank Transfer</td>
                              <td><strong>₱${bankToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                              <td>${todaySalesItems.filter(s => s.paymentMethod === 'Bank Transfer').length}</td>
                              <td>Cleared Live</td>
                            </tr>
                          </tbody>
                        </table>

                        <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Today's Invoices Ledger Stream</h3>
                        <table>
                          <thead>
                            <tr>
                              <th>Invoice No.</th>
                              <th>Customer Name</th>
                              <th>Cashier Name</th>
                              <th>Payment Mode</th>
                              <th>Timestamp</th>
                              <th>Grand Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${todaySalesItems.map(s => `
                              <tr>
                                <td style="font-family: monospace; font-weight: bold;">${s.saleNumber}</td>
                                <td>${s.customerName}</td>
                                <td>${s.cashierName}</td>
                                <td>${s.paymentMethod}</td>
                                <td>${new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td style="font-weight: bold;">₱${s.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            `).join('')}
                            ${todaySalesItems.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #777;">No transactions have been checkout today.</td></tr>` : ''}
                            <tr class="total-row">
                              <td colspan="5" style="text-align: right; font-weight: bold;">CONSOLIDATED TODAY TOTAL:</td>
                              <td style="font-weight: bold; color: #111;">₱${computedTodaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div class="disclaimer">
                          This is an official real-time daily clearing record generated from the TilePoint Enterprise Ledger Engine on ${new Date().toLocaleString()}. All stock counts and accounting pipelines are synced.
                        </div>
                      </body>
                    </html>
                  `;

                  let popupSuccessful = false;
                  try {
                    const reportWindow = window.open('', '_blank', 'width=850,height=650');
                    if (reportWindow) {
                      reportWindow.document.write(printContent);
                      reportWindow.document.close();
                      popupSuccessful = true;
                    }
                  } catch (e) {
                    console.warn("Popup blocked. Switching to background print iframe fallback.");
                  }

                  if (!popupSuccessful) {
                    try {
                      const pIframe = document.createElement('iframe');
                      pIframe.style.position = 'fixed';
                      pIframe.style.width = '0px';
                      pIframe.style.height = '0px';
                      pIframe.style.border = 'none';
                      pIframe.style.bottom = '0px';
                      pIframe.style.right = '0px';
                      pIframe.style.opacity = '0';
                      document.body.appendChild(pIframe);

                      const idoc = pIframe.contentWindow ? pIframe.contentWindow.document : pIframe.contentDocument;
                      if (idoc) {
                        idoc.open();
                        idoc.write(printContent);
                        idoc.close();

                        setTimeout(() => {
                          if (pIframe.contentWindow) {
                            pIframe.contentWindow.focus();
                            pIframe.contentWindow.print();
                          }
                          setTimeout(() => {
                            if (document.body.contains(pIframe)) {
                              document.body.removeChild(pIframe);
                            }
                          }, 3000);
                        }, 800);
                      }
                    } catch (err) {
                      console.error("Print report fallback failed", err);
                    }
                  }
                  showToastMsg("Daily Sales Ledger dispatched to print queue!", "success");
                }}
                className="m3-btn-primary px-4 py-2 text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4" /> Print Daily Summary Report
              </button>

              <button
                type="button"
                onClick={() => setShowDailySalesMonitor(!showDailySalesMonitor)}
                className="p-1 px-3 text-[11px] font-bold text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-hover-overlay rounded-lg transition-all"
              >
                {showDailySalesMonitor ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {showDailySalesMonitor && (
            <div className="pt-5 space-y-6 animate-fade-in select-none">
              {/* Quick stats mini ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/10 shadow-sm">
                  <span className="block text-[8px] font-extrabold text-m3-on-surface-variant/80 uppercase tracking-widest">Live Today's Revenue</span>
                  <div className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₱{computedTodaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/10 shadow-sm">
                  <span className="block text-[8px] font-extrabold text-m3-on-surface-variant/80 uppercase tracking-widest">Active Invoice Volume</span>
                  <div className="text-xl font-black mt-1 text-m3-primary tracking-tight">
                    {todaySalesItems.length} checked out
                  </div>
                </div>

                <div className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/10 shadow-sm">
                  <span className="block text-[8px] font-extrabold text-m3-on-surface-variant/80 uppercase tracking-widest">Boxes Sold Today</span>
                  <div className="text-xl font-black mt-1 text-m3-on-surface tracking-tight">
                    {(() => {
                      const todaySalesIds = new Set(todaySalesItems.map(s => s.id));
                      return saleItems.filter(si => todaySalesIds.has(si.saleId) && !si.isDeleted).reduce((sum, item) => sum + item.quantity, 0);
                    })()} Cartons
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Breakdown metrics */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-m3-primary">Payment Composition Drawer</span>
                    <span className="text-[9px] font-mono text-zinc-500">Live reconciliation</span>
                  </div>

                  <div className="bg-m3-surface-lowest p-4.5 rounded-2xl border border-m3-outline-variant/10 space-y-4">
                    {[
                      { label: 'Cleared Cash drawer', val: todaySalesItems.filter(s => s.paymentMethod === 'Cash').reduce((acc, s) => acc + s.grandTotal, 0), color: 'bg-emerald-500', count: todaySalesItems.filter(s => s.paymentMethod === 'Cash').length },
                      { label: 'Card swipes volume', val: todaySalesItems.filter(s => s.paymentMethod === 'Credit Card').reduce((acc, s) => acc + s.grandTotal, 0), color: 'bg-indigo-500', count: todaySalesItems.filter(s => s.paymentMethod === 'Credit Card').length },
                      { label: 'GCash / Electronic Wallet', val: todaySalesItems.filter(s => s.paymentMethod === 'GCash' || s.paymentMethod === 'Maya').reduce((acc, s) => acc + s.grandTotal, 0), color: 'bg-sky-500', count: todaySalesItems.filter(s => s.paymentMethod === 'GCash' || s.paymentMethod === 'Maya').length },
                      { label: 'Local Bank Transfers', val: todaySalesItems.filter(s => s.paymentMethod === 'Bank Transfer').reduce((acc, s) => acc + s.grandTotal, 0), color: 'bg-pink-500', count: todaySalesItems.filter(s => s.paymentMethod === 'Bank Transfer').length },
                    ].map((mode, i) => {
                      const totalVol = computedTodaySales || 1;
                      const percent = Math.min(100, Math.round((mode.val / totalVol) * 100));
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-end text-[10px]">
                            <span className="font-bold text-m3-on-surface-variant">{mode.label} <span className="text-[9px] text-m3-on-surface-variant/70 font-mono">({mode.count} POs)</span></span>
                            <div className="text-right font-mono font-bold">
                              <span className="text-m3-on-surface mr-1.5">₱{mode.val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              <span className="text-m3-on-surface-variant/80">{percent}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-m3-surface-low rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${mode.color} transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cashier performance leaderboard */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-m3-primary">Operator Checkouts Ledger</span>
                    <span className="text-[9px] font-mono text-zinc-500">Live operational loads</span>
                  </div>

                  <div className="bg-m3-surface-lowest p-4 rounded-2xl border border-m3-outline-variant/10 h-[190px] overflow-y-auto space-y-2.5 font-sans">
                    {(() => {
                      const cashierMap = todaySalesItems.reduce((acc, s) => {
                        acc[s.cashierName] = (acc[s.cashierName] || 0) + s.grandTotal;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      const list = Object.entries(cashierMap).sort((a, b) => (b[1] as number) - (a[1] as number));
                      
                      if (list.length === 0) {
                        return (
                          <div className="text-center py-10 text-[10px] text-zinc-500 font-mono">
                            No cashier checkouts completed today. Simulated transactions will populate this board instantly.
                          </div>
                        );
                      }

                      return list.map(([name, sum], idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-m3-outline-variant/10 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-m3-primary/10 flex items-center justify-center font-extrabold text-[10px] text-m3-primary">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-bold text-m3-on-surface">{name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">₱{Number(sum).toFixed(2)}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Live search active checkouts feed */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-m3-surface-lowest p-2 rounded-2xl border border-m3-outline-variant/10">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-m3-on-surface-variant/75" />
                    <input
                      type="text"
                      className="w-full bg-transparent border-0 pl-10 pr-4 py-2 text-xs focus:ring-0 text-m3-on-surface placeholder-m3-on-surface-variant/55 font-semibold"
                      placeholder="Search today's stream by customer, ticket #, or operator..."
                      value={dailySalesSearch}
                      onChange={(e) => setDailySalesSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 px-2 shrink-0">
                    <span className="text-[9.5px] text-m3-on-surface-variant font-bold uppercase tracking-wider mr-1.5">Payment Method:</span>
                    {['all', 'Cash', 'Card', 'GCash', 'Bank Transfer'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setActiveDailyPaymentFilter(m)}
                        className={`px-2.5 py-1 text-[9px] rounded-lg font-black uppercase transition-all border border-m3-outline-variant/15 cursor-pointer ${
                          activeDailyPaymentFilter === m 
                            ? 'bg-m3-primary text-white shadow-sm font-bold' 
                            : 'text-m3-on-surface-variant hover:text-m3-primary bg-m3-surface-low/60 hover:bg-m3-hover-overlay'
                        }`}
                      >
                        {m === 'all' ? 'All' : m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-m3-surface-lowest rounded-2xl border border-m3-outline-variant/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse m-0">
                      <thead>
                        <tr className="bg-m3-surface-low/30 text-[9px] uppercase tracking-wider text-m3-primary border-b border-m3-outline-variant/10">
                          <th className="p-3 font-black">Ticket No.</th>
                          <th className="p-3 font-black">Customer</th>
                          <th className="p-3 font-black">Operator</th>
                          <th className="p-3 font-black">Payment Mode</th>
                          <th className="p-3 font-black">Grand Total</th>
                          <th className="p-3 font-black text-right border-0">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const searchedTodaySales = todaySalesItems.filter(s => {
                            const query = dailySalesSearch.toLowerCase();
                            const matchesSearch = s.saleNumber.toLowerCase().includes(query) ||
                                                 s.customerName.toLowerCase().includes(query) ||
                                                 s.cashierName.toLowerCase().includes(query);
                            const matchesPayment = activeDailyPaymentFilter === 'all' || s.paymentMethod.toLowerCase() === activeDailyPaymentFilter.toLowerCase();
                            return matchesSearch && matchesPayment;
                          });

                          const visibleSales = showAllDailyTransactions ? searchedTodaySales : searchedTodaySales.slice(0, 5);

                          if (visibleSales.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-xs text-zinc-500 font-mono">
                                  No transaction filters match. Try clearing filters or simulate a customer checkout.
                                </td>
                              </tr>
                            );
                          }

                          return visibleSales.map((s, i) => (
                            <tr key={i} className="border-b border-m3-outline-variant/10 hover:bg-m3-surface-low/30 last:border-none transition-colors">
                              <td className="p-3 text-xs font-mono font-bold text-m3-primary">{s.saleNumber}</td>
                              <td className="p-3 text-xs font-bold text-m3-on-surface">{s.customerName}</td>
                              <td className="p-3 text-xs font-semibold text-m3-on-surface-variant">{s.cashierName}</td>
                              <td className="p-3 text-[10px]">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[8.5px] ${
                                  s.paymentMethod === 'Cash' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                  s.paymentMethod === 'Credit Card' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' :
                                  s.paymentMethod === 'GCash' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30' :
                                  'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                                }`}>
                                  {s.paymentMethod}
                                </span>
                              </td>
                              <td className="p-3 text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                                ₱{s.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-xs text-right text-m3-on-surface-variant font-mono border-0">
                                {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const searchedTodaySales = todaySalesItems.filter(s => {
                      const query = dailySalesSearch.toLowerCase();
                      const matchesSearch = s.saleNumber.toLowerCase().includes(query) ||
                                           s.customerName.toLowerCase().includes(query) ||
                                           s.cashierName.toLowerCase().includes(query);
                      const matchesPayment = activeDailyPaymentFilter === 'all' || s.paymentMethod.toLowerCase() === activeDailyPaymentFilter.toLowerCase();
                      return matchesSearch && matchesPayment;
                    });

                    if (searchedTodaySales.length > 5) {
                      return (
                        <div className="bg-m3-surface-low/10 p-2.5 text-center border-t border-m3-outline-variant/10">
                          <button
                            type="button"
                            onClick={() => setShowAllDailyTransactions(!showAllDailyTransactions)}
                            className="text-[10px] text-m3-primary font-black uppercase tracking-wider hover:underline"
                          >
                            {showAllDailyTransactions ? 'Collapse transaction list' : `View all remaining ${searchedTodaySales.length - 5} today tickets`}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Priority 1 (Always Visible): Large KPI Cards Row representing standard targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI Card 1: Today's Combined Sales */}
          <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:bg-m3-surface-low/90 duration-300 bg-m3-surface-low text-m3-on-surface relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-1 z-10 w-full bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="z-20">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">
                {selectedBranchId === 'all' ? "Today's Sales (Global)" : `Today's Sales (${getBranchName(selectedBranchId)})`}
              </span>
              <div className="text-2xl font-black mt-2 tracking-tight text-emerald-500">
                ₱{stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span>Computed active checkouts</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 m3-shape-asymmetric shrink-0 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6.5 w-6.5" />
            </div>
          </div>

          {/* KPI Card 2: Company-wide Monthly Revenue */}
          <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:bg-m3-surface-low/90 duration-300 bg-m3-surface-low text-m3-on-surface relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-1 z-10 w-full bg-gradient-to-r from-m3-primary to-violet-500" />
            <div className="z-20">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">
                {selectedBranchId === 'all' ? "Monthly Revenue" : `Month Revenue (${getBranchName(selectedBranchId)})`}
              </span>
              <div className="text-2xl font-black mt-2 tracking-tight text-m3-primary">
                ₱{stats.monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10.5px] text-zinc-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
                {selectedBranchId === 'all' ? (
                  isEditingCorporateTarget ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-bold font-sans">₱</span>
                      <input
                        type="number"
                        className="w-24 bg-m3-surface-lowest border border-m3-outline-variant/50 px-1 py-0.5 text-[11px] font-mono rounded font-bold text-m3-on-surface"
                        value={tempCorporateTargetInput}
                        onChange={(e) => setTempCorporateTargetInput(e.target.value)}
                        placeholder="10000000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Number(tempCorporateTargetInput);
                            if (isNaN(val) || val <= 0) {
                              showToastMsg('Please enter a valid target amount.', 'error');
                              return;
                            }
                            localStorage.setItem('tilepoint_corporate_target_v1', String(val));
                            setCorporateTarget(val);
                            setIsEditingCorporateTarget(false);
                            showToastMsg('Corporate target updated successfully.');
                          } else if (e.key === 'Escape') {
                            setIsEditingCorporateTarget(false);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const val = Number(tempCorporateTargetInput);
                          if (isNaN(val) || val <= 0) {
                            showToastMsg('Please enter a valid target amount.', 'error');
                            return;
                          }
                          localStorage.setItem('tilepoint_corporate_target_v1', String(val));
                          setCorporateTarget(val);
                          setIsEditingCorporateTarget(false);
                          showToastMsg('Corporate target updated successfully.');
                        }}
                        className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded font-black text-xs cursor-pointer"
                        title="Save target"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setIsEditingCorporateTarget(false)}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded font-black text-xs cursor-pointer"
                        title="Cancel"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span>Corporate Target: <strong className="font-extrabold text-m3-on-surface font-sans">₱{corporateTarget.toLocaleString()}</strong></span>
                      {currentUser.role === UserRole.ADMIN && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempCorporateTargetInput(String(corporateTarget));
                            setIsEditingCorporateTarget(true);
                          }}
                          className="p-1 text-m3-primary hover:bg-m3-primary/10 rounded-full cursor-pointer flex items-center justify-center"
                          title="Edit Corporate Target"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  `Target quota benchmark: ₱2.5M`
                )}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-m3-primary/10 text-m3-primary m3-shape-asymmetric shrink-0 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-6.5 w-6.5" />
            </div>
          </div>

          {/* KPI Card 3: Dynamic Total Inventory Assets Value */}
          <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:bg-m3-surface-low/90 duration-300 bg-m3-surface-low text-m3-on-surface relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-1 z-10 w-full bg-gradient-to-r from-amber-500 to-amber-700" />
            <div className="z-20">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">
                {selectedBranchId === 'all' ? "Inventory Assets Value" : `Stock Assets (${getBranchName(selectedBranchId)})`}
              </span>
              <div className="text-2xl font-black mt-2 tracking-tight text-amber-500">
                ₱{totalInventoryCostValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1.5">Asset cost price basis valuation</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 m3-shape-asymmetric shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Package className="h-6.5 w-6.5" />
            </div>
          </div>

          {/* KPI Card 4: Active Interlinked Branches */}
          <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-md hover:shadow-lg transition-all hover:bg-m3-surface-low/90 duration-300 bg-m3-surface-low text-m3-on-surface relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-1 z-10 w-full bg-gradient-to-r from-sky-400 to-blue-600" />
            <div className="z-20">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">
                {selectedBranchId === 'all' ? 'Active Storefronts' : 'Active Staff Count'}
              </span>
              <div className="text-2xl font-black mt-2 tracking-tight text-sky-500">
                {selectedBranchId === 'all' 
                  ? `${activeBranchesCount} Branches Live` 
                  : `${branches.find(b => b.id === selectedBranchId)?.staffCount || 0} Floor Staff`
                }
              </div>
              <div className="text-[10px] text-zinc-400 mt-1.5">
                {selectedBranchId === 'all' 
                  ? 'Region: Metro Manila / Western Visayas' 
                  : `Manager assignment: ${branches.find(b => b.id === selectedBranchId)?.manager || 'Unassigned'}`
                }
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-500 m3-shape-asymmetric shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Building className="h-6.5 w-6.5" />
            </div>
          </div>

        </div>

        {/* Priority 1 (Always Visible): Store Chain Performance Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Store Chains comparison ledger */}
          <div className="m3-card shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-m3-primary flex items-center gap-2">
                    <Building className="h-5 w-5 text-m3-primary" /> Branch Performance Analytics
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant">Live sales aggregate versus baseline expectations</p>
                </div>
                <span className="text-[10px] font-mono bg-m3-primary/10 text-m3-primary px-2.5 py-1 rounded-lg border border-m3-primary/20">
                  Target: ₱2.0M each
                </span>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-bold select-none text-[10.5px]">
                      <th 
                        className="py-2.5 cursor-pointer hover:text-m3-primary transition-colors"
                        onClick={() => {
                          setBranchSortKey('name');
                          setBranchSortOrder(branchSortKey === 'name' && branchSortOrder === 'desc' ? 'asc' : 'desc');
                        }}
                      >
                        Branch Profile {branchSortKey === 'name' ? (branchSortOrder === 'desc' ? ' ▼' : ' ▲') : ''}
                      </th>
                      <th 
                        className="py-2.5 text-right cursor-pointer hover:text-m3-primary transition-colors"
                        onClick={() => {
                          setBranchSortKey('sales');
                          setBranchSortOrder(branchSortKey === 'sales' && branchSortOrder === 'desc' ? 'asc' : 'desc');
                        }}
                      >
                        Consolidated Sales {branchSortKey === 'sales' ? (branchSortOrder === 'desc' ? ' ▼' : ' ▲') : ''}
                      </th>
                      <th 
                        className="py-2.5 text-center cursor-pointer hover:text-m3-primary transition-colors"
                        onClick={() => {
                          setBranchSortKey('growth');
                          setBranchSortOrder(branchSortKey === 'growth' && branchSortOrder === 'desc' ? 'asc' : 'desc');
                        }}
                      >
                        Trend Growth {branchSortKey === 'growth' ? (branchSortOrder === 'desc' ? ' ▼' : ' ▲') : ''}
                      </th>
                      <th 
                        className="py-2.5 text-right pr-2 cursor-pointer hover:text-m3-primary transition-colors"
                        onClick={() => {
                          setBranchSortKey('staff');
                          setBranchSortOrder(branchSortKey === 'staff' && branchSortOrder === 'desc' ? 'asc' : 'desc');
                        }}
                      >
                        Staff Gauge {branchSortKey === 'staff' ? (branchSortOrder === 'desc' ? ' ▼' : ' ▲') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {sortedBranchPerformance.map((b, idx) => {
                      const branchQuota = b.monthlySales || 2000000;
                      const achievement = Math.min(100, (b.totalSales / branchQuota) * 100);
                      const barColor = b.id === 'B1' ? 'bg-m3-primary' : b.id === 'B2' ? 'bg-emerald-500' : b.id === 'B3' ? 'bg-amber-500' : 'bg-sky-500';
                      const isEditing = editingBranchId === b.id;

                      return (
                        <tr key={idx} className="hover:bg-m3-primary/5 transition-colors">
                          <td className="py-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 p-2 bg-zinc-900 border border-m3-outline-variant/30 rounded-2xl animate-fade-in text-[11px] max-w-xs">
                                <span className="font-bold text-m3-primary uppercase font-mono">Adjust Parameters ({b.id})</span>
                                
                                <div className="flex flex-col gap-1">
                                  <label className="text-zinc-400 font-bold">Sales Target Quota (PHP):</label>
                                  <input 
                                    type="number" 
                                    value={editingBranchQuota}
                                    onChange={(e) => setEditingBranchQuota(Number(e.target.value))}
                                    className="bg-zinc-800 border border-m3-outline-variant/20 rounded-xl p-1.5 text-xs text-white"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-zinc-400 font-bold">Floor Staff Assigned:</label>
                                  <input 
                                    type="number" 
                                    value={editingBranchStaff}
                                    onChange={(e) => setEditingBranchStaff(Number(e.target.value))}
                                    className="bg-zinc-800 border border-m3-outline-variant/20 rounded-xl p-1.5 text-xs text-white"
                                  />
                                </div>

                                <div className="flex gap-1.5 mt-1 justify-end">
                                  <button 
                                    onClick={() => setEditingBranchId(null)}
                                    className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-xl font-bold"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => {
                                      updateBranch(b.id, {
                                        monthlySales: editingBranchQuota,
                                        staffCount: editingBranchStaff
                                      });
                                      setEditingBranchId(null);
                                      showToastMsg(`Successfully updated branch operational boundaries for ${b.name}!`, 'success');
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold font-mono"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className="font-extrabold text-m3-on-surface">{b.name}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingBranchId(b.id);
                                      setEditingBranchQuota(branchQuota);
                                      setEditingBranchStaff(b.staffCount || 10);
                                    }}
                                    className="p-1 rounded hover:bg-zinc-805 text-zinc-400 hover:text-emerald-400 transition-colors"
                                    title="Edit target goals / staff counts inline"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="text-[10.5px] text-zinc-400 mt-0.5 font-mono">
                                  Manager: {b.manager} • {b.staffCount} floor staff • Target: ₱{branchQuota.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-m3-on-surface-variant align-middle">
                            ₱{b.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-center align-middle">
                            <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                              b.trend === 'up' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {b.trend === 'up' ? '▲' : '▼'} {b.textGrowth}
                            </span>
                          </td>
                          <td className="py-3 text-right align-middle">
                            <div className="flex flex-col items-end gap-1 font-mono text-[11px] pr-2">
                              <span>{achievement.toFixed(1)}% reached</span>
                              <div className="w-24 bg-m3-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${achievement}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="border-t border-m3-outline-variant/10 pt-4 mt-4 flex justify-between items-center bg-m3-surface-low/30 -mx-6 -mb-6 p-6 rounded-b-3xl">
              <span className="text-[10.5px] text-zinc-400 font-mono">Real-time sync matching active caching database</span>
              <button onClick={() => onNavigate('branches')} className="m3-btn text-xs font-bold py-1.5 flex items-center gap-1 select-none pr-3">
                Edit Branch Profiles <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right panel: Active High Priority Alerts */}
          <div className="m3-card shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
            <div>
              <h3 className="text-sm font-extrabold text-m3-primary tracking-tight uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" /> Enterprise Live Alerts
              </h3>
              <p className="text-[11.5px] text-m3-on-surface-variant mb-4">Urgent operations flagged by database engines</p>
              
              <div className="space-y-3">
                {alarmsList.map((alarm) => (
                  <div key={alarm.id} className={`p-3 rounded-xl border flex gap-2.5 ${
                    alarm.type === 'critical' 
                      ? 'bg-rose-500/5 border-rose-500/15 text-rose-300' 
                      : alarm.type === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/15 text-amber-300' 
                      : 'bg-indigo-500/5 border-indigo-500/15 text-indigo-300'
                  }`}>
                    <span className="h-2 w-2 rounded-full bg-current mt-1.5 shrink-0 animate-ping" />
                    <div>
                      <p className="text-[11px] leading-relaxed font-semibold">{alarm.message}</p>
                    </div>
                  </div>
                ))}

                {alarmsList.length === 0 && (
                  <div className="text-center py-8 text-xs text-m3-on-surface-variant flex flex-col items-center gap-1 bg-m3-surface-lowest/10 rounded-xl border border-dashed border-m3-outline-variant/20">
                    <ShieldCheck className="h-7 w-7 text-emerald-500 mb-1" />
                    <span className="font-extrabold text-emerald-500">Systems 100% Normalized</span>
                    <span className="text-[10px] text-zinc-400">Zero active exceptions found</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-m3-outline-variant/10 pt-4 mt-5 font-mono text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Security audit logs trace all actions</span>
              <button onClick={() => onNavigate('users')} className="text-m3-primary hover:underline font-black cursor-pointer">
                Employee Directory
              </button>
            </div>
          </div>

        </div>

        {/* Dynamic Marketing & Bestselling Products Analytics Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Best Selling Products Card */}
          <div className="m3-card shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-m3-outline-variant/15 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-m3-primary flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-m3-primary animate-pulse" />
                    <span>Best-Selling Products Analyzer</span>
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant mt-0.5">Top performing stock across transaction registers</p>
                </div>
                
                {/* Sorting & Filter Options for Best Sellers */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex bg-m3-surface-low rounded-lg p-0.5 border border-m3-outline-variant/30 font-semibold">
                    <button
                      type="button"
                      onClick={() => setBestsellerSortBy('qty')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${bestsellerSortBy === 'qty' ? 'bg-m3-primary text-white font-black shadow-sm' : 'text-m3-on-surface-variant'}`}
                    >
                      Qty Sold
                    </button>
                    <button
                      type="button"
                      onClick={() => setBestsellerSortBy('revenue')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${bestsellerSortBy === 'revenue' ? 'bg-m3-primary text-white font-black shadow-sm' : 'text-m3-on-surface-variant'}`}
                    >
                      Revenue
                    </button>
                  </div>
                  
                  <select
                    value={bestsellerLimit}
                    onChange={(e) => setBestsellerLimit(Number(e.target.value))}
                    className="bg-m3-surface-low border border-m3-outline-variant/35 rounded-lg py-1 px-2 font-bold focus:outline-none cursor-pointer text-m3-on-surface [color-scheme:dark]"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>All Sold</option>
                  </select>
                </div>
              </div>

              {/* Bestselling items render list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-bold text-[10.1px]">
                      <th className="py-2.5">Product Information</th>
                      <th className="py-2.5 font-bold">Category</th>
                      <th className="py-2.5 text-right">Units Sold</th>
                      <th className="py-2.5 text-right">Gross Revenue</th>
                      <th className="py-2.5 text-right pr-2">Current Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {bestsellingProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400 italic font-medium">
                          No items have been checkout simulated yet under this branch/view-port.
                        </td>
                      </tr>
                    ) : (
                      bestsellingProducts
                        .sort((a, b) => bestsellerSortBy === 'qty' ? b.quantitySold - a.quantitySold : b.revenue - a.revenue)
                        .slice(0, bestsellerLimit)
                        .map((p, idx) => {
                          const formattedRev = p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          return (
                            <tr key={idx} className="hover:bg-m3-primary/5 transition-colors">
                              <td className="py-3">
                                <div className="font-extrabold text-m3-on-surface">{p.productName}</div>
                                <div className="text-[10.5px] text-zinc-400 font-mono mt-0.5">SKU: {p.sku}</div>
                              </td>
                              <td className="py-3">
                                <span className="px-2.5 py-0.5 bg-m3-primary/10 border border-m3-primary/15 text-m3-primary rounded-full text-[9.5px] font-bold">
                                  {p.category}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-emerald-500">
                                {p.quantitySold} boxes
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-m3-primary">
                                ₱{formattedRev}
                              </td>
                              <td className="py-3 text-right pr-2 font-mono">
                                <span className={`font-bold ${p.stockQuantity <= 10 ? 'text-rose-500' : 'text-zinc-300'}`}>
                                  {p.stockQuantity} boxes
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-m3-outline-variant/10 pt-3.5 mt-4 text-[10.5px] font-mono text-zinc-400 flex justify-between items-center">
              <span>Bestseller tracking computed dynamically per invoice</span>
              <button onClick={() => onNavigate('pos')} className="text-m3-primary hover:underline font-black cursor-pointer">
                Go to POS checkout terminal to record new sales ➔
              </button>
            </div>
          </div>
          
          {/* Automated Redistribution Broker Card */}
          <div className="m3-card shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-between text-m3-on-surface bg-m3-surface duration-300">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Truck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <span>Inter-Branch Stock Balancing</span>
              </h3>
              <p className="text-[11.5px] text-m3-on-surface-variant leading-relaxed mb-4">
                Smart broker matching branch stock shortages with branch overstocks.
              </p>

              <div className="space-y-3">
                {/* Find shortage products */}
                {lowStockProducts.concat(outOfStockProducts).filter((v, i, self) => self.findIndex(t => t.id === v.id) === i).slice(0, 3).map((shortageProd, index) => {
                  // Find another branch with excess stock of this product (>20 units)
                  const matchingExcessStock = branchStock.find(
                    bs => bs.productId === shortageProd.id && 
                          (activeBranchId ? bs.branchId !== activeBranchId : true) && 
                          bs.quantity > 25
                  );

                  if (matchingExcessStock) {
                    const donorBranch = branches.find(b => b.id === matchingExcessStock.branchId);
                    const destinationBranchId = activeBranchId || 'B1'; // fall back to main branch context if none chosen
                    const localStock = getProductStockForCurrentContext(shortageProd.id);
                    return (
                      <div key={index} className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-emerald-400 font-black uppercase font-mono tracking-wider">Branch Rebalance Match</span>
                          <span className="text-[9.5px] font-mono font-bold bg-rose-500/20 text-rose-400 px-2 rounded-full">
                            Shortage ({localStock} left)
                          </span>
                        </div>
                        <p className="text-[11.3px] font-extrabold text-m3-on-surface truncate">{shortageProd.productName}</p>
                        <p className="text-[10px] text-zinc-400 leading-normal">
                          <strong className="text-zinc-200">{donorBranch?.name}</strong> has excess inventory (<strong className="text-emerald-400">{matchingExcessStock.quantity} boxes</strong>).
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const items = [{ productId: shortageProd.id, quantity: 15 }];
                              const reason = `Auto Broker Recommendation: Rebalance ${shortageProd.productName} from ${donorBranch?.name} overstock to ${getBranchName(destinationBranchId)}`;
                              createStockTransfer(matchingExcessStock.branchId, destinationBranchId, 'Redistribution', items, reason);
                              showToastMsg(`Dispatched balancing transfer request for ${shortageProd.productName} from ${donorBranch?.name}!`, 'success');
                            } catch (err) {
                              showToastMsg('Rebalancing transfer dispatch rejected.', 'error');
                            }
                          }}
                          className="w-full bg-emerald-500 text-white py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm mt-1 animate-pulse"
                        >
                          <ArrowRightLeft className="h-3 w-3" /> One-Click Rebalance (15 boxes)
                        </button>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Case when there's no shortage or no donor branch found */}
                {(!lowStockProducts.length && !outOfStockProducts.length) && (
                  <div className="p-3 bg-m3-surface-low/50 border border-m3-outline-variant/15 rounded-xl text-center py-7 text-xs text-m3-on-surface-variant border-dashed">
                    <ShieldCheck className="h-6 w-6 text-zinc-500 mx-auto mb-1.5" />
                    <span className="font-bold text-zinc-350 block text-[11px]">Balanced Stock Environment</span>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
                      No urgent inter-branch stock balancing suggestions matching your currently filtered viewport.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-m3-outline-variant/10 pt-3 mt-4 text-[10px] font-mono text-zinc-400">
              Updates warehouse inventory levels in real-time
            </div>
          </div>
          
        </div>

        {/* Priority 2: Low Stock Drilldowns & Priority Transfer approval hub */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT: Complete Interactive Stock Transfer Approvals Feed */}
          <div className="xl:col-span-8 m3-card shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-extrabold text-m3-primary tracking-tight flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-m3-primary" /> Active Logistics Transfer Hub
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant">Approve or Reject interlinked branch stock transport requests</p>
                </div>
                <span className="text-[10.5px] font-bold bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Admin Sign-off Power
                </span>
              </div>

              {/* Live stock transfer approval panel */}
              <div className="space-y-4 mt-4">
                <h4 className="text-xs font-black text-m3-primary uppercase tracking-widest border-b border-m3-outline-variant/15 pb-1 mt-2">
                  Awaiting Executive Decision ({stockTransfers.filter(t => t.status === 'Pending').length})
                </h4>

                {stockTransfers.filter(t => t.status === 'Pending').map((t, idx) => (
                  <div key={t.id || idx} className="p-4 rounded-2xl border border-m3-outline-variant/30 bg-m3-surface-low hover:border-m3-primary transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                    <div className="space-y-1.5 pl-2 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-amber-500 tracking-wide">{t.transferNo}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-500 font-mono font-bold capitalize">
                          {t.transferType} Request
                        </span>
                        <span className="text-[10px] text-zinc-400">Requested by: <span className="font-bold text-m3-on-surface">{t.requestedBy}</span></span>
                      </div>
                      
                      <div className="text-xs font-semibold text-m3-on-surface flex items-center gap-1.5">
                        <span className="font-extrabold">{getBranchName(t.fromBranchId)}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-400" />
                        <span className="font-extrabold text-m3-primary">{getBranchName(t.toBranchId)}</span>
                      </div>

                      {t.items.map((it, itemIdx) => (
                        <div key={itemIdx} className="text-xs text-zinc-400 font-mono">
                          Cargo: <span className="font-extrabold text-zinc-300">{it.productName}</span> — <span className="text-m3-primary font-black py-0.5 px-2 bg-m3-primary/10 rounded">{it.quantity} boxes</span>
                        </div>
                      ))}

                      <p className="text-[11px] text-m3-on-surface-variant font-medium leading-relaxed italic block">
                        Reason: "{t.reason}"
                      </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto shrink-0 border-t md:border-0 pt-3 md:pt-0">
                      <button 
                        onClick={() => handleDeclineTransfer(t.id, t.transferNo)}
                        className="flex-1 md:flex-none py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                      >
                        <X className="h-4 w-4" /> Reject Request
                      </button>
                      <button 
                        onClick={() => handleApproveTransfer(t.id, t.transferNo)}
                        className="flex-1 md:flex-none py-2 px-4.5 bg-emerald-500 text-m3-on-secondary font-black rounded-xl text-xs hover:bg-emerald-600 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 text-white"
                      >
                        <Truck className="h-4 w-4" /> Approve & Ship Assets
                      </button>
                    </div>
                  </div>
                ))}

                {stockTransfers.filter(t => t.status === 'Pending').length === 0 && (
                  <div className="text-center py-6 text-xs text-m3-on-surface-variant border border-dashed border-m3-outline-variant/20 rounded-2xl flex flex-col items-center gap-1 bg-emerald-500/5">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    <span className="font-bold text-emerald-500">Zero Pending Approval Transfers</span>
                    <span className="text-[10px] text-zinc-400">All branch logistics requests are signed and cleared!</span>
                  </div>
                )}

                <h4 className="text-xs font-black text-m3-primary uppercase tracking-widest border-b border-m3-outline-variant/15 pb-1 mt-6">
                  Recent Cargo Dispatches (Completed or In Transit)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {stockTransfers.filter(t => t.status !== 'Pending').slice(0, 4).map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-3.5 rounded-xl border border-m3-outline-variant/10 hover:bg-m3-surface-low transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-400">{t.transferNo}</span>
                          <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${
                            t.status === 'Received' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : t.status === 'In Transit' 
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-zinc-400 text-xs font-mono mt-1">
                          {getBranchName(t.fromBranchId)} ➔ {getBranchName(t.toBranchId)} • Approved by: {t.approvedBy || 'Admin'}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10.5px] text-zinc-400">
                        {new Date(t.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => onNavigate('transmittal')} className="m3-btn-tonal w-full mt-6 justify-center">
              Configure Transmittal Flows <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* RIGHT: COMPLETE INTERACTIVE INVENTORY HEALTH DRILLDOWNS */}
          <div className="xl:col-span-4 m3-card shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-m3-primary uppercase tracking-wider flex items-center gap-2 mb-1">
                <Layers className="h-4.5 w-4.5 text-m3-primary" /> Active Inventory Health
              </h3>
              <p className="text-xs text-m3-on-surface-variant mb-4">Click cards to drill down into product levels</p>

              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Product Card */}
                <button 
                  onClick={() => setActiveDrilldown(activeDrilldown === 'products' ? 'none' : 'products')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    activeDrilldown === 'products' 
                      ? 'border-m3-primary bg-m3-primary/10 select-none' 
                      : 'border-m3-outline-variant/30 hover:bg-m3-surface-low bg-m3-surface-lowest/70'
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 block font-mono font-bold uppercase">Total Products</span>
                  <div className="text-lg font-black text-m3-on-surface mt-1">{activeProducts.length}</div>
                  <span className="text-[9px] text-m3-primary hover:underline block mt-1">Drill Down ➔</span>
                </button>

                {/* Low Stock Card */}
                <button 
                  onClick={() => setActiveDrilldown(activeDrilldown === 'low' ? 'none' : 'low')}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    activeDrilldown === 'low' 
                      ? 'border-amber-500 bg-amber-500/10' 
                      : 'border-m3-outline-variant/30 hover:bg-m3-surface-low bg-m3-surface-lowest/70'
                  }`}
                >
                  {lowStockProducts.length > 0 && <span className="absolute top-1 right-2 animate-ping h-2 w-2 rounded-full bg-amber-500" />}
                  <span className="text-[10px] text-zinc-400 block font-mono font-bold uppercase">Low Stock</span>
                  <div className="text-lg font-black text-amber-500 mt-1">{lowStockProducts.length} items</div>
                  <span className="text-[9px] text-amber-500 hover:underline block mt-1">Drill Down ➔</span>
                </button>

                {/* Critical Stock Card */}
                <button 
                  onClick={() => setActiveDrilldown(activeDrilldown === 'critical' ? 'none' : 'critical')}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    activeDrilldown === 'critical' 
                      ? 'border-rose-400 bg-rose-400/10' 
                      : 'border-m3-outline-variant/30 hover:bg-m3-surface-low bg-m3-surface-lowest/70'
                  }`}
                >
                  {criticalStockProducts.length > 0 && <span className="absolute top-1 right-2 animate-ping h-2 w-2 rounded-full bg-rose-500" />}
                  <span className="text-[10px] text-zinc-400 block font-mono font-bold uppercase">Critical Stock</span>
                  <div className="text-lg font-black text-rose-500 mt-1">{criticalStockProducts.length} items</div>
                  <span className="text-[9px] text-rose-500 hover:underline block mt-1">Drill Down ➔</span>
                </button>

                {/* Out Of Stock Card */}
                <button 
                  onClick={() => setActiveDrilldown(activeDrilldown === 'out_of_stock' ? 'none' : 'out_of_stock')}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    activeDrilldown === 'out_of_stock' 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-m3-outline-variant/30 hover:bg-m3-surface-low bg-m3-surface-lowest/70'
                  }`}
                >
                  {outOfStockProducts.length > 0 && <span className="absolute top-1 right-2 animate-ping h-2 w-2 rounded-full bg-red-500" />}
                  <span className="text-[10px] text-zinc-400 block font-mono font-bold uppercase">Out of Stock</span>
                  <div className="text-lg font-black text-red-500 mt-1">{outOfStockProducts.length} items</div>
                  <span className="text-[9px] text-red-500 hover:underline block mt-1">Drill Down ➔</span>
                </button>

              </div>

              {/* Dynamic Drilldown Shelf */}
              <div className="mt-4 border-t border-m3-outline-variant/15 pt-4">
                {activeDrilldown === 'none' && (
                  <div className="text-center py-10 text-xs text-m3-on-surface-variant bg-m3-surface-low/30 rounded-2xl border border-dashed border-m3-outline-variant/15">
                    <Layers className="h-6 w-6 mx-auto text-m3-outline-variant/70 mb-1" />
                    Select any metric card above to view individual item quantities, SKUs and replenish.
                  </div>
                )}

                {activeDrilldown !== 'none' && (
                  <div className="space-y-3.5 max-h-76 overflow-y-auto pr-1 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] bg-m3-primary/10 text-m3-primary font-black px-2 py-0.5 rounded uppercase font-mono">
                        {activeDrilldown === 'products' ? 'PRODUCT LIST' : activeDrilldown === 'low' ? 'LOW STOCK SHELF' : activeDrilldown === 'critical' ? 'CRITICAL STOCK' : 'OUT OF STOCK LIST'}
                      </span>
                      <button onClick={() => setActiveDrilldown('none')} className="text-[10px] text-zinc-400 hover:underline">
                        Close [x]
                      </button>
                    </div>

                    {(activeDrilldown === 'products' ? activeProducts : activeDrilldown === 'low' ? lowStockProducts : activeDrilldown === 'critical' ? criticalStockProducts : outOfStockProducts).map((p, idx) => {
                      // Calculate branch stock breakdown ("display it per item")
                      const itemBranchStocks = branchStock.filter(bs => bs.productId === p.id);
                      
                      // Identify if any branch has excess stock (>25 boxes)
                      const excessBranches = itemBranchStocks.filter(bs => bs.quantity > 25);
                      const currentBranchId = currentUser.branchAssignmentId || 'B1';
                      
                      return (
                        <div key={idx} className="p-3 bg-m3-surface-lowest rounded-xl border border-m3-outline-variant/15 text-xs flex flex-col justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="font-extrabold text-m3-on-surface leading-snug flex items-center justify-between">
                              <span>{p.productName}</span>
                              {p.brand && (
                                <span className="text-[9.5px] font-mono uppercase bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full">
                                  {p.brand}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-zinc-400 flex items-center justify-between font-mono">
                              <span>SKU: {p.sku}</span>
                              <span className="text-m3-primary font-bold">Price: ₱{p.sellingPrice.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Branch Stock Breakdown Display */}
                          <div className="bg-m3-surface-low/50 p-2 rounded-lg space-y-1 my-1">
                            <span className="text-[9.5px] font-extrabold text-zinc-400 uppercase tracking-wide block">Branch stock records:</span>
                            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-mono">
                              {branches.filter(b => !b.isDeleted).map(br => {
                                const matchedStock = itemBranchStocks.find(bs => bs.branchId === br.id)?.quantity || 0;
                                const isLow = matchedStock < (p.minimumStock / 2);
                                return (
                                  <div key={br.id} className="flex justify-between items-center pr-2 bg-m3-surface-lowest p-1 rounded">
                                    <span className="text-zinc-500 truncate max-w-[90px]" title={br.name}>{br.name}:</span>
                                    <span className={isLow ? "text-red-400 font-bold" : matchedStock > 25 ? "text-emerald-400 font-bold" : "text-m3-on-surface"}>
                                      {matchedStock} bx {matchedStock > 25 && "📈"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-500/10 pt-2 text-[10.5px]">
                            <span>Current Global Stock: <span className="font-black text-m3-primary font-mono">{p.stockQuantity} boxes</span></span>
                            <span className="text-zinc-500 font-mono">Min req: {p.minimumStock}</span>
                          </div>

                          {/* Custom Button triggers according to user rules */}
                          <div className="space-y-1.5 pt-1">
                            {currentUser.role === 'Admin' ? (
                              <div className="space-y-1">
                                <button 
                                  onClick={() => {
                                    let cart = [];
                                    try {
                                      const cached = localStorage.getItem('tp_po_cart');
                                      cart = cached ? JSON.parse(cached) : [];
                                    } catch (e) {}
                                    if (!cart.some(item => item.productId === p.id)) {
                                      cart.push({ productId: p.id, quantity: 50 });
                                      localStorage.setItem('tp_po_cart', JSON.stringify(cart));
                                    }
                                    showToastMsg(`Queued "${p.productName}" for Purchase Order! Navigating to Sourcing Desk...`, 'success');
                                    setTimeout(() => {
                                      onNavigate('procurement');
                                      // Force sub-tab to brands so they can compile!
                                      localStorage.setItem('tp_active_subtab', 'brands');
                                      window.location.reload();
                                    }, 900);
                                  }}
                                  className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 transition-all text-white font-black rounded-lg text-[10.5px] uppercase cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  Direct to PO Sourcing Deck
                                </button>
                                
                                {excessBranches.length > 0 && (
                                  <div className="pt-1">
                                    <p className="text-[10px] text-emerald-400 italic font-mono mb-1 text-center">Surplus Stock Available:</p>
                                    <div className="space-y-1">
                                      {excessBranches.map(eb => {
                                        const donor = branches.find(b => b.id === eb.branchId);
                                        const recipient = branches.find(b => b.id === currentBranchId) || branches[0];
                                        return (
                                          <button
                                            key={eb.branchId}
                                            onClick={() => {
                                              try {
                                                const items = [{ productId: p.id, quantity: 15 }];
                                                const reason = `Inter-branch surplus transfer initialized from ${donor?.name} to balanced shortage.`;
                                                createStockTransfer(eb.branchId, recipient.id, 'Redistribution', items, reason);
                                                showToastMsg(`Dispatched excess stock rebalance transfer of 15boxes from ${donor?.name}!`, 'success');
                                              } catch (err) {
                                                showToastMsg('Failed to dispatch balancing transfer.', 'error');
                                              }
                                            }}
                                            className="w-full py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[9.5px] uppercase transition-all"
                                          >
                                            Transfer 15 boxes from surplus {donor?.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : currentUser.role === 'Manager' ? (
                              <div className="space-y-1">
                                <button 
                                  onClick={() => {
                                    showToastMsg(`Manager request submitted: Restock requisition log for ${p.productName} initiated.`, 'info');
                                    let cart = [];
                                    try {
                                      const cached = localStorage.getItem('tp_po_cart');
                                      cart = cached ? JSON.parse(cached) : [];
                                    } catch (e) {}
                                    if (!cart.some(item => item.productId === p.id)) {
                                      cart.push({ productId: p.id, quantity: 30 });
                                      localStorage.setItem('tp_po_cart', JSON.stringify(cart));
                                    }
                                  }}
                                  className="w-full py-1.5 bg-m3-primary hover:bg-m3-primary/80 transition-all text-m3-on-primary font-bold rounded-lg text-[10.5px] uppercase cursor-pointer"
                                >
                                  Request Restock Order Requisition
                                </button>
                                
                                {excessBranches.length > 0 && (
                                  <div className="pt-1">
                                    <p className="text-[10px] text-zinc-400 italic mb-1 text-center">Manage excess transfer option available:</p>
                                    {excessBranches.map(eb => {
                                      const donor = branches.find(b => b.id === eb.branchId);
                                      const recipient = branches.find(b => b.id === currentBranchId) || branches[0];
                                      return (
                                        <button
                                          key={eb.branchId}
                                          onClick={() => {
                                            const items = [{ productId: p.id, quantity: 15 }];
                                            const reason = `Manager request: balancing transfer of ${p.productName} from overstock.`;
                                            createStockTransfer(eb.branchId, recipient.id, 'Redistribution', items, reason);
                                            showToastMsg(`BALANCING: Sent request to transfer 15 units from ${donor?.name}.`, 'success');
                                          }}
                                          className="w-full py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 rounded-md text-[9.5px] uppercase transition-all"
                                        >
                                          Pull balancing stock transfer from {donor?.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-[10.5px] text-zinc-500 py-1 font-sans italic border border-m3-outline-variant/10 rounded bg-m3-surface-low">
                                Restricted: Restocking requires Manager or Admin clearance.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <button onClick={() => onNavigate('inventory')} className="m3-btn-tonal w-full mt-4 justify-center">
              Open Complete Inventory Ledger <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Priority 3: Company-wide Revenue Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Weekly Sales Bar Chart */}
          <div className="m3-card shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-m3-primary flex items-center gap-1.5">
                    Weekly Corporate Sales Trend
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-m3-on-surface-variant font-mono mt-0.5">
                    Regional transactions filtered by active metrics
                  </p>
                </div>
                
                {/* Metric Selector Pills */}
                <div className="flex bg-zinc-805/90 p-0.5 rounded-xl border border-m3-outline-variant/20 self-start sm:self-auto">
                  <button 
                    onClick={() => { setWeeklyMetric('revenue'); setSelectedWeeklyDay(null); }} 
                    className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-all ${weeklyMetric === 'revenue' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    ₱ Revenue
                  </button>
                  <button 
                    onClick={() => { setWeeklyMetric('orders'); setSelectedWeeklyDay(null); }} 
                    className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-all ${weeklyMetric === 'orders' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Orders
                  </button>
                  <button 
                    onClick={() => { setWeeklyMetric('boxes'); setSelectedWeeklyDay(null); }} 
                    className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition-all ${weeklyMetric === 'boxes' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Units Box
                  </button>
                </div>
              </div>

              {/* Day simulated overlay helper */}
              <div className="p-2 border border-m3-outline-variant/15 rounded-xl bg-m3-surface-low/50 text-[10.5px] text-m3-on-surface-variant leading-normal flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-m3-primary">•</span>
                <span>
                  {simulationModeActive 
                    ? "Select a day below to simulate a high-value bulk transaction in real-time."
                    : "Select a day below to examine that day's specific transactional volume."
                  }
                </span>
              </div>

              <div className="relative h-56 w-full flex items-end pt-4 pb-2">
                <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[9px] text-m3-on-surface-variant font-mono pointer-events-none select-none">
                  <span>
                    {weeklyMetric === 'revenue' ? `₱${maxWeeklyAmount.toLocaleString()}` : weeklyMetric === 'orders' ? `${maxWeeklyAmount} POs` : `${maxWeeklyAmount} Boxes`}
                  </span>
                  <span>
                    {weeklyMetric === 'revenue' ? `₱${Math.round(maxWeeklyAmount * 0.5).toLocaleString()}` : weeklyMetric === 'orders' ? `${Math.round(maxWeeklyAmount * 0.5)} POs` : `${Math.round(maxWeeklyAmount * 0.5)} Boxes`}
                  </span>
                  <span>0</span>
                </div>

                <div className="pl-14 w-full h-full flex justify-between items-end gap-3 z-10">
                  {weeklyChartData.map((data, index) => {
                    const heightPercent = maxWeeklyAmount ? (data.amount / maxWeeklyAmount) * 80 : 10;
                    const isSelected = selectedWeeklyDay === index;

                    return (
                      <div 
                        key={index} 
                        onClick={() => setSelectedWeeklyDay(isSelected ? null : index)}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      >
                        <div
                          onMouseEnter={() => setHoveredBar(index)}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{ height: `${Math.max(5, heightPercent)}%` }}
                          className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                            isSelected 
                              ? 'bg-emerald-500 shadow-lg ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-zinc-900' 
                              : hoveredBar === index
                              ? 'bg-m3-tertiary shadow-md'
                              : 'bg-m3-primary/85 hover:bg-m3-primary'
                          }`}
                        />
                        
                        {/* Hover Popup Tooltip */}
                        <div className={`absolute bottom-full mb-3 bg-zinc-950/95 text-white text-[10px] py-1.5 px-2.5 rounded-xl border border-m3-outline-variant/35 font-bold font-mono shadow-2xl pointer-events-none transition-all duration-200 z-35 flex flex-col gap-0.5 items-center ${
                          hoveredBar === index ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}>
                          <span className="text-[9px] text-zinc-400 font-sans">{data.day} Value:</span>
                          <span className="text-emerald-400 font-black">
                            {weeklyMetric === 'revenue' ? `₱${data.amount.toLocaleString()}` : weeklyMetric === 'orders' ? `${data.amount} Orders` : `${data.amount} Boxes Sold`}
                          </span>
                        </div>

                        <span className={`text-[9.5px] font-mono mt-2 transition-colors ${isSelected ? 'text-emerald-400 font-black' : 'text-m3-on-surface-variant/80'}`}>{data.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Monthly Revenue Wave Chart */}
          <div className="m3-card shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-m3-primary flex items-center gap-1.5">
                    6-Month Enterprise Revenue Wave
                  </h3>
                  <p className="text-[11px] text-m3-on-surface-variant font-mono mt-0.5">
                    Spline curve forecasting & growth indexes
                  </p>
                </div>

                {/* Line Spline step toggle buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex bg-zinc-805/90 p-0.5 rounded-xl border border-m3-outline-variant/20">
                    <button 
                      onClick={() => setWaveStyle('spline')} 
                      className={`p-1.5 rounded-lg text-[10px] uppercase font-mono font-bold transition-all ${waveStyle === 'spline' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Smooth Spline Curves"
                    >
                      Spline
                    </button>
                    <button 
                      onClick={() => setWaveStyle('linear')} 
                      className={`p-1.5 rounded-lg text-[10px] uppercase font-mono font-bold transition-all ${waveStyle === 'linear' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Linear Angles"
                    >
                      Linear
                    </button>
                    <button 
                      onClick={() => setWaveStyle('step')} 
                      className={`p-1.5 rounded-lg text-[10px] uppercase font-mono font-bold transition-all ${waveStyle === 'step' ? 'bg-m3-primary text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                      title="Step Intersect blocks"
                    >
                      Step
                    </button>
                  </div>

                  {/* Future Forecast Toggle */}
                  <label className="flex items-center gap-1.5 bg-zinc-805/90 px-2 py-1 border border-m3-outline-variant/20 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={forecastEnabled}
                      onChange={(e) => {
                        setForecastEnabled(e.target.checked);
                        showToastMsg(e.target.checked ? 'Exponential trend forecasting model overlay enabled!' : 'Extended forecasting deactivated.', 'info');
                      }}
                      className="accent-m3-primary rounded cursor-pointer h-3.5 w-3.5" 
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-300">Forecast +3m</span>
                  </label>
                </div>
              </div>

              {/* Company KPI Header Tagline */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-m3-tertiary-container/30 border border-m3-outline-variant/15 text-[10.5px] tracking-normal mb-3">
                <span className="text-zinc-300 font-medium">Enterprise Growth Multiplier:</span>
                <span className="font-extrabold text-m3-tertiary flex items-center gap-0.5 font-mono">
                  <TrendingUp className="h-3 w-3 animate-pulse" /> +14.5% Growth Profile
                </span>
              </div>

              <div className="relative h-56 w-full pt-4">
                <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[9px] text-m3-on-surface-variant font-mono pointer-events-none select-none">
                  <span>₱{maxMonthlyAmount.toLocaleString(undefined, { notation: 'compact' })}</span>
                  <span>₱{Math.round(maxMonthlyAmount * 0.5).toLocaleString(undefined, { notation: 'compact' })}</span>
                  <span>0</span>
                </div>

                <div className="ml-14 h-40 relative border-b border-m3-outline-variant/20">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 560 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="adminWaveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--m3-primary)" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="var(--m3-primary)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="forecastingStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--m3-primary)" />
                        <stop offset="60%" stopColor="var(--m3-primary)" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    <line x1="0" y1="100" x2="560" y2="100" stroke="var(--m3-outline-variant)" strokeOpacity="0.15" strokeDasharray="3,3" />
                    <line x1="0" y1="20" x2="560" y2="20" stroke="var(--m3-outline-variant)" strokeOpacity="0.15" strokeDasharray="3,3" />

                    {/* Corporate Aggregated Wave Area */}
                    <path
                      d={svgPaths.areaD}
                      fill="url(#adminWaveGrad)"
                    />

                    {/* Stroke Outline Line */}
                    <path
                      d={svgPaths.lineD}
                      fill="none"
                      stroke={forecastEnabled ? "url(#forecastingStrokeGrad)" : "var(--m3-primary)"}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Dynamic Dots render */}
                    {svgPaths.points.map((pt, idx) => (
                      <g key={idx} className="cursor-pointer">
                        <circle
                          cx={pt.cx}
                          cy={pt.cy}
                          r={selectedForecastMonth === idx ? "7" : "5"}
                          fill={pt.isPredicted ? "#10b981" : hoveredPoint === idx ? "var(--m3-tertiary)" : "var(--m3-primary)"}
                          stroke="#FFF"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredPoint(idx)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={() => {
                            setSelectedForecastMonth(selectedForecastMonth === idx ? null : idx);
                            showToastMsg(`Drilled down details for ${pt.month}: ₱${pt.revenue.toLocaleString()} model projections.`, 'info');
                          }}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Horizontal visual Month axis tags */}
                  <div className="absolute w-full top-full pt-1.5 flex justify-between text-[9px] font-mono font-bold text-m3-on-surface-variant/80">
                    {monthlyChartData.map((d, i) => (
                      <span 
                        key={i} 
                        onClick={() => setSelectedForecastMonth(selectedForecastMonth === i ? null : i)}
                        className={`w-12 text-center cursor-pointer transition-colors ${d.isPredicted ? 'text-emerald-400 font-extrabold' : 'hover:text-white'}`}
                      >
                        {d.month}
                      </span>
                    ))}
                  </div>

                  {/* Dynamic Tooltip on Hover points */}
                  {hoveredPoint !== null && svgPaths.points[hoveredPoint] && (
                    <div
                      className="absolute bg-zinc-950 text-white text-[10px] py-1.5 px-3 rounded-xl border border-m3-outline-variant/35 font-bold font-mono shadow-2xl z-40 pointer-events-none flex flex-col gap-0.5 items-center animate-fade-in"
                      style={{
                        left: `${svgPaths.points[hoveredPoint].cx - 30}px`,
                        top: `${svgPaths.points[hoveredPoint].cy - 48}px`
                      }}
                    >
                      <span className="text-[8.5px] text-zinc-400">{monthlyChartData[hoveredPoint].month}</span>
                      <span className="text-m3-tertiary font-black">₱{monthlyChartData[hoveredPoint].revenue.toLocaleString()}</span>
                      {monthlyChartData[hoveredPoint].isPredicted && (
                        <span className="text-[8px] text-emerald-400 font-bold tracking-wider uppercase mt-0.5">Estimated Forecast</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drilldown Forecast details overlay and insight blocks */}
            {selectedForecastMonth !== null && monthlyChartData[selectedForecastMonth] && (
              <div className="p-3 bg-zinc-800/60 border border-m3-outline-variant/20 rounded-2xl animate-fade-in flex flex-col mt-4 select-none shrink-0">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-m3-primary font-bold">Month Insight Summary ({monthlyChartData[selectedForecastMonth].month})</span>
                  <button onClick={() => setSelectedForecastMonth(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-m3-outline-variant/15">
                    <span className="text-[9px] text-zinc-400 block uppercase">Simulated Status:</span>
                    <span className="text-[11px] font-black text-white mt-1 block">
                      {monthlyChartData[selectedForecastMonth].isPredicted ? "ESTIMATION" : "HISTORIC"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-m3-outline-variant/15">
                    <span className="text-[9px] text-zinc-400 block uppercase">Projected Value:</span>
                    <span className="text-[11px] font-black text-emerald-400 mt-1 block">
                      ₱{monthlyChartData[selectedForecastMonth].revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-m3-outline-variant/15">
                    <span className="text-[9px] text-zinc-400 block uppercase">Weight factor:</span>
                    <span className="text-[11px] font-black text-white mt-1 block">
                      {monthlyChartData[selectedForecastMonth].isPredicted ? "ARIMA EXP" : "HQ LEDGER"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Priority 3: Procurement & Tile Aging Canditates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Tile movement aging & Pull out suggestions candidates */}
          <div className="lg:col-span-8 m3-card shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-m3-primary flex items-center gap-1.5">
                    <History className="h-5 w-5 text-m3-primary" /> Inventory Aging & Redistribution Suggestion Feed
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant font-mono">Slow-moving tiles candidates targeted for reallocation</p>
                </div>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  Prevent Dead Stock
                </span>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-bold">
                      <th className="py-2">Tile Product</th>
                      <th className="py-2">Branch Assignment</th>
                      <th className="py-2 text-center">Days Unsold</th>
                      <th className="py-2 text-center">Threat Level</th>
                      <th className="py-2 text-right">Corporate Suggestion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-m3-outline-variant/10">
                    {slowMovingCandidates.map((cand, idx) => (
                      <tr key={idx} className="hover:bg-m3-primary/5 transition-colors">
                        <td className="py-3">
                          <div className="font-extrabold text-m3-on-surface leading-tight">{cand.productName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Code Segment: {cand.productId}</div>
                        </td>
                        <td className="py-3 font-semibold text-m3-on-surface-variant">
                          {cand.branchName}
                        </td>
                        <td className="py-3 text-center font-mono font-black text-rose-400">
                          {cand.daysUnsold} Days
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-black font-mono uppercase ${
                            cand.riskLevel === 'HIGH' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          }`}>
                            {cand.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-emerald-400 font-mono italic">{cand.suggestedAction}</span>
                            <button
                              onClick={() => handleExecuteRedistribution(cand)}
                              className="px-2.5 py-1 bg-m3-primary hover:bg-m3-primary/8 font-bold text-[9px] uppercase tracking-wider text-m3-on-primary rounded-lg transition-all cursor-pointer active:scale-95"
                            >
                              Confirm Redistribution Flow
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10.5px] text-zinc-400 mt-4 pl-1 font-mono italic">
              *AI Model monitors slow stock sales profiles over 90 days to release dynamic pull out proposals.
            </p>
          </div>

          {/* Procurement Overview Mini-Card widget */}
          <div className="lg:col-span-4 m3-card shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-m3-on-primary-container uppercase tracking-wider flex items-center gap-1.5 mb-1 bg-m3-primary-container p-3 rounded-t-2xl -mx-6 -mt-6">
                <ClipboardList className="h-4.5 w-4.5 text-m3-on-primary-container" /> Supply Procurement Pipeline
              </h3>
              <p className="text-xs text-m3-on-surface-variant mt-4 mb-4">Manufacturer connections & incoming inventory purchase ledgers</p>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-3 rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 text-left font-mono">
                  <span className="text-[9.5px] text-zinc-400 block font-bold">PENDING POs</span>
                  <div className="text-xl font-black text-m3-primary mt-1">
                    {purchaseOrders.filter(po => po.status === 'Pending').length || 1}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 text-left font-mono">
                  <span className="text-[9.5px] text-zinc-400 block font-bold">RECEIVING TODAY</span>
                  <div className="text-xl font-black text-emerald-500 mt-1">4 Orders</div>
                </div>

                <div className="p-3 rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 text-left font-mono">
                  <span className="text-[9.5px] text-zinc-400 block font-bold">ACTIVE SUPPLIERS</span>
                  <div className="text-xl font-black text-amber-500 mt-1">
                    {suppliers ? suppliers.filter(s => !s.isDeleted).length : 5}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-m3-surface-low border border-m3-outline-variant/30 text-left font-mono">
                  <span className="text-[9.5px] text-zinc-400 block font-bold">OPEN ORDERS</span>
                  <div className="text-xl font-black text-sky-500 mt-1">
                    {purchaseOrders.filter(po => po.status === 'Ordered').length || 2}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => onNavigate('procurement')} className="m3-btn-tonal w-full mt-6 justify-center">
              Requisition Purchase Logistics <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Priority 4: Dynamic Admin Audit Logs Ledger Activity tracker */}
        <div className="m3-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-m3-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-m3-primary" /> Global Enterprise Security Audit Stream
              </h3>
              <p className="text-xs text-m3-on-surface-variant">Live audit ledger tracking voided sales, manager code approvals and system activities</p>
            </div>
            <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded-md uppercase font-black">
              Corporate Monitoring Authorized
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {auditLogs.slice(0, 12).map((log, idx) => {
              const isDanger = log.action.includes('VOID') || log.action.includes('DELETE') || log.action.includes('REJECT');
              const isSuccess = log.action.includes('APPROVE') || log.action.includes('RECEIVE') || log.action.includes('SUCCESS');
              const isInfo = log.action.includes('LOGIN') || log.action.includes('CREATE') || log.action.includes('UPDATE');
              
              return (
                <div key={idx} className="flex justify-between items-start text-xs border-b border-m3-outline-variant/10 pb-2.5 last:border-0 last:pb-0 hover:bg-m3-surface-low rounded p-1 transition-colors">
                  <div className="space-y-1 pr-4">
                    <span className={`text-[9.5px] uppercase tracking-wider font-bold inline-block px-2.5 py-0.5 rounded font-mono border ${
                      isDanger 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : isSuccess 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-m3-on-surface font-medium block leading-snug">{log.description}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono pl-1">
                      <span className="hidden sm:inline">Target Record: {log.tableAffected} ({log.recordId || 'Global'}) • </span>Operator: @{log.username}
                    </span>
                  </div>
                  <div className="text-right text-[10.5px] text-zinc-400 font-mono shrink-0 ml-4">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}

            {auditLogs.length === 0 && (
              <div className="text-center py-6 text-xs text-m3-on-surface-variant">No system operations tracked yet.</div>
            )}
          </div>
        </div>

          </>
        )}

      </div>
    );
  }

  /*****************************************************************************
   * 2. BRANCH MANAGER & CASHIER PORTAL SUB-DASHBOARDS
   *****************************************************************************/
  return (
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      
      {/* Dynamic Toast feedback panel */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-slide-left ${
          toast.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : toast.type === 'error' 
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        }`}>
          <Activity className="h-5 w-5 animate-pulse shrink-0" />
          <span className="text-xs font-bold leading-tight">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-m3-on-surface/10 rounded-lg text-current">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* simulated branch roles instruction banner */}
      <div className="android-glass border border-m3-outline-variant/30 rounded-[24px] p-6 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-12">
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-m3-primary/10 text-m3-primary px-3 py-1 rounded-lg border border-m3-primary/20 font-mono font-black uppercase tracking-widest">
              Duty Directive
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-m3-on-surface-variant font-mono">Active Store Dashboard Context</span>
          </div>
          
          <div className="animate-fade-in mt-3">
            <h2 className="text-xl font-extrabold tracking-tight text-m3-primary">Welcome, {currentUser.fullName}</h2>
            <p className="text-xs text-m3-on-surface-variant leading-relaxed mt-1">
              You are signed in as the <span className="font-extrabold text-m3-primary">{currentUser.role}</span> for <span className="font-extrabold">{getBranchName(currentUser.branchAssignmentId)}</span>. 
              Review local store parameters, handle shift operations, process customer checkout baskets, or perform inventory checkouts below.
            </p>
            
            {/* Quick tabs router based on branch role clearances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              {currentUser.role !== UserRole.CASHIER && (
                <button onClick={() => onNavigate('inventory')} className="p-2.5 text-left text-xs bg-m3-surface-low rounded-xl border border-m3-outline-variant/35 hover:bg-m3-primary/10 hover:text-m3-primary transition-all flex justify-between items-center cursor-pointer">
                  <span className="font-bold">Verify Branch Stock levels</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                </button>
              )}
              <button onClick={() => onNavigate('pos')} className="p-2.5 text-left text-xs bg-m3-surface-low rounded-xl border border-m3-outline-variant/35 hover:bg-m3-primary/10 hover:text-m3-primary transition-all flex justify-between items-center cursor-pointer">
                <span className="font-bold">Point-of-Sale Checkout</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </button>
              <button onClick={() => onNavigate('shift')} className="p-2.5 text-left text-xs bg-m3-surface-low rounded-xl border border-m3-outline-variant/35 hover:bg-m3-primary/10 hover:text-m3-primary transition-all flex justify-between items-center cursor-pointer">
                <span className="font-bold">Cashier Shift Drawers</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Low & Critical alerts banner */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockProducts.length > 0 && (
            <div className="bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/20 dark:border-rose-500/10 border-l-4 border-l-rose-600 dark:border-l-rose-400 p-5 rounded-[24px] rounded-l-none flex items-start gap-4 shadow-md duration-250 hover:shadow-lg transition-all">
              <XCircle className="text-rose-600 dark:text-rose-400 h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-rose-800 dark:text-rose-200">Out of Stock Alert</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1.5 leading-relaxed font-semibold">
                  There are <span className="font-extrabold text-rose-900 dark:text-white bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.5 rounded-md">{outOfStockProducts.length}</span> items completely depleted in local store records.
                </p>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="mt-3 text-xs font-bold text-rose-800 dark:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer text-left border-0 bg-transparent p-0"
                >
                  View depleted items <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-500/10 border-l-4 border-l-amber-600 dark:border-l-amber-400 p-5 rounded-[24px] rounded-l-none flex items-start gap-4 shadow-md duration-250 hover:shadow-lg transition-all">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-200">Low Stock Alert</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 leading-relaxed font-semibold">
                  Local stock for <span className="font-extrabold text-amber-900 dark:text-white bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md">{lowStockProducts.length}</span> items have fallen below safety limits. Restock required.
                </p>
                <button
                  onClick={() => onNavigate('procurement')}
                  className="mt-3 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer text-left border-0 bg-transparent p-0"
                >
                  Create purchase order <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-sm transition-all hover:bg-m3-surface-low duration-250 bg-m3-surface-low text-m3-on-surface glowing-card">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant/75">Total Products</span>
            <div className="text-3xl font-black mt-1.5 tracking-tight text-m3-primary">{stats.totalProducts}</div>
            <div className="text-[10px] text-m3-on-surface-variant/80 mt-1 font-mono">{stats.totalCategories} Categories</div>
          </div>
          <div className="p-3 rounded-2xl bg-m3-primary/10 text-m3-primary m3-shape-asymmetric shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-sm transition-all hover:bg-m3-surface-low duration-250 bg-m3-surface-low text-m3-on-surface glowing-card">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant/75">Today's Sales</span>
            <div className="text-2xl font-black mt-1.5 tracking-tight text-m3-tertiary">
              ₱{stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-m3-on-surface-variant/80 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-m3-tertiary animate-pulse" />
              <span>Shift active orders</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-m3-tertiary/10 text-m3-tertiary m3-shape-asymmetric shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-sm transition-all hover:bg-m3-surface-low duration-250 bg-m3-surface-low text-m3-on-surface glowing-card">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant/75">Monthly Revenue</span>
            <div className="text-2xl font-black mt-1.5 tracking-tight text-m3-primary">
              ₱{stats.monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-m3-on-surface-variant/80 mt-1">Target ₱2.0M • Local hub</div>
          </div>
          <div className="p-3 rounded-2xl bg-m3-secondary-container text-m3-on-secondary-container m3-shape-asymmetric shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-[24px] border border-m3-outline-variant/35 flex items-center justify-between shadow-sm transition-all hover:bg-m3-surface-low duration-250 bg-m3-surface-low text-m3-on-surface glowing-card">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant/75">Operational Health</span>
            <div className="text-2xl font-black mt-1.5 tracking-tight flex items-center gap-1">
              <span className="text-m3-primary">{stats.outOfStockCount}</span>
              <span className="text-m3-outline-variant/60 font-medium">/</span>
              <span className="text-m3-secondary">{stats.lowStockCount}</span>
            </div>
            <div className="text-[10px] text-m3-on-surface-variant/80 mt-1">Local shortages alert count</div>
          </div>
          <div className="p-3 rounded-2xl bg-m3-primary/10 text-m3-primary m3-shape-asymmetric shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly sales bar chart */}
        <div className="m3-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-m3-primary">Weekly Sales Trend</h3>
              <p className="text-xs text-m3-on-surface-variant">Sales count value per day (PHP)</p>
            </div>
            <span className="bg-m3-primary-container text-m3-on-primary-container font-mono px-3 py-1 rounded-full text-[11px] font-bold border border-m3-outline-variant/30">
              ₱{stats.weeklySales.toLocaleString(undefined, { maximumFractionDigits: 0 })} Total
            </span>
          </div>

          <div className="relative h-64 w-full flex items-end pt-4 pb-2">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-m3-on-surface-variant font-mono pointer-events-none">
              <span>₱{(maxWeeklyAmount).toLocaleString()}</span>
              <span>₱{(maxWeeklyAmount * 0.5).toLocaleString()}</span>
              <span>₱0</span>
            </div>

            <div className="pl-14 w-full h-full flex justify-between items-end gap-3 z-10">
              {weeklyChartData.map((data, index) => {
                const heightPercent = maxWeeklyAmount ? (data.amount / maxWeeklyAmount) * 85 : 10;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 cursor-pointer ${
                        hoveredBar === index
                          ? 'bg-m3-tertiary shadow-md shadow-m3-tertiary/20'
                          : 'bg-m3-primary'
                      }`}
                    />
                    <div className={`absolute bottom-full mb-2 bg-m3-on-surface text-m3-surface text-[10.5px] py-1.5 px-3 rounded-xl border border-m3-outline-variant/30 font-bold font-mono shadow-lg pointer-events-none transition-opacity duration-200 z-35 ${
                      hoveredBar === index ? 'opacity-100' : 'opacity-0'
                    }`}>
                      ₱{data.amount.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-m3-on-surface-variant/80 mt-2">{data.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Monthly revenue wave line chart */}
        <div className="m3-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-m3-primary">6-Month Revenue Progress</h3>
              <p className="text-xs text-m3-on-surface-variant">Local branch aggregate progression (PHP)</p>
            </div>
            <span className="text-xs font-bold text-m3-tertiary flex items-center gap-1 bg-m3-tertiary-container text-m3-on-tertiary-container px-3 py-1.5 rounded-full border border-m3-outline-variant/20">
              <TrendingUp className="h-3 w-3" /> Up 14.5% vs Q1
            </span>
          </div>

          <div className="relative h-64 w-full pt-4">
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-m3-on-surface-variant font-mono pointer-events-none">
              <span>₱{(maxMonthlyAmount).toLocaleString(undefined, { notation: 'compact' })}</span>
              <span>₱{(maxMonthlyAmount * 0.5).toLocaleString(undefined, { notation: 'compact' })}</span>
              <span>₱0</span>
            </div>

            <div className="ml-12 h-44 relative border-b border-m3-outline-variant/30">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="localWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--m3-primary)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--m3-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="100" x2="600" y2="100" stroke="var(--m3-outline-variant)" strokeOpacity="0.3" strokeDasharray="3,3" />
                <line x1="0" y1="20" x2="600" y2="20" stroke="var(--m3-outline-variant)" strokeOpacity="0.3" strokeDasharray="3,3" />

                <path
                  d={`M 20 200 
                      L 20 ${200 - getMonthlyRatio(monthlyChartData[0].revenue) * 160} 
                      C 70 ${200 - getMonthlyRatio(monthlyChartData[0].revenue) * 160}, 90 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}, 130 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}
                      C 180 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}, 200 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}, 240 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}
                      C 290 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}, 310 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}, 350 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}
                      C 400 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}, 420 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}, 460 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}
                      C 510 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}, 530 ${200 - getMonthlyRatio(monthlyChartData[5].revenue) * 160}, 570 ${200 - getMonthlyRatio(monthlyChartData[5].revenue) * 160}
                      L 570 200 Z`}
                  fill="url(#localWaveGrad)"
                />

                <path
                  d={`M 20 ${200 - getMonthlyRatio(monthlyChartData[0].revenue) * 160} 
                      C 70 ${200 - getMonthlyRatio(monthlyChartData[0].revenue) * 160}, 90 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}, 130 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}
                      C 180 ${200 - getMonthlyRatio(monthlyChartData[1].revenue) * 160}, 200 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}, 240 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}
                      C 290 ${200 - getMonthlyRatio(monthlyChartData[2].revenue) * 160}, 310 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}, 350 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}
                      C 400 ${200 - getMonthlyRatio(monthlyChartData[3].revenue) * 160}, 420 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}, 460 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}
                      C 510 ${200 - getMonthlyRatio(monthlyChartData[4].revenue) * 160}, 530 ${200 - getMonthlyRatio(monthlyChartData[5].revenue) * 160}, 570 ${200 - getMonthlyRatio(monthlyChartData[5].revenue) * 160}`}
                  fill="none"
                  stroke="var(--m3-primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {[[20, 0], [130, 1], [240, 2], [350, 3], [460, 4], [570, 5]].map(([cx, idx]) => {
                  const val = monthlyChartData[idx].revenue;
                  const cy = 200 - getMonthlyRatio(val) * 160;
                  return (
                    <g key={idx} className="cursor-pointer">
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill={hoveredPoint === idx ? "var(--m3-tertiary)" : "var(--m3-primary)"}
                        stroke="#FFF"
                        strokeWidth="2"
                        onMouseEnter={() => setHoveredPoint(idx)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="absolute w-full top-full pt-2 flex justify-between text-[10px] font-semibold text-m3-on-surface-variant/80">
                {monthlyChartData.map((d, i) => (
                  <span key={i} className="w-12 text-center">{d.month}</span>
                ))}
              </div>

              {hoveredPoint !== null && (
                <div
                  className="absolute bg-m3-on-surface text-m3-surface text-[10.5px] py-1.5 px-3 rounded-xl border border-m3-outline-variant/30 font-bold font-mono shadow-lg z-40 pointer-events-none"
                  style={{
                    left: `${[20, 130, 240, 350, 460, 570][hoveredPoint] - 30}px`,
                    top: `${130 - getMonthlyRatio(monthlyChartData[hoveredPoint].revenue) * 130}px`
                  }}
                >
                  ₱{monthlyChartData[hoveredPoint].revenue.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Grid of Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Categories Breakdown */}
        <div className="m3-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4" /> Item Category Diversity
            </h3>
            <p className="text-xs text-m3-on-surface-variant mb-4">Leading local stock classifications</p>

            <div className="space-y-3.5">
              {topCategories.map((cat, idx) => {
                const colors = ['bg-m3-primary', 'bg-m3-tertiary', 'bg-m3-secondary', 'bg-m3-primary/70'];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{cat.name}</span>
                      <span className="font-mono text-m3-on-surface-variant">{cat.count} lines</span>
                    </div>
                    <div className="w-full bg-m3-outline-variant/20 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[idx % 4]} rounded-full`}
                        style={{ width: `${Math.min(100, (Number(cat.count) / Number(stats.totalProducts)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('inventory')}
            className="m3-btn-tonal w-full mt-6 justify-center animate-pulse"
          >
            Verify Product Catalog <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Recent Transactions Widget */}
        <div className="m3-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4" /> Recent Branch sales
            </h3>
            <p className="text-xs text-m3-on-surface-variant mb-4">Latest checkout invoices saved</p>

            <div className="space-y-3">
              {filteredSales.slice(0, 4).map((sale, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-m3-outline-variant/10 last:border-0 hover:bg-m3-surface-low rounded px-1.5 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-m3-on-surface">{sale.customerName}</div>
                    <div className="text-[10px] text-m3-on-surface-variant/80 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-m3-primary">{sale.saleNumber}</span>
                      <span>•</span>
                      <span>{sale.cashierName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-m3-tertiary">₱{sale.grandTotal.toFixed(2)}</div>
                    <span className="text-[9px] bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant/20 px-2 py-0.5 rounded-full font-bold">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}

              {filteredSales.length === 0 && (
                <div className="text-center py-6 text-xs text-m3-on-surface-variant">No transactions details of today yet.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('pos')}
            className="m3-btn-tonal w-full mt-4 justify-center"
          >
            Open Cashier POS <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Procurement Pipeline */}
        <div className="m3-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-m3-primary flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4" /> Procurement pipeline
            </h3>
            <p className="text-xs text-m3-on-surface-variant mb-4">Local purchase orders pending delivery</p>

            <div className="space-y-3">
              {pendingOrders.slice(0, 4).map((po, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-m3-outline-variant/10 last:border-0">
                  <div>
                    <div className="text-xs font-bold font-mono text-m3-on-surface">{po.poNumber}</div>
                    <div className="text-[10px] text-m3-on-surface-variant/80 mt-0.5">
                      Requested by: {po.requestedBy}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                    po.status === 'Pending'
                      ? 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/30'
                      : 'bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/30'
                  }`}>
                    {po.status}
                  </span>
                </div>
              ))}

              {pendingOrders.length === 0 && (
                <div className="text-center py-6 text-xs text-m3-on-surface-variant flex flex-col items-center gap-2">
                  <Package className="h-6 w-6 text-m3-outline-variant" />
                  No pending supplier cargo deliveries.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('procurement')}
            className="m3-btn-tonal w-full mt-4 justify-center"
          >
            Review PO List <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

      {/* Inventory Aging & Redistribution Suggestion Feed & Global Enterprise Security Audit Stream */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Tile movement aging & Pull out suggestions candidates */}
        <div className="m3-card shadow-sm flex flex-col justify-between animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-m3-primary flex items-center gap-1.5">
                  <History className="h-5 w-5 text-m3-primary" /> Inventory Aging & Redistribution Suggestion Feed
                </h3>
                <p className="text-xs text-m3-on-surface-variant font-mono">Slow-moving tiles candidates targeted for reallocation</p>
              </div>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                Prevent Dead Stock
              </span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-bold">
                    <th className="py-2">Tile Product</th>
                    <th className="py-2">Branch Assignment</th>
                    <th className="py-2 text-center">Days Unsold</th>
                    <th className="py-2 text-center">Threat Level</th>
                    <th className="py-2 text-right">Corporate Suggestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10">
                  {slowMovingCandidates.map((cand, idx) => (
                    <tr key={idx} className="hover:bg-m3-primary/5 transition-colors">
                      <td className="py-3">
                        <div className="font-extrabold text-m3-on-surface leading-tight">{cand.productName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Code Segment: {cand.productId}</div>
                      </td>
                      <td className="py-3 font-semibold text-m3-on-surface-variant">
                        {cand.branchName}
                      </td>
                      <td className="py-3 text-center font-mono font-black text-rose-400">
                        {cand.daysUnsold} Days
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black font-mono uppercase ${
                          cand.riskLevel === 'HIGH' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                        }`}>
                          {cand.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-emerald-400 font-mono italic">{cand.suggestedAction}</span>
                          <button
                            onClick={() => handleExecuteRedistribution(cand)}
                            className="px-2.5 py-1 bg-m3-primary hover:bg-m3-primary/8 font-bold text-[9px] uppercase tracking-wider text-m3-on-primary rounded-lg transition-all cursor-pointer active:scale-95"
                          >
                            Confirm Redistribution Flow
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10.5px] text-zinc-400 mt-4 pl-1 font-mono italic">
            *AI Model monitors slow stock sales profiles over 90 days to release dynamic pull out proposals.
          </p>
        </div>

        {/* Global Security Audit Stream */}
        <div className="m3-card shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-m3-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-m3-primary" /> Global Enterprise Security Audit Stream
              </h3>
              <p className="text-xs text-m3-on-surface-variant">Live audit ledger tracking voided sales, manager code approvals and system activities</p>
            </div>
            <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded-md uppercase font-black">
              Corporate Monitoring Authorized
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {auditLogs.slice(0, 12).map((log, idx) => {
              const isDanger = log.action.includes('VOID') || log.action.includes('DELETE') || log.action.includes('REJECT');
              const isSuccess = log.action.includes('APPROVE') || log.action.includes('RECEIVE') || log.action.includes('SUCCESS');
              const isInfo = log.action.includes('LOGIN') || log.action.includes('CREATE') || log.action.includes('UPDATE');
              
              return (
                <div key={idx} className="flex justify-between items-start text-xs border-b border-m3-outline-variant/10 pb-2.5 last:border-0 last:pb-0 hover:bg-m3-surface-low rounded p-1 transition-colors">
                  <div className="space-y-1 pr-4">
                    <span className={`text-[9.5px] uppercase tracking-wider font-bold inline-block px-2.5 py-0.5 rounded font-mono border ${
                      isDanger 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : isSuccess 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-m3-on-surface font-medium block leading-snug">{log.description}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono pl-1">
                      <span className="hidden sm:inline">Target Record: {log.tableAffected} ({log.recordId || 'Global'}) • </span>Operator: @{log.username}
                    </span>
                  </div>
                  <div className="text-right text-[10.5px] text-zinc-400 font-mono shrink-0 ml-4">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}

            {auditLogs.length === 0 && (
              <div className="text-center py-6 text-xs text-m3-on-surface-variant">No system operations tracked yet.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
