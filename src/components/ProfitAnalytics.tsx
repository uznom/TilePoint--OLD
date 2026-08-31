import React, { useState, useMemo } from "react";
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
 BarChart3,
 Percent,
 Sparkles,
} from "lucide-react";
import { HeroDropdownSelect } from "./common/ui/HeroDropdown";

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
 showToastMsg: _showToastMsg,
}: ProfitAnalyticsProps) {
 const {
 sales,
 saleItems,
 products,
 damageLogs,
 shifts,
 branches,
 expenses,
 purchaseOrders,
 productReturns,
 } = useDb();

 // Determine default period dynamically based on database history age span
 const defaultPeriod = useMemo<"7d" | "15d" | "30d" | "monthly" | "all-time">(() => {
 const dates: number[] = [];
 sales?.forEach(s => {
 if (s.createdAt) {
 const t = new Date(s.createdAt).getTime();
 if (!isNaN(t)) dates.push(t);
 }
 });
 expenses?.forEach(e => {
 if (e.dateTime) {
 const t = new Date(e.dateTime).getTime();
 if (!isNaN(t)) dates.push(t);
 }
 });
 shifts?.forEach(s => {
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
 React.useEffect(() => {
 if (!hasUserSelected) {
 setSelectedPeriod(defaultPeriod);
 }
 }, [defaultPeriod, hasUserSelected]);

 const handlePeriodChange = (period: "7d" | "15d" | "30d" | "monthly" | "all-time") => {
 setSelectedPeriod(period);
 setHasUserSelected(true);
 };

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

 // Pre-indexed Map lookups for high performance O(1) Business Intelligence
 const saleItemsBySaleId = useMemo(() => {
 const map = new Map<string, typeof saleItems>();
 if (saleItems) {
 saleItems.forEach((item) => {
 if (item.isDeleted) return;
 let list = map.get(item.saleId);
 if (!list) {
 list = [];
 map.set(item.saleId, list);
 }
 list.push(item);
 });
 }
 return map;
 }, [saleItems]);

 const productsById = useMemo(() => {
 const map = new Map<string, (typeof products)[0]>();
 if (products) {
 products.forEach((p) => {
 if (!p.isDeleted) {
 map.set(p.id, p);
 }
 });
 }
 return map;
 }, [products]);

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

  let limitDays: number;
  let viewFormat: "day" | "month" = "day";

  if (selectedPeriod === "7d") limitDays = 7;
  else if (selectedPeriod === "15d") limitDays = 15;
  else if (selectedPeriod === "30d") limitDays = 30;
  else if (selectedPeriod === "monthly") {
  limitDays = 180; // Monthly view covering past 6 months
  viewFormat = "month";
  } else {
  limitDays = 365; // All-Time view covering past 12 months (last year + current year)
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
 const monthsToCover = selectedPeriod === "all-time" ? 12 : 6;
 for (let i = monthsToCover - 1; i >= 0; i--) {
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
 if (isNaN(saleDate.getTime())) return;
 let key = "";
 if (viewFormat === "day") {
 key = saleDate.toDateString();
 } else {
 key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
 }

 if (periodsMap[key]) {
 periodsMap[key].revenue += Number(sale.grandTotal) || 0;

 // Calculate COGS using O(1) indexed Map lookups
 const items = saleItemsBySaleId.get(sale.id) || [];
 const modPercent = branchLandingModifiers[sale.branchId] ?? 2.5;
 items.forEach((item) => {
 const prod = productsById.get(item.productId);
 const baseCost = prod ? prod.costPrice : 0;
 periodsMap[key].cogs += item.quantity * baseCost * (1 + modPercent / 100);
 });
 }
 });

 // Deduct Product Returns / Refunds from Revenue
 (productReturns || []).forEach((ret) => {
 if (ret.isDeleted) return;
 const sale = sales.find((s) => s.id === ret.saleId);
 if (selectedBranchId !== "all" && sale && sale.branchId !== selectedBranchId) return;

 const retDate = new Date(ret.dateTime);
 if (isNaN(retDate.getTime())) return;
  const key = viewFormat === "day" ? retDate.toDateString() : `${retDate.getFullYear()}-${retDate.getMonth()}`;

 if (periodsMap[key]) {
 periodsMap[key].revenue = Math.max(0, periodsMap[key].revenue - (Number(ret.amountRefunded) || 0));
 }
 });

 // Populate Operating Expenses (OpEx)
 expensesList.forEach((exp: any) => {
 if (exp.isDeleted) return;
 if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return;

 const expDate = new Date(exp.dateTime || exp.createdAt);
  const key = viewFormat === "day" ? expDate.toDateString() : `${expDate.getFullYear()}-${expDate.getMonth()}`;

 if (periodsMap[key]) {
 periodsMap[key].opex += Number(exp.amount) || 0;
 }
 });

 // Retrieve calendar payments from localStorage automatically and populate opex
 const parsedInstallments: Record<string, { id: string, amount: number, date: string, notes?: string }[]> = (() => {
 try {
 const saved = localStorage.getItem("atpos_v2_payable_installments");
 return saved ? JSON.parse(saved) : {};
 } catch {
 return {};
 }
 })();

 Object.entries(parsedInstallments).forEach(([poId, insts]) => {
 const po = purchaseOrders?.find((p) => p.id === poId);
 const branchId = po?.branchId || "corporate";

 if (selectedBranchId !== "all" && branchId !== selectedBranchId) return;

 insts.forEach((inst) => {
 const instDate = new Date(inst.date);
  const key = viewFormat === "day" ? instDate.toDateString() : `${instDate.getFullYear()}-${instDate.getMonth()}`;

 if (periodsMap[key]) {
 periodsMap[key].opex += inst.amount;
 }
 });
 });

 // Populate System Losses (Damages & Shortages)
 damageLogs.forEach((log) => {
 if (log.isDeleted) return;
 if (selectedBranchId !== "all" && log.branchId !== selectedBranchId) return;

 const logDate = new Date(log.reportedAt || log.createdAt || now);
  const key = viewFormat === "day" ? logDate.toDateString() : `${logDate.getFullYear()}-${logDate.getMonth()}`;

 if (periodsMap[key]) {
 const prod = productsById.get(log.productId);
 if (prod) {
 const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
 periodsMap[key].loss += costPerUnit * Number(log.quantity || 0);
 }
 }
 });

 // Shortages from shift cash variances
 shifts.forEach((sh) => {
 if (selectedBranchId !== "all" && sh.branchId !== selectedBranchId) return;
 if (!sh.closedAt) return;

 const shiftDate = new Date(sh.closedAt);
  const key = viewFormat === "day" ? shiftDate.toDateString() : `${shiftDate.getFullYear()}-${shiftDate.getMonth()}`;

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
 }, [sales, saleItemsBySaleId, productsById, expensesList, damageLogs, shifts, selectedBranchId, selectedPeriod, branchLandingModifiers, purchaseOrders, productReturns]);

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
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-content1 p-4.5 rounded-2xl border border-divider/35 shadow-sm">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
 <BarChart3 className="h-5 w-5" />
 </div>
 <div>
 <h4 className="text-sm font-black text-foreground uppercase tracking-wide">P&L Financial Timeline</h4>
 
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
 {/* Timeframe filter buttons */}
 <div className="flex bg-zinc-200/50 dark:bg-background/40 p-1 rounded-xl border border-divider/15 text-xs font-bold gap-1">
 <button
 onClick={() => handlePeriodChange("7d")}
 className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 selectedPeriod === "7d"
 ? "bg-primary text-primary-foreground font-black shadow"
 : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 >
 7 Days
 </button>
 <button
 onClick={() => handlePeriodChange("15d")}
 className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 selectedPeriod === "15d"
 ? "bg-primary text-primary-foreground font-black shadow"
 : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 >
 15 Days
 </button>
 <button
 onClick={() => handlePeriodChange("30d")}
 className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 selectedPeriod === "30d"
 ? "bg-primary text-primary-foreground font-black shadow"
 : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 >
 30 Days
 </button>
 <button
 onClick={() => handlePeriodChange("monthly")}
 className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 selectedPeriod === "monthly"
 ? "bg-primary text-primary-foreground font-black shadow"
 : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 >
 6 Months
 </button>
 <button
 onClick={() => handlePeriodChange("all-time")}
 className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 selectedPeriod === "all-time"
 ? "bg-primary text-primary-foreground font-black shadow"
 : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 >
 All-Time (12M)
 </button>
 </div>

 {/* Chart visual type toggle */}
 <div className="flex bg-zinc-200/50 dark:bg-background/40 p-1 rounded-xl border border-divider/15 text-xs font-bold gap-1">
 <button
 onClick={() => setChartType("area")}
 className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
 chartType === "area" ? "bg-primary text-primary-foreground font-black shadow-sm" : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
 }`}
 title="Area Chart"
 >
 Area
 </button>
 <button
 onClick={() => setChartType("bar")}
 className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
 chartType === "bar" ? "bg-primary text-primary-foreground font-black shadow-sm" : "text-default-500 dark:text-default-500 hover:text-zinc-800 dark:hover:text-foreground"
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
      { key: 'all', label: 'Consolidated (All Branches)' },
      ...branches.filter((b) => !b.isDeleted).map((b) => ({
        key: b.id,
        label: b.name,
      })),
    ]}
    selectedKey={selectedBranchId ?? 'all'}
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
 <div className="p-4 bg-content1 border border-divider/30 rounded-2xl flex items-center justify-between">
 <div>
 <span className="text-[10px] font-extrabold uppercase tracking-widest text-default-500 dark:text-default-700">Timeframe Revenue</span>
 <div className="text-xl font-black text-emerald-500 mt-1 ">
 {formatCurrency(totals.revenue)}
 </div>
 
 </div>
 <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
 <DollarSign className="h-5 w-5" />
 </div>
 </div>

 {/* COGS */}
 <div className="p-4 bg-content1 border border-divider/30 rounded-2xl flex items-center justify-between">
 <div>
 <span className="text-[10px] font-extrabold uppercase tracking-widest text-default-500 dark:text-default-700">Total COGS Cost</span>
 <div className="text-xl font-black text-amber-500 mt-1 ">
 {formatCurrency(totals.cogs)}
 </div>
 
 </div>
 <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
 <Layers className="h-5 w-5" />
 </div>
 </div>

 {/* Expenses */}
 <div className="p-4 bg-content1 border border-divider/30 rounded-2xl flex items-center justify-between">
 <div>
 <span className="text-[10px] font-extrabold uppercase tracking-widest text-default-500 dark:text-default-700">OpEx & Losses</span>
 <div className="text-xl font-black text-rose-500 mt-1 ">
 {formatCurrency(totals.expenses)}
 </div>
 
 </div>
 <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
 <Building className="h-5 w-5" />
 </div>
 </div>

 {/* Net Profit */}
 <div className={`p-4 bg-content1 border rounded-2xl flex items-center justify-between ${
 totals.netProfit >= 0 ? "border-emerald-500/30" : "border-rose-500/30"
 }`}>
 <div>
 <span className="text-[10px] font-extrabold uppercase tracking-widest text-default-500 dark:text-default-700">Net Retained Profit</span>
 <div className={`text-xl font-black mt-1 ${
 totals.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
 }`}>
 {formatCurrency(totals.netProfit)}
 </div>
 <div className="flex items-center gap-1 mt-0.5">
 <Percent className="h-3 w-3 text-default-500 dark:text-default-700" />
 <span className="text-[9px] font-black uppercase text-default-500 dark:text-default-700 ">
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
 <div className="p-5.5 bg-white dark:bg-background dark:bg-gradient-to-br dark:from-zinc-950/20 dark:to-zinc-900/20 border border-divider/25 dark:border-divider/30 rounded-2xl overflow-hidden shadow-none dark:shadow-none">
 <div className="flex items-center justify-between mb-4.5">
 <h5 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Activity className="h-4 w-4 text-primary" />
 Financial Health Trend Matrix ({selectedPeriod === "monthly" ? "6 Months View" : `${selectedPeriod} Boundaries`})
 </h5>
 <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-content1/50 dark:bg-content3 border border-divider/20 text-default-600 dark:text-default-500">
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
 borderRadius: "14px",
 color: darkMode ? "#ECEDEE" : "#18181B",
 fontSize: "11px",
 fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif",
 boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18)"
 }}
 labelStyle={{
 color: darkMode ? "#ECEDEE" : "#18181B",
 fontWeight: "bold",
 marginBottom: "4px"
 }}
 itemStyle={{
 color: darkMode ? "#D4D4D8" : "#3F3F46"
 }}
 formatter={(value: any) => [formatCurrency(value), ""]}
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
 borderRadius: "14px",
 color: darkMode ? "#ECEDEE" : "#18181B",
 fontSize: "11px",
 fontFamily: "'Plus Jakarta Sans', ui-sans-serif, sans-serif",
 boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18)"
 }}
 labelStyle={{
 color: darkMode ? "#ECEDEE" : "#18181B",
 fontWeight: "bold",
 marginBottom: "4px"
 }}
 itemStyle={{
 color: darkMode ? "#D4D4D8" : "#3F3F46"
 }}
 formatter={(value: any) => [formatCurrency(value), ""]}
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
 <Bar dataKey="NetProfit" name="Net Profit" fill="#06b6d4" radius={[4, 4, 0, 0]} />
 </BarChart>
 )}
 </ResponsiveContainer>
 </div>

 <div className="mt-4 pt-3.5 border-t border-divider/15 flex flex-wrap gap-4 items-center justify-between text-[10.5px] text-default-600 dark:text-default-500 font-sans font-medium">
 <div className="flex items-center gap-1.5 font-bold text-default-700 dark:text-default-700">
 <Sparkles className="h-4 w-4 text-emerald-500" />
 
 </div>
 </div>
 </div>
 </div>
 );
}
