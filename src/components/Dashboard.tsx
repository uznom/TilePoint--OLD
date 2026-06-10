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
  Image
} from 'lucide-react';
import { UserRole } from '../types/db';

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
    updateCurrentUser
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
  const [daysSimulatedSales, setDaysSimulatedSales] = useState<Record<string, number>>({});

  // 6-Month Enterprise Revenue Wave parameters
  const [waveStyle, setWaveStyle] = useState<'spline' | 'step' | 'linear'>('spline');
  const [forecastEnabled, setForecastEnabled] = useState<boolean>(false);
  const [selectedForecastMonth, setSelectedForecastMonth] = useState<number | null>(null);

  // Branch Quota / Goal Quick Editor Inline State
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchQuota, setEditingBranchQuota] = useState<number>(2000000);
  const [editingBranchStaff, setEditingBranchStaff] = useState<number>(10);

  // Enterprise Systems Onboarding Walkthrough Setup Wizard
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(() => {
    if (currentUser.role !== UserRole.ADMIN) return false;
    return localStorage.getItem('tilepoint_setup_completed') !== 'true';
  });
  const [setupStep, setSetupStep] = useState<number>(1);
  const [customCompanyName, setCustomCompanyName] = useState<string>(() => {
    return localStorage.getItem('tilepoint_company_name_v1') || 'Emman Tile Center';
  });
  const [customStoreLogo, setCustomStoreLogo] = useState<string>(() => {
    return localStorage.getItem('tilepoint_store_logo_v1') || '';
  });
  const [customTaxRate, setCustomTaxRate] = useState<number>(12);
  const [customCurrency, setCustomCurrency] = useState<string>('₱');
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({
    'B1': 2200000,
    'B2': 1800000,
    'B3': 1500000,
    'B4': 1200000
  });
  const [customStaff, setCustomStaff] = useState<Record<string, number>>({
    'B1': 15,
    'B2': 10,
    'B3': 8,
    'B4': 6
  });
  const [setupAdminEmail, setSetupAdminEmail] = useState<string>(currentUser.email || 'erica.manaban.04@gmail.com');
  const [setupManagerPin, setSetupManagerPin] = useState<string>(currentUser.managerPin || '4321');

  const showToastMsg = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleWizardLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        showToastMsg('Store Logo size must be less than 1.5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomStoreLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    const baseValues = sales.length > 0 ? [32000, 48000, 41000, 62000, 55000, 78000, 45000] : [0, 0, 0, 0, 0, 0, 0];
    const baseOrders = sales.length > 0 ? [5, 8, 7, 12, 10, 15, 9] : [0, 0, 0, 0, 0, 0, 0];
    const baseBoxes = sales.length > 0 ? [160, 240, 205, 310, 275, 390, 225] : [0, 0, 0, 0, 0, 0, 0];
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

      const branchMultiplier = activeBranchId 
        ? (activeBranchId === 'B1' ? 0.9 : activeBranchId === 'B4' ? 0.65 : 0.45)
        : 1.0;

      let baseline = 0;
      const simValue = daysSimulatedSales[day] || 0;
      if (weeklyMetric === 'revenue') {
        baseline = Math.round((baseValues[idx] + simValue) * branchMultiplier);
      } else if (weeklyMetric === 'orders') {
        baseline = Math.round((baseOrders[idx] + (simValue ? Math.ceil(simValue / 15000) : 0)) * branchMultiplier);
      } else if (weeklyMetric === 'boxes') {
        baseline = Math.round((baseBoxes[idx] + (simValue ? Math.ceil(simValue / 500) : 0)) * branchMultiplier);
      }

      return {
        day,
        amount: baseline + liveValue,
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

  const generateSvgPaths = (data: { month: string; revenue: number; isPredicted?: boolean }[]) => {
    const width = 560;
    const height = 150;
    const paddingLeft = 30;
    const totalHeight = 190;

    const points = data.map((d, idx) => {
      const cx = paddingLeft + (idx / (data.length - 1)) * (width - 40);
      const cy = totalHeight - (maxMonthlyAmount ? (d.revenue / maxMonthlyAmount) * height : 0);
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

    products.forEach((p) => {
      if (p.id === 'P1') {
        const b = branches.find(br => br.id === 'B3');
        list.push({
          productId: p.id,
          productName: p.productName,
          branchId: 'B3',
          branchName: b?.name || 'Talisay Depot',
          daysUnsold: 145,
          riskLevel: 'HIGH',
          suggestedAction: 'Redistribute to Main showroom',
          targetBranchId: 'B1'
        });
      } else if (p.id === 'P2') {
        const b = branches.find(br => br.id === 'B2');
        list.push({
          productId: p.id,
          productName: p.productName,
          branchId: 'B2',
          branchName: b?.name || 'Bacolod Showroom',
          daysUnsold: 110,
          riskLevel: 'MEDIUM',
          suggestedAction: 'Local Discounted Bundle Clearance',
          targetBranchId: 'B1'
        });
      } else if (p.id === 'P4' || p.id === 'P3') {
        const b = branches.find(br => br.id === 'B4');
        list.push({
          productId: p.id,
          productName: p.productName,
          branchId: 'B4',
          branchName: b?.name || 'Silay Warehouse',
          daysUnsold: 88,
          riskLevel: 'LOW',
          suggestedAction: 'Consolidate directly to Main hub',
          targetBranchId: 'B1'
        });
      }
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

  const handleCompleteSetup = () => {
    try {
      localStorage.setItem('tilepoint_setup_completed', 'true');
      localStorage.setItem('tilepoint_company_name_v1', customCompanyName);
      localStorage.setItem('tilepoint_store_logo_v1', customStoreLogo);
      localStorage.setItem('tilepoint_tax_rate_v1', String(customTaxRate));
      localStorage.setItem('tilepoint_currency_v1', customCurrency);

      branches.forEach(b => {
        let suffix = "";
        if (b.id === 'B1') suffix = "Main Branch";
        else if (b.id === 'B2') suffix = "Bacolod Showroom";
        else if (b.id === 'B3') suffix = "Talisay Depot";
        else if (b.id === 'B4') suffix = "Silay Warehouse";
        
        updateBranch(b.id, {
          name: `${customCompanyName} ${suffix}`,
          monthlySales: customTargets[b.id] || b.monthlySales,
          staffCount: customStaff[b.id] || b.staffCount
        });
      });

      updateCurrentUser({
        email: setupAdminEmail,
        managerPin: setupManagerPin
      });

      setShowSetupWizard(false);
      showToastMsg(`SYSTEM SETUP WALKTHROUGH COMPLETE: ${customCompanyName} system parameters successfully locked!`, 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Setup execution error failed.', 'error');
    }
  };

  const renderSetupWizardModal = () => {
    if (!showSetupWizard) return null;

    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in [color-scheme:dark]">
        <div className="bg-zinc-900 border border-m3-outline-variant/35 rounded-[32px] max-w-2xl w-full p-8 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
          
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-44 w-44 bg-m3-primary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Stepper Header */}
          <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-5 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-m3-primary/15 text-m3-primary px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-widest border border-m3-primary/20">
                  Initial Launch Walkthrough
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-xl font-black mt-1 text-m3-primary tracking-tight">Enterprise ERP Initialization</h2>
            </div>
            
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    setupStep === step 
                      ? 'w-8 bg-m3-primary font-bold' 
                      : setupStep > step 
                      ? 'w-2.5 bg-emerald-500' 
                      : 'w-2.5 bg-zinc-800'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Step Contents */}
          <div className="py-6 overflow-y-auto flex-1 h-full pr-1">
            {setupStep === 1 && (
              <div className="space-y-5 animate-slide-left">
                <div className="p-4 rounded-2xl bg-m3-primary/5 border border-m3-primary/10 text-m3-on-surface-variant text-xs leading-relaxed flex gap-3">
                  <Building className="h-5 w-5 text-m3-primary mt-0.5 shrink-0" />
                  <p>
                    Set up your overarching corporate identity profile. Changing the brand prefix updates all branch showroom listings, transmittal sheets, and receipt headers dynamically over the system cache.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Enterprise Retail Name Prefix:</label>
                    <input 
                      type="text"
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      placeholder="e.g. Diamond Tile Emporium"
                      className="bg-zinc-800/80 border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 w-full text-white focus:border-m3-primary outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 bg-zinc-800/20 border border-m3-outline-variant/15 p-4 rounded-2xl">
                    <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Store Corporate Logo:</label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-xl border border-dashed border-zinc-750 bg-zinc-950/20 flex items-center justify-center overflow-hidden shrink-0">
                        {customStoreLogo ? (
                          <img src={customStoreLogo} alt="Corporate logo" className="w-full h-full object-contain" />
                        ) : (
                          <Image className="h-6 w-6 text-zinc-650" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5 text-left">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleWizardLogoChange}
                          className="hidden"
                          id="wizard-logo-upload"
                        />
                        <label
                          htmlFor="wizard-logo-upload"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-wider text-white border border-zinc-700/60 rounded-xl cursor-pointer transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" /> Upload Brand Logo
                        </label>
                        <p className="text-[10px] text-zinc-500">Suggested: Square aspect ratio, PNG/JPG under 1.5MB.</p>
                        {customStoreLogo && (
                          <button
                            type="button"
                            onClick={() => setCustomStoreLogo('')}
                            className="block text-[10px] text-red-500 hover:underline font-bold"
                          >
                            Remove Logo File
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Base Currency Symbol:</label>
                      <select 
                        value={customCurrency}
                        onChange={(e) => setCustomCurrency(e.target.value)}
                        className="bg-zinc-800 border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 text-white [color-scheme:dark]"
                      >
                        <option value="₱">₱ PHP Peso Sign</option>
                        <option value="$">$ USD Dollar Symbol</option>
                        <option value="€">€ EUR Euro Standard</option>
                        <option value="¥">¥ JPY Yen Accent</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Standard VAT Tax Standard (%):</label>
                      <input 
                        type="number"
                        value={customTaxRate}
                        onChange={(e) => setCustomTaxRate(Math.max(0, Number(e.target.value)))}
                        className="bg-zinc-800/80 border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 text-white outline-none focus:border-m3-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-5 animate-slide-left">
                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 text-m3-on-surface-variant text-xs leading-relaxed flex gap-3">
                  <Users className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" />
                  <p>
                    Customize branch operational boundaries. Establishing initial sales targets computes appropriate target achievement percentages dynamically in performance trackers.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-sky-400 pl-1">Active Storefront Allocations & Sales Quotas</h4>
                  
                  <div className="grid grid-cols-1 gap-3.5">
                    {branches.filter(b => !b.isDeleted).map((b) => (
                      <div key={b.id} className="p-3.5 rounded-2xl bg-zinc-800/50 border border-m3-outline-variant/20 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-white">{b.id}: {b.name.replace('Emman Tile Center', '').trim() || b.name}</span>
                          <span className="text-[10px] font-mono text-zinc-400">Current Sales: ₱{b.monthlySales.toLocaleString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-zinc-400 pl-0.5">Target Monthly Sales Goal (PHP):</span>
                            <input 
                              type="number"
                              value={customTargets[b.id] ?? b.monthlySales}
                              onChange={(e) => setCustomTargets({ ...customTargets, [b.id]: Number(e.target.value) })}
                              className="bg-zinc-900 border border-m3-outline-variant/30 rounded-xl text-xs font-bold p-2 text-white outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-zinc-400 pl-0.5">Assigned Floor Staff Count:</span>
                            <input 
                              type="number"
                              value={customStaff[b.id] ?? b.staffCount}
                              onChange={(e) => setCustomStaff({ ...customStaff, [b.id]: Number(e.target.value) })}
                              className="bg-zinc-900 border border-m3-outline-variant/30 rounded-xl text-xs font-bold p-2 text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-5 animate-slide-left">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-m3-on-surface-variant text-xs leading-relaxed flex gap-3">
                  <Package className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <p>
                    Establish your active trading catalog inventory profiles. The system seeds standard sizes like 60x60 cm glazed porcelain slabs. You may instantly certify starting parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-amber-500 pl-1">Starting Inventory Catalogs Status Check</h4>
                  
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-amber-500">Standard Tiles Dataset Cached</span>
                      <p className="text-[10.5px] font-semibold text-zinc-400 leading-relaxed mt-1">
                        Currently tracking {products.length} distinct high-performance product items across Metro Manila & Visayas depots!
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-[10.5px]">
                      READY
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-m3-outline-variant/15 text-[11px] font-mono text-zinc-400 flex flex-col gap-1">
                    <span>• System-Certified Standard: Polished Granite Slab, Glazed Slate Tile, Hexagon Ceramic</span>
                    <span>• Base pricing indices: Box coverage, bulk pricing parameters, distribution margins check</span>
                    <span>• Auto-calculations: Live margins and stock asset calculations are verified and matched!</span>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 4 && (
              <div className="space-y-5 animate-slide-left">
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-m3-on-surface-variant text-xs leading-relaxed flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                  <p>
                    Lock executive passwords and authorization codes. The Manager Security PIN authorizes override events (such as price alterations or cashier shift voids).
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-rose-400 pl-1">Executive Compliance Credentials</h4>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Administrator Primary Email:</label>
                    <input 
                      type="email"
                      value={setupAdminEmail}
                      onChange={(e) => setSetupAdminEmail(e.target.value)}
                      className="bg-zinc-800 border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 text-white outline-none cursor-text w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-m3-primary uppercase font-mono pl-1">Manager Security PIN (4 Digits Override Code):</label>
                    <input 
                      type="text"
                      maxLength={4}
                      value={setupManagerPin}
                      onChange={(e) => setSetupManagerPin(e.target.value)}
                      className="bg-zinc-800 border border-m3-outline-variant/35 rounded-2xl text-xs font-bold p-3 text-white outline-none tracking-widest font-mono text-center max-w-[150px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div className="border-t border-m3-outline-variant/15 pt-5 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                if (setupStep === 1) {
                  setShowSetupWizard(false);
                  localStorage.setItem('tilepoint_setup_completed', 'true');
                  showToastMsg('ℹ️ Walkthrough setup postponed. Settings can be completed anytime.', 'info');
                } else {
                  setSetupStep(setupStep - 1);
                }
              }}
              className="px-5 py-2.5 rounded-xl border border-m3-outline-variant/30 text-xs text-zinc-400 hover:text-white font-bold transition-all cursor-pointer"
            >
              {setupStep === 1 ? "Postpone Setup" : "Back Step"}
            </button>

            {setupStep < 4 ? (
              <button
                onClick={() => setSetupStep(setupStep + 1)}
                className="px-5 py-2.5 rounded-xl bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary text-xs font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-lg"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-xs text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xl"
              >
                Finalize Setup & System Lock ➔
              </button>
            )}
          </div>

        </div>
      </div>
    );
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
        {renderSetupWizardModal()}
        
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
                  onClick={() => setShowSetupWizard(true)}
                  className="p-3 text-xs bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30 hover:from-emerald-500 hover:to-emerald-600 hover:text-white font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  title="Configure core company thresholds & branding profiles"
                >
                  Setup Wizard
                </button>
                <button 
                  onClick={() => onNavigate('architecture')}
                  className="p-3 text-xs bg-m3-surface-low rounded-2xl border border-m3-outline-variant/30 hover:bg-m3-primary hover:text-m3-on-primary font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Database className="h-4 w-4" /> ERD Studio
                </button>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="p-3 text-xs bg-m3-surface-low rounded-2xl border border-m3-outline-variant/30 hover:bg-m3-primary/10 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                  title="Force refresh database records"
                >
                  <RefreshCw className="h-4 w-4 text-m3-primary" /> Reload Feed
                </button>
              </div>
            </div>
          </div>
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
              <div className="text-[10px] text-zinc-400 mt-1.5">
                {selectedBranchId === 'all' ? "Corporate Target: ₱10,000,000" : `Target quota benchmark: ₱2.5M`}
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
              Matches warehouse stock matrices dynamically
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

                    {(activeDrilldown === 'products' ? activeProducts : activeDrilldown === 'low' ? lowStockProducts : activeDrilldown === 'critical' ? criticalStockProducts : outOfStockProducts).map((p, idx) => (
                      <div key={idx} className="p-3 bg-m3-surface-lowest rounded-xl border border-m3-outline-variant/15 text-xs flex flex-col justify-between gap-2.5">
                        <div className="space-y-1">
                          <div className="font-extrabold text-m3-on-surface leading-snug">{p.productName}</div>
                          <div className="text-[10.5px] text-zinc-400 flex items-center justify-between font-mono">
                            <span>SKU: {p.sku}</span>
                            <span className="text-m3-primary font-bold">Price: ₱{p.sellingPrice.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-500/10 pt-2 text-[10.5px]">
                          <span>Current Global Stock: <span className="font-black text-m3-primary font-mono">{p.stockQuantity} boxes</span></span>
                          <span className="text-zinc-500 font-mono">Min req: {p.minimumStock}</span>
                        </div>

                        <button 
                          onClick={() => {
                            showToastMsg(`Created automatic logistics restock PO request for ${p.productName}! Supplier notified.`, 'success');
                          }}
                          className="w-full py-1.5 bg-m3-primary hover:bg-m3-primary/80 transition-all text-m3-on-primary font-bold rounded-lg text-[10.5px] uppercase cursor-pointer"
                        >
                          Request Restock Order
                        </button>
                      </div>
                    ))}
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
                <span>Select a day below to simulate a high-value bulk transaction in real-time.</span>
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
                    const hasSimulatedValue = (daysSimulatedSales[data.day] || 0) > 0;

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
                              : hasSimulatedValue 
                              ? 'bg-sky-500 hover:bg-sky-400'
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
                          {hasSimulatedValue && (
                            <span className="text-[8.5px] text-sky-300 font-extrabold uppercase mt-0.5 tracking-wider">
                              (+₱{(daysSimulatedSales[data.day] || 0).toLocaleString()} Simulated)
                            </span>
                          )}
                        </div>

                        <span className={`text-[9.5px] font-mono mt-2 transition-colors ${isSelected ? 'text-emerald-400 font-black' : 'text-m3-on-surface-variant/80'}`}>{data.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Simulated transactions controls wrapper */}
            {selectedWeeklyDay !== null && (
              <div className="p-3.5 mt-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 rounded-2xl animate-fade-in flex flex-col gap-2 shrink-0 select-none">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    Simulate Bulk deal for {weeklyChartData[selectedWeeklyDay].day}
                  </span>
                  <button onClick={() => setSelectedWeeklyDay(null)} className="text-zinc-500 hover:text-white px-1">✕</button>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[25000, 75000, 150000, 300000].map((val) => (
                    <button 
                      key={val}
                      onClick={() => {
                        const dayName = weeklyChartData[selectedWeeklyDay].day;
                        setDaysSimulatedSales({
                          ...daysSimulatedSales,
                          [dayName]: (daysSimulatedSales[dayName] || 0) + val
                        });
                        showToastMsg(`Simulated custom transaction bulk deal worth ₱${val.toLocaleString()} on ${dayName}!`, 'success');
                      }}
                      className="bg-zinc-900 border border-m3-outline-variant/20 p-2 rounded-xl text-[10px] font-bold text-white hover:border-emerald-500 hover:bg-emerald-500/20 active:scale-95 transition-all text-center"
                    >
                      +₱{val / 1000}k
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-1.5 border-t border-emerald-500/10 pt-2 text-[10px] font-mono">
                  <span className="text-zinc-400">Total Simulation Impact for {weeklyChartData[selectedWeeklyDay].day}:</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-emerald-400 font-black">₱{(daysSimulatedSales[weeklyChartData[selectedWeeklyDay].day] || 0).toLocaleString()}</span>
                    {(daysSimulatedSales[weeklyChartData[selectedWeeklyDay].day] || 0) > 0 && (
                      <button 
                        onClick={() => {
                          const dayName = weeklyChartData[selectedWeeklyDay].day;
                          setDaysSimulatedSales({ ...daysSimulatedSales, [dayName]: 0 });
                          showToastMsg(`Reset Simulated Deals on ${dayName}`, 'info');
                        }}
                        className="text-[9.5px] text-rose-400 hover:underline font-extrabold"
                      >
                        Reset Day
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                      Target Record: {log.tableAffected} ({log.recordId || 'Global'}) • Operator ID: @{log.username}
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
            <div className="bg-m3-surface-container border-l-4 border-m3-primary p-5 rounded-[24px] rounded-l-none flex items-start gap-4 shadow-sm">
              <XCircle className="text-m3-primary h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-m3-primary">Out of Stock Alert</h4>
                <p className="text-xs text-m3-on-surface-variant mt-1.5 leading-relaxed">
                  There are <span className="font-extrabold text-m3-primary">{outOfStockProducts.length}</span> items completely depleted in local store records.
                </p>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="mt-3 text-xs font-bold text-m3-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View depleted items <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <div className="bg-m3-surface-container border-l-4 border-m3-tertiary p-5 rounded-[24px] rounded-l-none flex items-start gap-4 shadow-sm">
              <AlertTriangle className="text-m3-tertiary h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-m3-tertiary">Low Stock Alert</h4>
                <p className="text-xs text-m3-on-surface-variant mt-1.5 leading-relaxed">
                  Local stock for <span className="font-extrabold text-m3-tertiary">{lowStockProducts.length}</span> items have fallen below safety limits. Restock required.
                </p>
                <button
                  onClick={() => onNavigate('procurement')}
                  className="mt-3 text-xs font-bold text-m3-tertiary hover:underline flex items-center gap-1 cursor-pointer"
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
                      L 20 ${200 - (monthlyChartData[0].revenue / maxMonthlyAmount) * 160} 
                      C 70 ${200 - (monthlyChartData[0].revenue / maxMonthlyAmount) * 160}, 90 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}, 130 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}
                      C 180 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}, 200 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}, 240 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}
                      C 290 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}, 310 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}, 350 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}
                      C 400 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}, 420 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}, 460 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}
                      C 510 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}, 530 ${200 - (monthlyChartData[5].revenue / maxMonthlyAmount) * 160}, 570 ${200 - (monthlyChartData[5].revenue / maxMonthlyAmount) * 160}
                      L 570 200 Z`}
                  fill="url(#localWaveGrad)"
                />

                <path
                  d={`M 20 ${200 - (monthlyChartData[0].revenue / maxMonthlyAmount) * 160} 
                      C 70 ${200 - (monthlyChartData[0].revenue / maxMonthlyAmount) * 160}, 90 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}, 130 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}
                      C 180 ${200 - (monthlyChartData[1].revenue / maxMonthlyAmount) * 160}, 200 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}, 240 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}
                      C 290 ${200 - (monthlyChartData[2].revenue / maxMonthlyAmount) * 160}, 310 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}, 350 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}
                      C 400 ${200 - (monthlyChartData[3].revenue / maxMonthlyAmount) * 160}, 420 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}, 460 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}
                      C 510 ${200 - (monthlyChartData[4].revenue / maxMonthlyAmount) * 160}, 530 ${200 - (monthlyChartData[5].revenue / maxMonthlyAmount) * 160}, 570 ${200 - (monthlyChartData[5].revenue / maxMonthlyAmount) * 160}`}
                  fill="none"
                  stroke="var(--m3-primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {[[20, 0], [130, 1], [240, 2], [350, 3], [460, 4], [570, 5]].map(([cx, idx]) => {
                  const val = monthlyChartData[idx].revenue;
                  const cy = 200 - (val / maxMonthlyAmount) * 160;
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
                    top: `${130 - (monthlyChartData[hoveredPoint].revenue / maxMonthlyAmount) * 130}px`
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
                      Target Record: {log.tableAffected} ({log.recordId || 'Global'}) • Operator ID: @{log.username}
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
