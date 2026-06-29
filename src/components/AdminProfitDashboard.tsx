import React, { useState, useMemo } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
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
  History
} from "lucide-react";

interface AdminProfitDashboardProps {
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

export function AdminProfitDashboard({
  darkMode,
  selectedBranchId,
  setSelectedBranchId,
  getBranchName,
  showToastMsg,
}: AdminProfitDashboardProps) {
  const {
    sales,
    saleItems,
    products,
    damageLogs,
    shifts,
    branches,
  } = useDb();

  // Localized tab inside P&L center for breakdown streams
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
    // Set nice base default modifiers for standard branches
    return {
      "corporate": 0.0,
    };
  });

  // Inline editing state for modifiers
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Expenses data from localStorage
  const expensesList: Expense[] = useMemo(() => {
    try {
      const saved = localStorage.getItem("atpos_v2_expenses");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse expenses list", e);
      return [];
    }
  }, [sales]); // Re-compute periodically or when dependencies shift

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

  // Main calculations
  const metrics = useMemo(() => {
    // Filter sales based on branch
    const activeSales = sales.filter((s) => {
      if (selectedBranchId !== "all" && s.branchId !== selectedBranchId) return false;
      return true;
    });

    const nonDeletedSales = activeSales.filter((s) => !s.isDeleted);
    const voidedSales = activeSales.filter((s) => s.isDeleted);

    // 1. Gross Revenue
    const grossSalesCollected = nonDeletedSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const grossSalesSubtotal = nonDeletedSales.reduce((acc, s) => acc + s.subtotal, 0);
    const grossSalesVat = nonDeletedSales.reduce((acc, s) => acc + s.vat, 0);
    const grossSalesDiscount = nonDeletedSales.reduce((acc, s) => acc + s.discount, 0);

    // 2. Cost of Goods Sold (COGS)
    let calculatedCogs = 0;
    nonDeletedSales.forEach((sale) => {
      const items = saleItems.filter((item) => item.saleId === sale.id && !item.isDeleted);
      const modPercent = branchLandingModifiers[sale.branchId] ?? 2.5; // Default to 2.5% landing cost modifier if unconfigured
      items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const baseCost = prod ? prod.costPrice : 0;
        calculatedCogs += item.quantity * baseCost * (1 + modPercent / 100);
      });
    });

    // 3. Operating Expenses (OpEx)
    const activeExpenses = expensesList.filter((exp) => {
      if (exp.isDeleted) return false;
      if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return false;
      return true;
    });
    const totalOpex = activeExpenses.reduce((acc, exp) => acc + exp.amount, 0);

    // 4. Shrink / System Loss Ledger
    // a) Damages (Broken products & warehouse drops)
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

    // b) Shifts Cash Discrepancies (Cash shortage variance)
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

    // c) Voided Transactions loss value (Grand Total margin lost)
    const totalVoidsLoss = voidedSales.reduce((acc, s) => acc + s.grandTotal, 0);

    // Combined Shrink & System Loss
    const totalSystemLoss = totalDamageLoss + totalShiftShortage + totalVoidsLoss;

    // 5. Net Profit
    // Equation: Net Profit = Gross Revenue - (COGS + OpEx + System Loss)
    const totalExpensesAndDeductions = calculatedCogs + totalOpex + totalSystemLoss;
    const netProfit = grossSalesCollected - totalExpensesAndDeductions;

    // Margins
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
  }, [sales, saleItems, products, damageLogs, shifts, branchLandingModifiers, selectedBranchId, expensesList]);

  // Branch Rank calculation list
  const branchLeaderboard = useMemo(() => {
    return branches.filter((b) => !b.isDeleted).map((branch) => {
      const branchSales = sales.filter((s) => s.branchId === branch.id && !s.isDeleted);
      const branchGross = branchSales.reduce((acc, s) => acc + s.grandTotal, 0);
      
      // Compute COGS
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

      // OpEx
      const branchOpex = expensesList
        .filter((exp) => !exp.isDeleted && exp.branchId === branch.id)
        .reduce((acc, exp) => acc + exp.amount, 0);

      // System Loss
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
  }, [branches, sales, saleItems, products, expensesList, damageLogs, shifts, branchLandingModifiers]);

  return (
    <div className="space-y-6" id="admin-profit-overview-dashboard">
      
      {/* 1. VISUAL INTERACTIVE EQUATION PANEL */}
      <div className="android-glass border border-m3-outline-variant/35 rounded-[28px] p-6 bg-m3-surface-low text-m3-on-surface relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 h-48 w-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80 font-mono">Consolidated Profitability Model</h3>
        </div>
        
        {/* The Equation Display */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center mb-6">
          
          {/* Gross Revenue */}
          <div className="p-4 rounded-2xl bg-m3-surface-high/20 border border-m3-outline-variant/15 text-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Gross Revenue (+)</span>
            <div className="text-lg font-black text-emerald-500 mt-1">
              ₱{metrics.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">Total Sales Collected</span>
          </div>

          <div className="text-center text-xl font-bold text-zinc-400 hidden lg:block">−</div>

          {/* Deductions (COGS + OpEx + Loss) */}
          <div className="p-4 rounded-2xl bg-m3-surface-high/20 border border-m3-outline-variant/15 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">Total Deductions (−)</span>
            
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
              <div>
                <span className="text-[9px] text-zinc-400 font-bold block">COGS</span>
                <span className="font-mono font-bold text-rose-400">₱{metrics.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 font-bold block">OpEx</span>
                <span className="font-mono font-bold text-rose-400">₱{metrics.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-400 font-bold block">Shrink/Loss</span>
                <span className="font-mono font-bold text-rose-400">₱{metrics.shrinkage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
            <div className="text-center text-[10.5px] font-mono text-zinc-500 font-bold mt-2 pt-1 border-t border-m3-outline-variant/10">
              Sum: ₱{(metrics.cogs + metrics.opex + metrics.shrinkage).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="text-center text-xl font-bold text-zinc-400 hidden lg:block">=</div>

          {/* Net Profit Result */}
          <div className={`p-5 rounded-2xl border ${metrics.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"} text-center`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block">Net Profit (=)</span>
            <div className="text-2xl font-black tracking-tight mt-1 animate-pulse">
              ₱{metrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-m3-surface-high/50 font-mono text-current">
              {metrics.netProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              Margin: {metrics.netMarginPercent.toFixed(1)}%
            </div>
          </div>

        </div>

        {/* Dynamic Horizontal Breakdown Bar (Custom SVG Bar) */}
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
                <span className="h-2 w-2 rounded-full bg-rose-600/90 block" /> Manually Logged OpEx ({((metrics.opex / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-700/95 block" /> System Loss / Shrinkage ({((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600/90 block" /> Net Retained Margin ({((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN CORE METRICS BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Revenue Card */}
        <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 bg-m3-surface-low text-m3-on-surface hover:bg-m3-surface-low/90 transition-all duration-300 shadow-md flex justify-between items-center group overflow-hidden relative">
          <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">Gross Revenue</span>
            <div className="text-2xl font-black mt-2 tracking-tight text-m3-primary">
              ₱{metrics.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9.5px] text-zinc-400 mt-1.5 font-mono space-y-0.5">
              <div>Subtotal: ₱{metrics.grossSubtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div>Discounts: -₱{metrics.discountsAllowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div>Output VAT: ₱{metrics.vatCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 m3-shape-asymmetric">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Cost of Goods Sold Card */}
        <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 bg-m3-surface-low text-m3-on-surface hover:bg-m3-surface-low/90 transition-all duration-300 shadow-md flex justify-between items-center group overflow-hidden relative">
          <div className="absolute top-0 right-0 h-1 w-full bg-amber-500" />
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">Cost of Goods Sold</span>
            <div className="text-2xl font-black mt-2 tracking-tight text-m3-primary">
              ₱{metrics.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9.5px] text-zinc-400 mt-1.5 font-mono">
              <div>Gross Margin: {metrics.grossMarginPercent.toFixed(1)}%</div>
              <div className="mt-1 text-[9px] text-zinc-500 font-sans">Includes branch landing multipliers</div>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 m3-shape-asymmetric">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Operating Expenses Card */}
        <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 bg-m3-surface-low text-m3-on-surface hover:bg-m3-surface-low/90 transition-all duration-300 shadow-md flex justify-between items-center group overflow-hidden relative">
          <div className="absolute top-0 right-0 h-1 w-full bg-rose-500" />
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">Branch Expenses (OpEx)</span>
            <div className="text-2xl font-black mt-2 tracking-tight text-m3-primary">
              ₱{metrics.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9.5px] text-zinc-400 mt-1.5 font-mono">
              <div>Items count: {metrics.activeExpenses.length} entries</div>
              <div className="mt-1 text-[9px] text-zinc-500 font-sans">Utilities, logistics, and packaging</div>
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 m3-shape-asymmetric">
            <Building className="h-6 w-6" />
          </div>
        </div>

        {/* System Loss / Shrinkage Card */}
        <div className="p-5.5 rounded-[24px] border border-m3-outline-variant/35 bg-m3-surface-low text-m3-on-surface hover:bg-m3-surface-low/90 transition-all duration-300 shadow-md flex justify-between items-center group overflow-hidden relative">
          <div className="absolute top-0 right-0 h-1 w-full bg-red-600" />
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-m3-on-surface-variant/80">System Loss / Shrink</span>
            <div className="text-2xl font-black mt-2 tracking-tight text-m3-primary">
              ₱{metrics.shrinkage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[9.5px] text-zinc-400 mt-1.5 font-mono space-y-0.5">
              <div>Damages: ₱{metrics.damageLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div>Shortages: ₱{metrics.shiftShortage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div>Voids Value: ₱{metrics.voidedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 m3-shape-asymmetric">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* 3. BRANCH MODIFIERS & INTERACTIVE COMPARISON LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Interlinked Multi-Branch Profitability Leaderboard */}
        <div className="m3-card p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-m3-outline-variant/15 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-m3-primary flex items-center gap-2">
                  <Building className="h-5 w-5 text-m3-primary" /> Branch Profitability Comparison
                </h3>
                <p className="text-xs text-m3-on-surface-variant">Real-time profitability leaderboard of enterprise nodes</p>
              </div>
              <span className="text-[9px] font-mono bg-m3-primary/10 text-m3-primary px-2.5 py-1 rounded-lg border border-m3-primary/20 font-bold">
                Consolidated Rankings
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-bold text-[10px]">
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
                    const isWinner = index === 0 && item.net > 0;
                    const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-m3-primary/5 transition-colors cursor-pointer ${
                          selectedBranchId === item.id ? "bg-m3-primary/5 font-bold" : ""
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
                        <td className={`py-3 text-right font-mono font-bold ${item.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          ₱{item.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`py-3 text-right pr-2 font-mono font-bold ${item.margin >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
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
          
          <div className="text-[10px] text-zinc-500 font-sans italic pt-4 mt-2 border-t border-m3-outline-variant/10 text-center">
            💡 Click on any row to isolate calculations for that branch assignment viewport.
          </div>
        </div>

        {/* Right: Branch landing cost modifiers Configuration */}
        <div className="m3-card p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[24px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-m3-outline-variant/15 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-m3-primary flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-m3-primary" /> Landing Modifiers
                </h3>
                <p className="text-xs text-m3-on-surface-variant">Adjust local cargo modifiers per retail node</p>
              </div>
            </div>

            <p className="text-[11px] text-m3-on-surface-variant leading-relaxed mb-4">
              Wholesale materials shipped from port yards generate freight margins. Modifiers scale the Cost of Goods Sold (COGS) base calculation dynamically:
            </p>

            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {branches.filter((b) => !b.isDeleted).map((branch) => {
                const currentModifier = branchLandingModifiers[branch.id] ?? 2.5;
                const isEditing = editingBranchId === branch.id;
                
                return (
                  <div key={branch.id} className="p-3 bg-m3-surface-high/30 rounded-xl border border-m3-outline-variant/10 flex items-center justify-between gap-3">
                    <div className="truncate">
                      <span className="text-xs font-bold text-m3-on-surface block truncate">{branch.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono font-bold">{branch.address || "Main Outlet"}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            className="w-14 bg-m3-surface-lowest border border-m3-outline-variant text-xs p-1 rounded font-bold font-mono text-center text-m3-on-surface focus:outline-none focus:border-m3-primary"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                          />
                          <span className="text-xs font-mono font-bold text-m3-on-surface">%</span>
                          <button
                            onClick={() => handleModifierSave(branch.id)}
                            className="px-2 py-1 bg-m3-primary text-m3-on-primary font-black uppercase rounded text-[9px] hover:opacity-90 transition-opacity"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-extrabold text-m3-primary bg-m3-primary/15 px-2.5 py-1 rounded-lg">
                            {currentModifier.toFixed(1)}%
                          </span>
                          <button
                            onClick={() => {
                              setEditingBranchId(branch.id);
                              setEditingValue(String(currentModifier));
                            }}
                            className="text-[10px] font-bold text-zinc-400 hover:text-m3-primary transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 bg-m3-primary/5 rounded-2xl border border-m3-primary/10 mt-4 text-[10px] text-zinc-400 font-medium">
            🚩 Landing cost multipliers offset general corporate wholesale prices to reflect actual localized freight costs, customs margins, or port clearances.
          </div>
        </div>

      </div>

      {/* 4. DETAILED LEDGER BREAKDOWNS OF SYSTEM LOSS AND EXPENSES */}
      <div className="m3-card p-6 bg-m3-surface-low border border-m3-outline-variant/35 shadow-md rounded-[28px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-m3-outline-variant/15 pb-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-m3-primary flex items-center gap-2">
              <FileText className="h-5 w-5 text-m3-primary" /> Dynamic Ledger Details
            </h3>
            <p className="text-xs text-m3-on-surface-variant">Underlying transaction journals driving profit calculations</p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-m3-surface-high/35 p-1 rounded-xl border border-m3-outline-variant/10 text-[10.5px]">
            <button
              onClick={() => setActiveLedgerTab("damage")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeLedgerTab === "damage"
                  ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
                  : "text-zinc-400 hover:text-m3-on-surface"
              }`}
            >
              Damage Register ({metrics.activeDamageLogs.length})
            </button>
            <button
              onClick={() => setActiveLedgerTab("shift-shortages")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeLedgerTab === "shift-shortages"
                  ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
                  : "text-zinc-400 hover:text-m3-on-surface"
              }`}
            >
              Shift Shortages ({metrics.activeShifts.filter(s => (s.variance ?? 0) < 0).length})
            </button>
            <button
              onClick={() => setActiveLedgerTab("voids")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeLedgerTab === "voids"
                  ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
                  : "text-zinc-400 hover:text-m3-on-surface"
              }`}
            >
              Voided Sales ({metrics.voidedSales.length})
            </button>
            <button
              onClick={() => setActiveLedgerTab("expenses")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeLedgerTab === "expenses"
                  ? "bg-m3-primary text-m3-on-primary shadow-sm font-black"
                  : "text-zinc-400 hover:text-m3-on-surface"
              }`}
            >
              Logged Expenses ({metrics.activeExpenses.length})
            </button>
          </div>
        </div>

        {/* Ledger Contents conditional rendering */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          
          {/* A. Damage Logs */}
          {activeLedgerTab === "damage" && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-m3-outline-variant/15 text-m3-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Product SKU/Name</th>
                  <th className="py-2.5">Branch Profile</th>
                  <th className="py-2.5 text-center">Qty Logged</th>
                  <th className="py-2.5">Fracture Cause</th>
                  <th className="py-2.5">Reported By</th>
                  <th className="py-2.5 text-right pr-2">Margin Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10">
                {metrics.activeDamageLogs.map((log) => {
                  const prod = products.find(p => p.id === log.productId);
                  const costPerUnit = log.unitType === "Piece" ? ((prod?.costPrice ?? 0) / (prod?.boxQuantity || 4)) : (prod?.costPrice ?? 0);
                  const logImpact = costPerUnit * log.quantity;
                  
                  return (
                    <tr key={log.id} className="hover:bg-m3-primary/5 transition-colors">
                      <td className="py-3">
                        <span className="font-bold text-m3-on-surface block truncate max-w-[200px]">{log.productName}</span>
                        <span className="text-[9px] font-mono text-zinc-500 block uppercase">{log.productSku || prod?.sku || "N/A"}</span>
                      </td>
                      <td className="py-3 text-zinc-400 font-semibold">{getBranchName(log.branchId)}</td>
                      <td className="py-3 text-center font-bold text-m3-on-surface font-mono">
                        {log.quantity} <span className="text-[9.5px] font-sans text-zinc-400 font-medium">{log.unitType || "Box"}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase font-mono bg-red-500/15 text-red-400 border border-red-500/20">
                          {log.reason || "BROKEN"}
                        </span>
                        {log.notes && <span className="text-[10px] text-zinc-500 block truncate max-w-[180px] mt-0.5">{log.notes}</span>}
                      </td>
                      <td className="py-3 text-zinc-500 truncate max-w-[120px]">@{log.reportedBy}</td>
                      <td className="py-3 text-right font-mono font-bold text-red-400 pr-2">-₱{logImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
                {metrics.activeDamageLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-m3-on-surface-variant">
                      <ShieldAlert className="h-8 w-8 text-zinc-500 mx-auto mb-2 animate-bounce" />
                      Zero physical tile damages or breakage items registered. Perfect inventory handling!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* B. Shift Shortages */}
          {activeLedgerTab === "shift-shortages" && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-m3-outline-variant/15 text-m3-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Shift Session ID</th>
                  <th className="py-2.5">Branch Profile</th>
                  <th className="py-2.5">Cashier Profile</th>
                  <th className="py-2.5">Date Time Closed</th>
                  <th className="py-2.5 text-right">Drawer Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10">
                {metrics.activeShifts
                  .filter(sh => (sh.variance ?? 0) < 0)
                  .map((sh) => (
                    <tr key={sh.id} className="hover:bg-m3-primary/5 transition-colors">
                      <td className="py-3 font-mono font-bold text-m3-on-surface">#{sh.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-3 text-zinc-400 font-semibold">{getBranchName(sh.branchId)}</td>
                      <td className="py-3 font-semibold text-m3-on-surface">@{sh.cashierName}</td>
                      <td className="py-3 text-zinc-500">{sh.closedAt ? new Date(sh.closedAt).toLocaleString() : "Still active"}</td>
                      <td className="py-3 text-right font-mono font-bold text-red-400 pr-2">
                        -₱{Math.abs(sh.variance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                {metrics.activeShifts.filter(sh => (sh.variance ?? 0) < 0).length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-m3-on-surface-variant">
                      <Sparkles className="h-8 w-8 text-emerald-400 mx-auto mb-2 animate-spin" />
                      Zero shift variances closed in shortage. Perfect cashier ledger balance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* C. Voided Sales */}
          {activeLedgerTab === "voids" && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-m3-outline-variant/15 text-m3-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Invoice No</th>
                  <th className="py-2.5">Branch Profile</th>
                  <th className="py-2.5">Cashier assignee</th>
                  <th className="py-2.5">Voided Customer</th>
                  <th className="py-2.5">Time Logged</th>
                  <th className="py-2.5 text-right">Voided Gross</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10">
                {metrics.voidedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-m3-primary/5 transition-colors">
                    <td className="py-3">
                      <span className="font-mono font-bold text-m3-on-surface">{sale.saleNumber}</span>
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase">ID: {sale.id.slice(0, 6).toUpperCase()}</span>
                    </td>
                    <td className="py-3 text-zinc-400 font-semibold">{getBranchName(sale.branchId)}</td>
                    <td className="py-3 font-semibold text-m3-on-surface">@{sale.cashierName}</td>
                    <td className="py-3 text-zinc-500">{sale.customerName || "Walk-In"}</td>
                    <td className="py-3 text-zinc-500">{new Date(sale.deletedAt || sale.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-right font-mono font-bold text-red-400 pr-2">
                      -₱{sale.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {metrics.voidedSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-m3-on-surface-variant">
                      <History className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                      No invoices voided or transactions deleted under supervisor PIN. Secure records!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* D. Logged Expenses */}
          {activeLedgerTab === "expenses" && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-m3-outline-variant/15 text-m3-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Date Logged</th>
                  <th className="py-2.5">Branch Assignment</th>
                  <th className="py-2.5">Expense Category</th>
                  <th className="py-2.5">Description/Notes</th>
                  <th className="py-2.5">Recorded By</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/10">
                {metrics.activeExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-m3-primary/5 transition-colors">
                    <td className="py-3 text-zinc-400 font-semibold">{new Date(exp.dateTime).toLocaleDateString()}</td>
                    <td className="py-3 text-zinc-400 font-semibold">{getBranchName(exp.branchId)}</td>
                    <td className="py-3 font-bold text-m3-on-surface uppercase tracking-wider text-[10px] font-mono">
                      <span className="bg-m3-primary/10 text-m3-primary border border-m3-primary/20 px-2 py-0.5 rounded">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500 max-w-[200px] truncate">{exp.notes || "Branch expenditure"}</td>
                    <td className="py-3 text-zinc-500">@{exp.recordedBy}</td>
                    <td className="py-3 text-right font-mono font-bold text-red-400 pr-2">
                      -₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {metrics.activeExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-m3-on-surface-variant">
                      <Activity className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                      No operating expenses manually registered in terminal journals.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>

    </div>
  );
}
