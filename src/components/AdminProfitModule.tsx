import React, { useState, useMemo } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
import { ProfitAnalytics } from "./ProfitAnalytics";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  AlertTriangle,
  RefreshCw,
  Layers,
  FileText,
  Activity,
  ArrowRight,
  Sparkles,
  Percent,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  History,
  Calendar,
  UsersIcon,
  Plus
} from "lucide-react";

interface AdminProfitModuleProps {
  darkMode: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  getBranchName: (branchId: string | null) => string;
  showToastMsg: (message: string, type: "success" | "info" | "error") => void;
}

interface Expense {
  id: string;
  dateTime: string;
  category: string;
  amount: number;
  recordedBy: string;
  notes: string;
  branchId: string;
  isDeleted?: boolean;
}

export function AdminProfitModule({
  darkMode,
  selectedBranchId,
  setSelectedBranchId,
  getBranchName,
  showToastMsg,
}: AdminProfitModuleProps) {
  const {
    sales,
    saleItems,
    products,
    damageLogs,
    shifts,
    branches,
    currentUser,
  } = useDb();

  // Localized tab inside the accounting console
  const [activeLedgerTab, setActiveLedgerTab] = useState<"damage" | "shift-shortages" | "voids" | "expenses">("damage");
  
  // Custom branch landing cost modifiers in percentage, saved in localStorage
  const [branchLandingModifiers, setBranchLandingModifiers] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("tilepoint_branch_landing_modifiers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse branch modifiers", e);
      }
    }
    return {
      "corporate": 0.0,
    };
  });

  // Inline editing state for modifiers
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Expense form states
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("Utilities");
  const [expenseNotes, setExpenseNotes] = useState<string>("");
  const [expenseBranch, setExpenseBranch] = useState<string>("B1");

  // Expenses data from localStorage
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem("atpos_v2_expenses");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse expenses list", e);
      return [];
    }
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      showToastMsg("Please enter a valid expense amount.", "error");
      return;
    }

    const newExpense: Expense = {
      id: "EXP-" + Date.now().toString(),
      dateTime: new Date().toISOString(),
      category: expenseCategory,
      amount: amt,
      recordedBy: currentUser?.fullName || "System Administrator",
      notes: expenseNotes,
      branchId: expenseBranch,
      isDeleted: false,
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    localStorage.setItem("atpos_v2_expenses", JSON.stringify(updated));
    
    // Reset fields
    setExpenseAmount("");
    setExpenseNotes("");
    showToastMsg(`Recorded expense entry of ₱${amt.toLocaleString()} under ${expenseCategory}.`, "success");
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.map(exp => {
      if (exp.id === id) return { ...exp, isDeleted: true };
      return exp;
    });
    setExpenses(updated);
    localStorage.setItem("atpos_v2_expenses", JSON.stringify(updated));
    showToastMsg("Expense log deleted successfully.", "info");
  };

  const handleModifierSave = (branchId: string) => {
    const val = parseFloat(editingValue);
    if (isNaN(val) || val < 0 || val > 100) {
      showToastMsg("Please enter a valid percentage between 0 and 100.", "error");
      return;
    }
    const updated = {
      ...branchLandingModifiers,
      [branchId]: val,
    };
    setBranchLandingModifiers(updated);
    localStorage.setItem("tilepoint_branch_landing_modifiers", JSON.stringify(updated));
    setEditingBranchId(null);
    showToastMsg(`Landing cost modifier for ${getBranchName(branchId)} updated to ${val}%`, "success");
  };

  // Metrics hook calculation
  const metrics = useMemo(() => {
    const activeSales = sales.filter((s) => {
      if (selectedBranchId !== "all" && s.branchId !== selectedBranchId) return false;
      return true;
    });

    const nonDeletedSales = activeSales.filter((s) => !s.isDeleted);
    const voidedSales = activeSales.filter((s) => s.isDeleted);

    // Gross Revenue
    const grossSalesCollected = nonDeletedSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const grossSalesSubtotal = nonDeletedSales.reduce((acc, s) => acc + s.subtotal, 0);
    const grossSalesVat = nonDeletedSales.reduce((acc, s) => acc + s.vat, 0);
    const grossSalesDiscount = nonDeletedSales.reduce((acc, s) => acc + s.discount, 0);

    // COGS
    let calculatedCogs = 0;
    nonDeletedSales.forEach((sale) => {
      const items = saleItems.filter((item) => item.saleId === sale.id && !item.isDeleted);
      const modPercent = branchLandingModifiers[sale.branchId] ?? 2.5; // Default to 2.5% landing modifier if unconfigured
      items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const baseCost = prod ? prod.costPrice : 0;
        calculatedCogs += item.quantity * baseCost * (1 + modPercent / 100);
      });
    });

    // Operating Expenses (OpEx)
    const activeExpenses = expenses.filter((exp) => {
      if (exp.isDeleted) return false;
      if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return false;
      return true;
    });
    const totalOpex = activeExpenses.reduce((acc, exp) => acc + exp.amount, 0);

    // Shrink / System Loss Ledger
    const activeDamageLogs = damageLogs.filter((log) => {
      if (log.isDeleted) return false;
      if (selectedBranchId !== "all" && log.branchId !== selectedBranchId) return false;
      return true;
    });
    const totalDamageLoss = activeDamageLogs.reduce((acc, log) => {
      const prod = products.find((p) => p.id === log.productId);
      if (!prod) return acc;
      const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
      return acc + (costPerUnit * log.quantity);
    }, 0);

    const activeShifts = shifts.filter((sh) => {
      if (selectedBranchId !== "all" && sh.branchId !== selectedBranchId) return false;
      return true;
    });
    const totalShiftShortage = activeShifts.reduce((acc, sh) => {
      const v = sh.variance ?? 0;
      if (v < 0) {
        return acc + Math.abs(v);
      }
      return acc;
    }, 0);

    const totalVoidsLoss = voidedSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const totalSystemLoss = totalDamageLoss + totalShiftShortage + totalVoidsLoss;

    // Net Profit
    const totalExpensesAndDeductions = calculatedCogs + totalOpex + totalSystemLoss;
    const netProfit = grossSalesCollected - totalExpensesAndDeductions;

    const grossMarginPercent = grossSalesCollected > 0 ? ((grossSalesCollected - calculatedCogs) / grossSalesCollected) * 100 : 0;
    const netMarginPercent = grossSalesCollected > 0 ? (netProfit / grossSalesCollected) * 100 : 0;

    return {
      grossRevenue: grossSalesCollected,
      grossSubtotal: grossSalesSubtotal,
      vatCollected: grossSalesVat,
      discountsAllowed: grossSalesDiscount,
      cogs: calculatedCogs,
      opex: totalOpex,
      shrinkage: totalSystemLoss,
      damageLoss: totalDamageLoss,
      shiftShortage: totalShiftShortage,
      voidedLoss: totalVoidsLoss,
      netProfit,
      grossMarginPercent,
      netMarginPercent,
      activeExpenses,
      activeDamageLogs,
      activeShifts,
      voidedSales,
    };
  }, [sales, saleItems, products, damageLogs, shifts, branchLandingModifiers, selectedBranchId, expenses]);

  // Branch Rank calculation list
  const branchLeaderboard = useMemo(() => {
    return branches.filter((b) => !b.isDeleted).map((branch) => {
      const branchSales = sales.filter((s) => s.branchId === branch.id && !s.isDeleted);
      const branchGross = branchSales.reduce((acc, s) => acc + s.grandTotal, 0);
      
      let branchCogs = 0;
      const modPercent = branchLandingModifiers[branch.id] ?? 2.5;
      branchSales.forEach((sale) => {
        const items = saleItems.filter((item) => item.saleId === sale.id && !item.isDeleted);
        items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const baseCost = prod ? prod.costPrice : 0;
          branchCogs += item.quantity * baseCost * (1 + modPercent / 100);
        });
      });

      const branchOpex = expenses
        .filter((exp) => !exp.isDeleted && exp.branchId === branch.id)
        .reduce((acc, exp) => acc + exp.amount, 0);

      const branchDamages = damageLogs
        .filter((log) => !log.isDeleted && log.branchId === branch.id)
        .reduce((acc, log) => {
          const prod = products.find((p) => p.id === log.productId);
          if (!prod) return acc;
          const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
          return acc + (costPerUnit * log.quantity);
        }, 0);

      const branchShiftShortages = shifts
        .filter((sh) => sh.branchId === branch.id)
        .reduce((acc, sh) => {
          const v = sh.variance ?? 0;
          return v < 0 ? acc + Math.abs(v) : acc;
        }, 0);

      const branchVoids = sales
        .filter((s) => s.isDeleted && s.branchId === branch.id)
        .reduce((acc, s) => acc + s.grandTotal, 0);

      const branchLoss = branchDamages + branchShiftShortages + branchVoids;
      const branchNet = branchGross - (branchCogs + branchOpex + branchLoss);
      const branchNetMargin = branchGross > 0 ? (branchNet / branchGross) * 100 : 0;

      return {
        id: branch.id,
        name: branch.name,
        gross: branchGross,
        cogs: branchCogs,
        opex: branchOpex,
        loss: branchLoss,
        net: branchNet,
        margin: branchNetMargin,
      };
    }).sort((a, b) => b.net - a.net);
  }, [branches, sales, saleItems, products, expenses, damageLogs, shifts, branchLandingModifiers]);

  return (
    <div className="space-y-6" id="isolated-accounting-console">
           {/* 1. VISUAL INTERACTIVE FINANCIAL EQUATION PANEL */}
      <div className="android-glass border border-m3-outline-variant/35 rounded-[28px] p-6 bg-m3-surface-low text-m3-on-surface relative overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl" id="isolated-accounting-console-main-panel">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 h-48 w-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -translate-x-16 translate-y-16 h-48 w-48 bg-m3-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-m3-outline-variant/15 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">Consolidated Profitability Model</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Real-time financial flows across all active branches</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-mono bg-m3-primary/10 text-m3-primary border border-m3-primary/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
              Live Ledger Feed
            </span>
          </div>
        </div>
        
        {/* The Flow Equation Display */}
        <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-3 mb-6 relative">
          
          {/* Gross Revenue Card */}
          <div className="flex-1 min-w-0 bg-gradient-to-br from-zinc-950/40 to-zinc-900/40 border border-m3-outline-variant/20 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-emerald-500/30 group">
            <div className="flex justify-between items-start">
              <span className="text-[9.5px] font-black uppercase text-zinc-400 tracking-wider">Gross Revenue</span>
              <span className="text-[9.5px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-extrabold uppercase">
                INFLOW (+)
              </span>
            </div>
            <div className="my-3.5">
              <div className="text-2xl lg:text-3xl font-black text-emerald-400 font-mono tracking-tight group-hover:scale-[1.01] transition-transform origin-left">
                ₱{metrics.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10.5px] text-zinc-500 mt-1">
                Net of discounts: <span className="font-mono text-zinc-400 font-bold">₱{metrics.discountsAllowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </p>
            </div>
            <div className="text-[10px] text-zinc-400 pt-2.5 border-t border-m3-outline-variant/10 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Consolidated Sales Volume</span>
            </div>
          </div>

          {/* Minus Operator Pill */}
          <div className="flex lg:flex-col items-center justify-center shrink-0 py-1 lg:px-1">
            <div className="h-7 w-7 rounded-full bg-zinc-900 border border-m3-outline-variant/25 flex items-center justify-center text-rose-400 font-bold text-sm shadow-md font-mono select-none">
              −
            </div>
          </div>

          {/* Deductions (COGS + OpEx + Loss) */}
          <div className="flex-[1.5] min-w-0 bg-gradient-to-br from-zinc-950/40 to-zinc-900/40 border border-m3-outline-variant/20 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-rose-500/30">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[9.5px] font-black uppercase text-zinc-400 tracking-wider">Total Deductions</span>
              <span className="text-[9.5px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full font-extrabold uppercase">
                OUTFLOW (−)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-1">
              {/* COGS */}
              <div className="p-2.5 rounded-xl bg-zinc-950/20 border border-m3-outline-variant/10 flex flex-col justify-between">
                <div className="text-[9.5px] font-bold text-zinc-400 block uppercase tracking-wider">COGS</div>
                <div className="font-mono font-black text-rose-400 text-xs mt-1">
                  ₱{metrics.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[9px] text-zinc-500 font-medium mt-0.5 block">
                  {metrics.grossRevenue > 0 ? ((metrics.cogs / metrics.grossRevenue) * 100).toFixed(0) : 0}% of Rev
                </span>
              </div>
              
              {/* OpEx */}
              <div className="p-2.5 rounded-xl bg-zinc-950/20 border border-m3-outline-variant/10 flex flex-col justify-between">
                <div className="text-[9.5px] font-bold text-zinc-400 block uppercase tracking-wider">OpEx</div>
                <div className="font-mono font-black text-rose-400 text-xs mt-1">
                  ₱{metrics.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[9px] text-zinc-500 font-medium mt-0.5 block">
                  {metrics.grossRevenue > 0 ? ((metrics.opex / metrics.grossRevenue) * 100).toFixed(0) : 0}% of Rev
                </span>
              </div>

              {/* Loss / Shrinkage */}
              <div className="p-2.5 rounded-xl bg-zinc-950/20 border border-m3-outline-variant/10 flex flex-col justify-between">
                <div className="text-[9.5px] font-bold text-zinc-400 block uppercase tracking-wider">Shrinkage</div>
                <div className="font-mono font-black text-rose-400 text-xs mt-1">
                  ₱{metrics.shrinkage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[9px] text-zinc-500 font-medium mt-0.5 block">
                  {metrics.grossRevenue > 0 ? ((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(0) : 0}% of Rev
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-zinc-300 font-extrabold pt-3 mt-3 border-t border-m3-outline-variant/10 flex justify-between items-center">
              <span className="text-[9.5px] font-sans font-bold text-zinc-500 uppercase tracking-wider">Sum Outflows</span>
              <span>₱{(metrics.cogs + metrics.opex + metrics.shrinkage).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Equals Operator Pill */}
          <div className="flex lg:flex-col items-center justify-center shrink-0 py-1 lg:px-1">
            <div className="h-7 w-7 rounded-full bg-zinc-900 border border-m3-outline-variant/25 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-md font-mono select-none">
              =
            </div>
          </div>

          {/* Net Profit Result */}
          <div className={`flex-1 min-w-0 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group ${
            metrics.netProfit >= 0 
              ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50" 
              : "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30 text-rose-300 hover:border-rose-500/50"
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[9.5px] font-black uppercase text-zinc-400 tracking-wider">Net Earnings</span>
              <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-black uppercase border ${
                metrics.netProfit >= 0 
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                  : "bg-rose-500/10 border-rose-500/25 text-rose-400"
              }`}>
                {metrics.netProfit >= 0 ? "SURPLUS" : "DEFICIT"}
              </span>
            </div>
            
            <div className="my-3.5">
              <div className="text-2xl lg:text-3xl font-black tracking-tight font-mono group-hover:scale-[1.01] transition-transform origin-left">
                ₱{metrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                {metrics.netProfit >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-400 animate-bounce" />
                )}
                <span className="text-[10.5px] font-mono font-extrabold text-zinc-300">
                  Margin: {metrics.netMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 pt-2.5 border-t border-m3-outline-variant/10 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${metrics.netProfit >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>Return on Enterprise Capital</span>
            </div>
          </div>

        </div>

        {/* Dynamic Allocation Ratios */}
        {metrics.grossRevenue > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono">Gross Revenue Allocation Ratios:</span>
            <div className="w-full h-5 rounded-full bg-zinc-800 flex overflow-hidden shadow-inner text-[9px] font-black font-mono text-white text-center">
              {/* COGS Segment */}
              <div 
                style={{ width: `${(metrics.cogs / metrics.grossRevenue) * 100}%` }}
                className="bg-amber-600/90 flex items-center justify-center min-w-[20px] transition-all"
                title={`COGS: ${((metrics.cogs / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.cogs / metrics.grossRevenue) * 100) >= 10 && `COGS (${((metrics.cogs / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
              
              {/* OpEx Segment */}
              <div 
                style={{ width: `${(metrics.opex / metrics.grossRevenue) * 100}%` }}
                className="bg-rose-600/90 flex items-center justify-center min-w-[20px] transition-all"
                title={`OpEx: ${((metrics.opex / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.opex / metrics.grossRevenue) * 100) >= 10 && `OpEx (${((metrics.opex / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>

              {/* Shrink/Loss Segment */}
              <div 
                style={{ width: `${(metrics.shrinkage / metrics.grossRevenue) * 100}%` }}
                className="bg-red-700/95 flex items-center justify-center min-w-[20px] transition-all"
                title={`Loss: ${((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.shrinkage / metrics.grossRevenue) * 100) >= 10 && `Loss (${((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>

              {/* Net Profit Segment */}
              <div 
                style={{ width: `${Math.max(0, (metrics.netProfit / metrics.grossRevenue) * 100)}%` }}
                className="bg-emerald-600/90 flex items-center justify-center min-w-[20px] transition-all"
                title={`Net Profit: ${((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.netProfit / metrics.grossRevenue) * 100) >= 10 && `Profit (${((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-400 pt-1.5 font-sans justify-center">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-600/90 block" /> COGS Wholesale Price ({((metrics.cogs / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600/90 block" /> Operating Expenses ({((metrics.opex / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-700/95 block" /> Loss / Shrink ({((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600/90 block" /> Net Margin ({((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. DEDICATED PROFIT TIMELINE & TRENDS (PROFIT ANALYTICS GRAPH) */}
      <div className="android-glass border border-m3-outline-variant/35 rounded-[28px] p-1.5 bg-m3-surface-low/60 shadow-md">
        <ProfitAnalytics
          darkMode={darkMode}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          getBranchName={getBranchName}
          showToastMsg={showToastMsg}
        />
      </div>

      {/* 3. MULTI-BRANCH COMPARISON AND LANDING COST MODIFIERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Leaderboards & Contribution */}
        <div className="p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-m3-outline-variant/15 pb-3">
              <div>
                <h3 className="text-xs font-black text-m3-primary flex items-center gap-2 uppercase tracking-wider">
                  <Building className="h-4.5 w-4.5 text-m3-primary" /> Branch Profitability Comparison
                </h3>
                <p className="text-[11px] text-zinc-400">Real-time profitability leaderboard of enterprise nodes</p>
              </div>
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
                Consolidated Rankings
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-2.5">Branch Profile</th>
                    <th className="py-2.5 text-right">Gross Rev</th>
                    <th className="py-2.5 text-right">COGS</th>
                    <th className="py-2.5 text-right">OpEx</th>
                    <th className="py-2.5 text-right">System Loss</th>
                    <th className="py-2.5 text-right">Net Profit</th>
                    <th className="py-2.5 text-right pr-2">Net Marg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10">
                  {branchLeaderboard.map((item, index) => {
                    const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-m3-primary/5 transition-colors cursor-pointer ${
                          selectedBranchId === item.id ? "bg-m3-primary/5 font-extrabold text-m3-primary" : ""
                        }`}
                        onClick={() => {
                          setSelectedBranchId(selectedBranchId === item.id ? "all" : item.id);
                        }}
                      >
                        <td className="py-3 font-semibold flex items-center gap-1.5">
                          <span className="text-xs font-mono">{rankBadge}</span>
                          <span className="truncate">{item.name}</span>
                        </td>
                        <td className="py-3 text-right font-mono">₱{item.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 text-right font-mono text-zinc-400">₱{item.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 text-right font-mono text-zinc-400">₱{item.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 text-right font-mono text-zinc-400">₱{item.loss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={`py-3 text-right font-mono font-black ${item.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          ₱{item.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`py-3 text-right pr-2 font-mono font-black ${item.margin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {item.margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {branchLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-xs text-m3-on-surface-variant">No branch records available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-[10px] text-zinc-500 font-sans italic pt-4 mt-4 border-t border-m3-outline-variant/10 text-center flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-m3-primary" />
            <span>Click on any branch row to filter and isolate P&L timelines above.</span>
          </div>
        </div>

        {/* Right: Landing cost modifiers panel */}
        <div className="p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-m3-outline-variant/15">
              <Sliders className="h-4.5 w-4.5 text-m3-primary" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">Landing Cost Multipliers</h4>
                <p className="text-[10px] text-zinc-400">Adjust wholesale overhead per showroom branch</p>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {branches.filter((b) => !b.isDeleted).map((b) => {
                const currentModifier = branchLandingModifiers[b.id] ?? 2.5;
                const isEditing = editingBranchId === b.id;

                return (
                  <div key={b.id} className="p-3 rounded-xl bg-zinc-950/20 border border-m3-outline-variant/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 truncate">{b.name}</span>
                      <span className="text-[10.5px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        {currentModifier}%
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-full bg-zinc-900 border border-m3-outline-variant/30 rounded-lg text-xs p-1.5 font-mono text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="2.5"
                        />
                        <button
                          onClick={() => handleModifierSave(b.id)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[10.5px] font-black uppercase rounded-lg cursor-pointer shrink-0 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingBranchId(null)}
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10.5px] font-bold uppercase rounded-lg cursor-pointer shrink-0 transition-colors"
                        >
                          Esc
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[9.5px] text-zinc-500">Includes wholesale freight, logistics and taxes</p>
                        <button
                          onClick={() => {
                            setEditingBranchId(b.id);
                            setEditingValue(currentModifier.toString());
                          }}
                          className="text-[9.5px] uppercase font-black tracking-widest text-m3-primary hover:underline cursor-pointer"
                        >
                          Configure
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-[10px] text-amber-300 mt-4 leading-relaxed font-sans">
            <strong>⚠️ Cost Accounting Rule</strong>: COGS is calculated by taking the product base wholesale cost and adding this percentage. Always verify actual shipping receipts before overriding values.
          </div>
        </div>

      </div>

      {/* 4. EXPENDITURE MANAGER AND LEDGER DETAILED AUDIT SHIELDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Expenses Intake Terminal */}
        <div className="p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] flex flex-col justify-between">
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-m3-outline-variant/15">
              <Plus className="h-4.5 w-4.5 text-m3-primary" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">Record Branch Expenses</h4>
                <p className="text-[10px] text-zinc-400">Log utility billing or cargo freight outlays</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400">Target Showroom Branch</label>
              <select
                value={expenseBranch}
                onChange={(e) => setExpenseBranch(e.target.value)}
                className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              >
                {branches.filter(b => !b.isDeleted).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-zinc-300 focus:outline-none focus:ring-1 focus:ring-m3-primary"
                >
                  <option value="Utilities">Utilities (Power, Water)</option>
                  <option value="Logistics">Logistics & Freight</option>
                  <option value="Packaging">Packaging Boxes</option>
                  <option value="Marketing">Local Marketing</option>
                  <option value="Repairs">Repairs & Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400">Amount (PHP)</label>
                <input
                  type="number"
                  required
                  placeholder="₱0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-m3-primary font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400">Audit Notes / Itemized Details</label>
              <textarea
                placeholder="E.g., June electricity bill, Meralco invoice #..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                rows={2}
                className="w-full bg-zinc-950/40 border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-m3-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Expense Log
            </button>
          </form>
        </div>

        {/* Right: Detailed Tabbed Audit Streams (Damage logs, cash variances, voids, registered expenses list) */}
        <div className="p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] lg:col-span-2 flex flex-col justify-between">
          <div>
            {/* Tab selection headers */}
            <div className="flex items-center justify-between pb-3 border-b border-m3-outline-variant/15 mb-4">
              <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-m3-outline-variant/10 text-xs font-bold gap-1">
                <button
                  onClick={() => setActiveLedgerTab("damage")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLedgerTab === "damage" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-zinc-400"
                  }`}
                >
                  Damage Write-offs
                </button>
                <button
                  onClick={() => setActiveLedgerTab("shift-shortages")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLedgerTab === "shift-shortages" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-zinc-400"
                  }`}
                >
                  Shift Variance
                </button>
                <button
                  onClick={() => setActiveLedgerTab("voids")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLedgerTab === "voids" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-zinc-400"
                  }`}
                >
                  Voids Log
                </button>
                <button
                  onClick={() => setActiveLedgerTab("expenses")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeLedgerTab === "expenses" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-zinc-400"
                  }`}
                >
                  Expenses List
                </button>
              </div>
            </div>

            {/* TAB PANELS */}
            <div className="max-h-64 overflow-y-auto pr-1">
              
              {/* Tab: Damage logs write-offs */}
              {activeLedgerTab === "damage" && (
                <div className="space-y-2">
                  {metrics.activeDamageLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-zinc-950/25 border border-m3-outline-variant/10 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-zinc-300">{log.productName}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                          Quantity: {log.quantity} {log.unitType || "Pieces"} • Reason: <span className="text-red-400 font-bold uppercase">{log.reason || "BROKEN"}</span>
                        </div>
                      </div>
                      <div className="font-mono text-rose-400 font-bold shrink-0">
                        {/* Cost Per Unit estimation */}
                        ₱{(() => {
                          const prod = products.find((p) => p.id === log.productId);
                          if (!prod) return "0";
                          const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
                          return Math.round(costPerUnit * log.quantity).toLocaleString();
                        })()}
                      </div>
                    </div>
                  ))}
                  {metrics.activeDamageLogs.length === 0 && (
                    <p className="text-center py-6 text-zinc-500 text-xs italic">No damage write-off entries logged under this branch assign viewport.</p>
                  )}
                </div>
              )}

              {/* Tab: Shift shortages */}
              {activeLedgerTab === "shift-shortages" && (
                <div className="space-y-2">
                  {metrics.activeShifts.map((sh) => {
                    const isShortage = sh.variance && sh.variance < 0;
                    const isOverage = sh.variance && sh.variance > 0;
                    
                    return (
                      <div key={sh.id} className="p-3 bg-zinc-950/25 border border-m3-outline-variant/10 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-zinc-300">Cashier: {sh.cashierName}</div>
                          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                            Opened: {new Date(sh.openedAt).toLocaleDateString()} • Branch: {getBranchName(sh.branchId)}
                          </div>
                        </div>
                        <div className={`font-mono font-black ${isShortage ? "text-rose-400" : isOverage ? "text-emerald-400" : "text-zinc-500"}`}>
                          {sh.variance !== undefined ? (
                            sh.variance < 0 ? `-₱${Math.abs(sh.variance).toLocaleString()}` : `+₱${sh.variance.toLocaleString()}`
                          ) : "₱0"}
                        </div>
                      </div>
                    );
                  })}
                  {metrics.activeShifts.length === 0 && (
                    <p className="text-center py-6 text-zinc-500 text-xs italic">No closed shift variance logs available.</p>
                  )}
                </div>
              )}

              {/* Tab: Voids */}
              {activeLedgerTab === "voids" && (
                <div className="space-y-2">
                  {metrics.voidedSales.map((sale) => (
                    <div key={sale.id} className="p-3 bg-zinc-950/25 border border-m3-outline-variant/10 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-zinc-300">Invoice: {sale.saleNumber}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                          Voided At: {sale.deletedAt ? new Date(sale.deletedAt).toLocaleDateString() : "Unknown"} • Branch: {getBranchName(sale.branchId)}
                        </div>
                      </div>
                      <div className="font-mono text-zinc-500 font-black shrink-0">
                        ₱{sale.grandTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {metrics.voidedSales.length === 0 && (
                    <p className="text-center py-6 text-zinc-500 text-xs italic">No supervisor-voided invoices logged.</p>
                  )}
                </div>
              )}

              {/* Tab: Expenses register */}
              {activeLedgerTab === "expenses" && (
                <div className="space-y-2">
                  {metrics.activeExpenses.map((exp) => (
                    <div key={exp.id} className="p-3 bg-zinc-950/25 border border-m3-outline-variant/10 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-zinc-300">{exp.category}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded-md font-mono">{getBranchName(exp.branchId)}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{exp.notes || "Itemized expense receipt"}</p>
                        <span className="text-[9.5px] text-zinc-600 block font-mono mt-0.5">Recorded: {new Date(exp.dateTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-rose-400 font-bold">₱{exp.amount.toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-zinc-600 hover:text-rose-500 cursor-pointer text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {metrics.activeExpenses.length === 0 && (
                    <p className="text-center py-6 text-zinc-500 text-xs italic">No expenses recorded for this viewport assignment.</p>
                  )}
                </div>
              )}

            </div>
          </div>

          <div className="pt-3 border-t border-m3-outline-variant/10 flex items-center justify-between text-[10px] text-zinc-500">
            <span>🛡️ Authorized Access: RESTRICTED TO ADMIN ONLY</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono">Ledger Lock Active</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
