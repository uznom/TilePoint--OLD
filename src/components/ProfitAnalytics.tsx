import React, { useState, useMemo } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
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
  Calendar,
  Filter,
  BarChart3,
  CalendarDays,
  Percent,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface ProfitAnalyticsProps {
  darkMode: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  getBranchName: (branchId: string | null) => string;
  showToastMsg?: (message: string, type: "success" | "info" | "error") => void;
}

export function ProfitAnalytics({
  darkMode,
  selectedBranchId,
  setSelectedBranchId,
  getBranchName,
  showToastMsg,
}: ProfitAnalyticsProps) {
  const {
    sales,
    saleItems,
    products,
    damageLogs,
    shifts,
    branches,
    expenses,
  } = useDb();

  // Period state: '7d' | '15d' | '30d' | 'monthly'
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "15d" | "30d" | "monthly">("30d");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Expenses state
  const expensesList = useMemo(() => {
    return expenses || [];
  }, [expenses]);

  // Branch Landing Cost Modifiers
  const branchLandingModifiers = useMemo(() => {
    const saved = localStorage.getItem("tilepoint_branch_landing_modifiers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  }, []);

  // Format Date utility
  const formatDateLabel = (isoString: string, format: "day" | "month") => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    if (format === "month") {
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Timeline Data Generation
  const timelineData = useMemo(() => {
    const now = new Date();
    const periodsMap: Record<string, {
      dateStr: string;
      rawDate: Date;
      revenue: number;
      cogs: number;
      opex: number;
      loss: number;
    }> = {};

    let limitDays = 30;
    let viewFormat: "day" | "month" = "day";

    if (selectedPeriod === "7d") limitDays = 7;
    else if (selectedPeriod === "15d") limitDays = 15;
    else if (selectedPeriod === "30d") limitDays = 30;
    else {
      limitDays = 180; // Monthly view covering past 6 months
      viewFormat = "month";
    }

    // Initialize periods
    if (viewFormat === "day") {
      for (let i = limitDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = formatDateLabel(d.toISOString(), "day");
        const key = d.toDateString();
        periodsMap[key] = {
          dateStr: label,
          rawDate: d,
          revenue: 0,
          cogs: 0,
          opex: 0,
          loss: 0,
        };
      }
    } else {
      // Monthly keys
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = formatDateLabel(d.toISOString(), "month");
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        periodsMap[key] = {
          dateStr: label,
          rawDate: d,
          revenue: 0,
          cogs: 0,
          opex: 0,
          loss: 0,
        };
      }
    }

    // Populate Sales & COGS
    sales.forEach((sale) => {
      if (sale.isDeleted) return;
      if (selectedBranchId !== "all" && sale.branchId !== selectedBranchId) return;

      const saleDate = new Date(sale.createdAt);
      let key = "";
      if (viewFormat === "day") {
        key = saleDate.toDateString();
      } else {
        key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
      }

      if (periodsMap[key]) {
        periodsMap[key].revenue += sale.grandTotal;

        // Calculate COGS
        const items = saleItems.filter((item) => item.saleId === sale.id && !item.isDeleted);
        const modPercent = branchLandingModifiers[sale.branchId] ?? 2.5;
        items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const baseCost = prod ? prod.costPrice : 0;
          periodsMap[key].cogs += item.quantity * baseCost * (1 + modPercent / 100);
        });
      }
    });

    // Populate Operating Expenses (OpEx)
    expensesList.forEach((exp: any) => {
      if (exp.isDeleted) return;
      if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return;

      const expDate = new Date(exp.dateTime || exp.createdAt);
      let key = "";
      if (viewFormat === "day") {
        key = expDate.toDateString();
      } else {
        key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
      }

      if (periodsMap[key]) {
        periodsMap[key].opex += exp.amount;
      }
    });

    // Populate System Losses (Damages & Shortages)
    damageLogs.forEach((log) => {
      if (log.isDeleted) return;
      if (selectedBranchId !== "all" && log.branchId !== selectedBranchId) return;

      const logDate = new Date(log.reportedAt || log.createdAt || now);
      let key = "";
      if (viewFormat === "day") {
        key = logDate.toDateString();
      } else {
        key = `${logDate.getFullYear()}-${logDate.getMonth()}`;
      }

      if (periodsMap[key]) {
        const prod = products.find((p) => p.id === log.productId);
        if (prod) {
          const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
          periodsMap[key].loss += costPerUnit * log.quantity;
        }
      }
    });

    // Shortages from shift cash variances
    shifts.forEach((sh) => {
      if (selectedBranchId !== "all" && sh.branchId !== selectedBranchId) return;
      if (!sh.closedAt) return;

      const shiftDate = new Date(sh.closedAt);
      let key = "";
      if (viewFormat === "day") {
        key = shiftDate.toDateString();
      } else {
        key = `${shiftDate.getFullYear()}-${shiftDate.getMonth()}`;
      }

      if (periodsMap[key] && sh.variance && sh.variance < 0) {
        periodsMap[key].loss += Math.abs(sh.variance);
      }
    });

    // Return flattened array
    return Object.values(periodsMap)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
      .map((item) => {
        const netProfit = item.revenue - (item.cogs + item.opex + item.loss);
        const marginPercent = item.revenue > 0 ? (netProfit / item.revenue) * 100 : 0;
        return {
          date: item.dateStr,
          Revenue: Math.round(item.revenue),
          COGS: Math.round(item.cogs),
          Expenses: Math.round(item.opex + item.loss),
          NetProfit: Math.round(netProfit),
          Margin: parseFloat(marginPercent.toFixed(1)),
        };
      });
  }, [sales, saleItems, products, expensesList, damageLogs, shifts, selectedBranchId, selectedPeriod, branchLandingModifiers]);

  // Aggregate Totals for the current timeframe
  const totals = useMemo(() => {
    let rev = 0;
    let cogs = 0;
    let exp = 0;
    let profit = 0;

    timelineData.forEach((d) => {
      rev += d.Revenue;
      cogs += d.COGS;
      exp += d.Expenses;
      profit += d.NetProfit;
    });

    const avgMargin = rev > 0 ? (profit / rev) * 100 : 0;

    return {
      revenue: rev,
      cogs,
      expenses: exp,
      netProfit: profit,
      margin: avgMargin,
    };
  }, [timelineData]);

  return (
    <div className="space-y-6" id="profit-analytics-section">
      
      {/* Timeframe Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-m3-surface-low p-4.5 rounded-[24px] border border-m3-outline-variant/35 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-m3-primary/10 rounded-xl text-m3-primary shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-m3-on-surface uppercase tracking-wide">P&L Financial Timeline</h4>
            <p className="text-[11px] text-zinc-400 font-medium">Consolidated trend matrix over dynamic calendar boundaries</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Timeframe filter buttons */}
          <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-m3-outline-variant/15 text-xs font-bold gap-1">
            <button
              onClick={() => setSelectedPeriod("7d")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "7d"
                  ? "bg-m3-primary text-m3-on-primary font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedPeriod("15d")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "15d"
                  ? "bg-m3-primary text-m3-on-primary font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              15 Days
            </button>
            <button
              onClick={() => setSelectedPeriod("30d")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "30d"
                  ? "bg-m3-primary text-m3-on-primary font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedPeriod("monthly")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPeriod === "monthly"
                  ? "bg-m3-primary text-m3-on-primary font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              6 Months
            </button>
          </div>

          {/* Chart visual type toggle */}
          <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-m3-outline-variant/15 text-xs font-bold">
            <button
              onClick={() => setChartType("area")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                chartType === "area" ? "bg-m3-surface-high text-m3-primary font-black shadow-sm" : "text-zinc-400"
              }`}
              title="Area Chart"
            >
              Area
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                chartType === "bar" ? "bg-m3-surface-high text-m3-primary font-black shadow-sm" : "text-zinc-400"
              }`}
              title="Bar Chart"
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Timeframe aggregation summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="p-4 bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Timeframe Revenue</span>
            <div className="text-xl font-black text-emerald-500 mt-1 font-mono">
              ₱{totals.revenue.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-500 mt-0.5 block font-medium">Gross funds collected</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* COGS */}
        <div className="p-4 bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Total COGS Cost</span>
            <div className="text-xl font-black text-amber-500 mt-1 font-mono">
              ₱{totals.cogs.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-500 mt-0.5 block font-medium">Landing & wholesale cost</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        {/* Expenses */}
        <div className="p-4 bg-m3-surface-low border border-m3-outline-variant/30 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">OpEx & Losses</span>
            <div className="text-xl font-black text-rose-500 mt-1 font-mono">
              ₱{totals.expenses.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-500 mt-0.5 block font-medium">Expenses, shortages, voids</span>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
            <Building className="h-5 w-5" />
          </div>
        </div>

        {/* Net Profit */}
        <div className={`p-4 bg-m3-surface-low border rounded-2xl flex items-center justify-between ${
          totals.netProfit >= 0 ? "border-emerald-500/30" : "border-rose-500/30"
        }`}>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Net Retained Profit</span>
            <div className={`text-xl font-black mt-1 font-mono ${
              totals.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              ₱{totals.netProfit.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Percent className="h-3 w-3 text-zinc-400" />
              <span className="text-[9px] font-black uppercase text-zinc-400 font-mono">
                Margin: {totals.margin.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${
            totals.netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            {totals.netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Chart Component */}
      <div className="p-5.5 bg-zinc-950/20 border border-m3-outline-variant/30 rounded-[28px] overflow-hidden">
        <div className="flex items-center justify-between mb-4.5">
          <h5 className="text-xs font-black uppercase tracking-wider text-m3-primary flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-m3-primary" />
            Financial Health Trend Matrix ({selectedPeriod === "monthly" ? "6 Months View" : `${selectedPeriod} Boundaries`})
          </h5>
          <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-m3-surface-high border border-m3-outline-variant/20 text-zinc-400">
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCOGS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10.5} 
                  tickLine={false} 
                  dy={10}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "14px",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    fontFamily: "Inter, sans-serif"
                  }}
                  formatter={(value: any) => [`₱${value.toLocaleString()}`, ""]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontFamily: "Inter, sans-serif", fontWeight: "bold" }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={10.5} 
                  tickLine={false}
                  dy={10}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "14px",
                    color: "#f4f4f5",
                    fontSize: "11px",
                    fontFamily: "Inter, sans-serif"
                  }}
                  formatter={(value: any) => [`₱${value.toLocaleString()}`, ""]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontFamily: "Inter, sans-serif", fontWeight: "bold" }}
                />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="COGS" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" name="Net Profit" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3.5 border-t border-m3-outline-variant/15 flex flex-wrap gap-4 items-center justify-between text-[10.5px] text-zinc-400 font-sans">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Operational Guidance: Retain net margins above <strong>20%</strong> for optimal showroom growth.</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] font-extrabold bg-m3-surface-high px-2 py-1 rounded-lg">
            <span>STABLE LEDGER LOCK</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
