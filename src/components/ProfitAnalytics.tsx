import { useState, useMemo, useEffect } from "react";
import { useDb } from "../context/DbContext";
import { formatCurrency } from "../utils/formatters";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Building,
  Activity,
  Percent,
  Sparkles,
  ReceiptText,
} from "lucide-react";
import { HeroDropdownSelect } from "./common/ui/HeroDropdown";

interface ProfitAnalyticsProps {
  darkMode: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  getBranchName: (branchId: string | null) => string;
  showToastMsg?: (message: string, type: "success" | "info" | "error") => void;
  branchLandingModifiers?: Record<string, number>;
}

export function ProfitAnalytics({
  darkMode,
  selectedBranchId,
  setSelectedBranchId,
  getBranchName,
  showToastMsg: _showToastMsg,
  branchLandingModifiers: propLandingModifiers,
}: ProfitAnalyticsProps) {
  const {
    sales = [],
    saleItems = [],
    products = [],
    damageLogs = [],
    shifts = [],
    branches = [],
    expenses = [],
    customBills = [],
    purchaseOrders = [],
  } = useDb();

  // Local storage modifiers fallback / reactive sync
  const [localModifiers, setLocalModifiers] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("tilepoint_branch_landing_modifiers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse branch modifiers in ProfitAnalytics", e);
      }
    }
    return { corporate: 0.0 };
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("tilepoint_branch_landing_modifiers");
      if (saved) {
        try {
          setLocalModifiers(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const effectiveModifiers = propLandingModifiers || localModifiers;

  // Determine default period dynamically based on database history age span
  const defaultPeriod = useMemo<"7d" | "15d" | "30d" | "monthly" | "all-time">(() => {
    const dates: number[] = [];
    (sales || []).forEach((s) => {
      if (s.createdAt) {
        const t = new Date(s.createdAt).getTime();
        if (!isNaN(t)) dates.push(t);
      }
    });
    (expenses || []).forEach((e) => {
      if (e.dateTime) {
        const t = new Date(e.dateTime).getTime();
        if (!isNaN(t)) dates.push(t);
      }
    });
    (shifts || []).forEach((s) => {
      if (s.openedAt) {
        const t = new Date(s.openedAt).getTime();
        if (!isNaN(t)) dates.push(t);
      }
    });

    if (dates.length === 0) {
      return "7d";
    }

    let minDate = dates[0];
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] < minDate) minDate = dates[i];
    }
    const diffMs = Date.now() - minDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) {
      return "7d";
    } else if (diffDays <= 15) {
      return "15d";
    } else if (diffDays <= 30) {
      return "30d";
    } else if (diffDays <= 180) {
      return "monthly";
    } else {
      return "all-time";
    }
  }, [sales, expenses, shifts]);

  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "15d" | "30d" | "monthly" | "all-time">("7d");
  const [hasUserSelected, setHasUserSelected] = useState(false);

  // Sync to dynamic default if the user hasn't made a manual click yet
  useEffect(() => {
    if (!hasUserSelected) {
      setSelectedPeriod(defaultPeriod);
    }
  }, [defaultPeriod, hasUserSelected]);

  const handlePeriodChange = (period: "7d" | "15d" | "30d" | "monthly" | "all-time") => {
    setSelectedPeriod(period);
    setHasUserSelected(true);
  };

  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Local date helpers to avoid timezone off-by-one errors
  const getLocalDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalMonthKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Filter Data by Timeframe & Branch
  const timelineData = useMemo(() => {
    const now = new Date();
    const dataMap: Record<string, { date: string; Revenue: number; COGS: number; NetProfit: number; Expenses: number }> = {};

    let daysCount = 7;
    if (selectedPeriod === "15d") daysCount = 15;
    else if (selectedPeriod === "30d") daysCount = 30;
    else if (selectedPeriod === "monthly") daysCount = 180;
    else if (selectedPeriod === "all-time") daysCount = 365;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (selectedPeriod === "monthly") {
      // 6 months view
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      startDate.setTime(startMonth.getTime());

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = getLocalMonthKey(d);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        dataMap[key] = { date: label, Revenue: 0, COGS: 0, NetProfit: 0, Expenses: 0 };
      }
    } else if (selectedPeriod === "all-time") {
      // 12 months view for all-time
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      startDate.setTime(startMonth.getTime());

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = getLocalMonthKey(d);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        dataMap[key] = { date: label, Revenue: 0, COGS: 0, NetProfit: 0, Expenses: 0 };
      }
    } else {
      // Daily buckets (7d, 15d, 30d)
      startDate.setDate(now.getDate() - (daysCount - 1));

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = getLocalDateKey(d);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dataMap[key] = { date: label, Revenue: 0, COGS: 0, NetProfit: 0, Expenses: 0 };
      }
    }

    // Pre-indexed Map lookups for O(1) performance
    const productsById = new Map<string, (typeof products)[0]>();
    (products || []).forEach((p) => {
      if (!p.isDeleted) {
        productsById.set(p.id, p);
      }
    });

    const saleItemsBySaleId = new Map<string, typeof saleItems>();
    (saleItems || []).forEach((item) => {
      if (item.isDeleted) return;
      let list = saleItemsBySaleId.get(item.saleId);
      if (!list) {
        list = [];
        saleItemsBySaleId.set(item.saleId, list);
      }
      list.push(item);
    });

    // 1. Process Sales & COGS
    (sales || []).forEach((sale) => {
      if (sale.isDeleted) return;
      if (selectedBranchId !== "all" && sale.branchId !== selectedBranchId) return;

      const saleDate = new Date(sale.createdAt);
      if (isNaN(saleDate.getTime()) || saleDate < startDate) return;

      const key = (selectedPeriod === "monthly" || selectedPeriod === "all-time")
        ? getLocalMonthKey(saleDate)
        : getLocalDateKey(saleDate);

      if (!dataMap[key]) return;

      const revenue = Number(sale.grandTotal || 0);
      dataMap[key].Revenue += revenue;

      // Calculate COGS
      const items = saleItemsBySaleId.get(sale.id) || [];
      const modPercent = effectiveModifiers[sale.branchId] ?? 2.5;
      let saleCogs = 0;
      items.forEach((item) => {
        const prod = productsById.get(item.productId);
        const baseCost = prod ? Number(prod.costPrice || 0) : 0;
        const effectiveCost = baseCost * (1 + modPercent / 100);
        saleCogs += effectiveCost * Number(item.quantity || 0);
      });

      dataMap[key].COGS += saleCogs;
    });

    // 2. Process Operational Expenses
    (expenses || []).forEach((exp) => {
      if (exp.isDeleted) return;
      if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return;

      const expDate = new Date(exp.dateTime || "");
      if (isNaN(expDate.getTime()) || expDate < startDate) return;

      const key = (selectedPeriod === "monthly" || selectedPeriod === "all-time")
        ? getLocalMonthKey(expDate)
        : getLocalDateKey(expDate);

      if (!dataMap[key]) return;
      const amount = Number(exp.amount || 0);
      dataMap[key].Expenses += amount;
    });

    // 3. Process Automated Calendar Payments
    const parsedInstallments: Record<string, { id: string; amount: number; date: string; notes?: string }[]> = (() => {
      try {
        const saved = localStorage.getItem("atpos_v2_payable_installments");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    })();

    Object.entries(parsedInstallments).forEach(([poId, insts]) => {
      const bill = customBills?.find((b) => b.id === poId);
      const po = purchaseOrders?.find((p) => p.id === poId);
      const branchId = (bill as any)?.branchId || po?.branchId || "corporate";

      if (selectedBranchId !== "all" && branchId !== selectedBranchId) return;

      insts.forEach((inst) => {
        const instDate = new Date(inst.date || "");
        if (isNaN(instDate.getTime()) || instDate < startDate) return;

        const key = (selectedPeriod === "monthly" || selectedPeriod === "all-time")
          ? getLocalMonthKey(instDate)
          : getLocalDateKey(instDate);

        if (dataMap[key]) {
          dataMap[key].Expenses += Number(inst.amount || 0);
        }
      });
    });

    // 4. Process Damage Write-offs
    (damageLogs || []).forEach((dmg) => {
      if (dmg.isDeleted) return;
      if (selectedBranchId !== "all" && dmg.branchId !== selectedBranchId) return;

      const dmgDate = new Date(dmg.createdAt || "");
      if (isNaN(dmgDate.getTime()) || dmgDate < startDate) return;

      const key = (selectedPeriod === "monthly" || selectedPeriod === "all-time")
        ? getLocalMonthKey(dmgDate)
        : getLocalDateKey(dmgDate);

      if (!dataMap[key]) return;
      const prod = productsById.get(dmg.productId);
      if (!prod) return;
      const costPerUnit = dmg.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
      const loss = costPerUnit * Number(dmg.quantity || 0);
      dataMap[key].Expenses += loss;
    });

    // 5. Process Shift Cash Drawer Shortages
    (shifts || []).forEach((sh) => {
      if (selectedBranchId !== "all" && sh.branchId !== selectedBranchId) return;
      const variance = Number(sh.variance || 0);
      if (variance >= 0) return; // Only negative variance is a loss

      const shDate = new Date(sh.openedAt || sh.closedAt || "");
      if (isNaN(shDate.getTime()) || shDate < startDate) return;

      const key = (selectedPeriod === "monthly" || selectedPeriod === "all-time")
        ? getLocalMonthKey(shDate)
        : getLocalDateKey(shDate);

      if (!dataMap[key]) return;
      dataMap[key].Expenses += Math.abs(variance);
    });

    // Compute Net Profit
    return Object.values(dataMap).map((d) => ({
      ...d,
      NetProfit: Math.round((d.Revenue - d.COGS - d.Expenses) * 100) / 100,
    }));
  }, [
    sales,
    saleItems,
    products,
    expenses,
    damageLogs,
    shifts,
    purchaseOrders,
    customBills,
    selectedBranchId,
    selectedPeriod,
    effectiveModifiers,
  ]);

  // Aggregate Totals
  const totals = useMemo(() => {
    let rev = 0;
    let cogs = 0;
    let exp = 0;
    let net = 0;

    timelineData.forEach((d) => {
      rev += d.Revenue;
      cogs += d.COGS;
      exp += d.Expenses;
      net += d.NetProfit;
    });

    const margin = rev > 0 ? (net / rev) * 100 : 0;

    return {
      revenue: rev,
      cogs,
      expenses: exp,
      netProfit: net,
      margin,
    };
  }, [timelineData]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Profitability &amp; Financial Velocity</span>
          </h4>
          <p className="text-xs text-default-500 mt-0.5 font-medium">
            Multi-branch margin analysis, cost of goods sold, and operating expense impact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Timeframe filter buttons */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 text-xs font-bold gap-1">
            {(["7d", "15d", "30d", "monthly", "all-time"] as const).map((period) => {
              const labelMap: Record<string, string> = {
                "7d": "7 Days",
                "15d": "15 Days",
                "30d": "30 Days",
                "monthly": "6 Months",
                "all-time": "12 Months",
              };
              const isActive = selectedPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => handlePeriodChange(period)}
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer text-xs ${
                    isActive
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {labelMap[period]}
                </button>
              );
            })}
          </div>

          {/* Chart visual type toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 rounded-full cursor-pointer transition-all text-xs ${
                chartType === "area"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Area Chart"
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-full cursor-pointer transition-all text-xs ${
                chartType === "bar"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Bar Chart"
            >
              Bar
            </button>
          </div>

          {/* Branch Selector Dropdown */}
          <HeroDropdownSelect
            startIcon={<Building className="h-3.5 w-3.5 text-primary" />}
            items={[
              { key: "all", label: "Consolidated (All Branches)" },
              ...branches.filter((b) => !b.isDeleted).map((b) => ({
                key: b.id,
                label: b.name,
              })),
            ]}
            selectedKey={selectedBranchId ?? "all"}
            onSelectionChange={(val) => setSelectedBranchId(val)}
            size="sm"
            variant="pill"
            className="min-w-[180px]"
          />
        </div>
      </div>

      {/* Timeframe aggregation summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl flex items-center justify-between shadow-elevation-soft">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 font-mono">Timeframe Revenue</span>
            <div className="text-xl font-bold text-emerald-500 mt-1 font-mono">
              {formatCurrency(totals.revenue)}
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* COGS */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl flex items-center justify-between shadow-elevation-soft">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 font-mono">Total COGS Cost</span>
            <div className="text-xl font-bold text-amber-500 mt-1 font-mono">
              {formatCurrency(totals.cogs)}
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        {/* Expenses */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl flex items-center justify-between shadow-elevation-soft">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 font-mono">OpEx &amp; Losses</span>
            <div className="text-xl font-bold text-rose-500 mt-1 font-mono">
              {formatCurrency(totals.expenses)}
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
            <ReceiptText className="h-5 w-5" />
          </div>
        </div>

        {/* Net Profit */}
        <div
          className={`p-5 bg-white dark:bg-zinc-900 border rounded-2xl flex items-center justify-between shadow-elevation-soft ${
            totals.netProfit >= 0 ? "border-emerald-500/30" : "border-rose-500/30"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 font-mono">Net Retained Profit</span>
            <div
              className={`text-xl font-bold mt-1 font-mono ${
                totals.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatCurrency(totals.netProfit)}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Percent className="h-3 w-3 text-default-400" />
              <span className="text-[10px] font-bold uppercase text-default-500 font-mono">
                Margin: {totals.margin.toFixed(1)}%
              </span>
            </div>
          </div>
          <div
            className={`p-3 rounded-2xl border ${
              totals.netProfit >= 0
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            }`}
          >
            {totals.netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Chart Component */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-elevation-soft">
        <div className="flex items-center justify-between mb-4.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 font-mono">
            <Activity className="h-4 w-4 text-primary" />
            Financial Health Trend Matrix ({selectedPeriod === "monthly" ? "6 Months View" : selectedPeriod === "all-time" ? "12 Months View" : `${selectedPeriod} Boundaries`})
          </h5>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-default-600 dark:text-default-400 font-mono">
            Active Port: {selectedBranchId === "all" ? "Consolidated All Branches" : getBranchName(selectedBranchId)}
          </span>
        </div>

        <div className="h-80 w-full" id="profitability-timeline-container">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCOGS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} />
                <XAxis
                  dataKey="date"
                  stroke={darkMode ? "#A1A1AA" : "#71717A"}
                  fontSize={10.5}
                  tickLine={false}
                  dy={10}
                  fontFamily="'Plus Jakarta Sans', ui-sans-serif, sans-serif"
                />
                <YAxis
                  stroke={darkMode ? "#A1A1AA" : "#71717A"}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatCurrency(val, { compact: true })}
                  fontFamily="'Plus Jakarta Sans', ui-sans-serif, sans-serif"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#18181B" : "#FFFFFF",
                    borderColor: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                    borderRadius: "16px",
                    color: darkMode ? "#ECEDEE" : "#18181B",
                    fontSize: "11px",
                    fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif",
                    boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18)",
                  }}
                  labelStyle={{
                    color: darkMode ? "#ECEDEE" : "#18181B",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: darkMode ? "#D4D4D8" : "#3F3F46",
                  }}
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === "NetProfit" ? "Net Profit" : name === "COGS" ? "COGS Base" : name === "Expenses" ? "OpEx & Losses" : name,
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="COGS"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCOGS)"
                />
                <Area
                  type="monotone"
                  dataKey="Expenses"
                  name="OpEx & Losses"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                />
                <Area
                  type="monotone"
                  dataKey="NetProfit"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  name="Net Profit"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={timelineData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} />
                <XAxis
                  dataKey="date"
                  stroke={darkMode ? "#A1A1AA" : "#71717A"}
                  fontSize={10.5}
                  tickLine={false}
                  dy={10}
                  fontFamily="'Plus Jakarta Sans', ui-sans-serif, sans-serif"
                />
                <YAxis
                  stroke={darkMode ? "#A1A1AA" : "#71717A"}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatCurrency(val, { compact: true })}
                  fontFamily="'Plus Jakarta Sans', ui-sans-serif, sans-serif"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#18181B" : "#FFFFFF",
                    borderColor: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                    borderRadius: "16px",
                    color: darkMode ? "#ECEDEE" : "#18181B",
                    fontSize: "11px",
                    fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif",
                    boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18)",
                  }}
                  labelStyle={{
                    color: darkMode ? "#ECEDEE" : "#18181B",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: darkMode ? "#D4D4D8" : "#3F3F46",
                  }}
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === "NetProfit" ? "Net Profit" : name === "COGS" ? "COGS Base" : name === "Expenses" ? "OpEx & Losses" : name,
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif", fontWeight: "bold" }}
                />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="COGS" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" name="OpEx & Losses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" name="Net Profit" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3.5 border-t border-divider/20 flex flex-wrap gap-4 items-center justify-between text-[10.5px] text-default-500 font-sans font-medium">
          <div className="flex items-center gap-1.5 font-bold text-default-600 dark:text-default-400">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Multi-channel profitability tracking synced to point-of-sale invoices, inventory landing costs, and operational losses.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfitAnalytics;
