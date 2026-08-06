import React, { useState, useMemo } from "react";
import { useDb } from "../context/DbContext";
import { UserRole } from "../types/db";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { generateTransactionCsv, downloadWindowsLauncherScript } from "../lib/transactionLogger";
import { Download, Search, HardDrive, Terminal } from "lucide-react";
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
 expenses,
 setExpenses,
 addAuditLog,
 customBills,
 purchaseOrders,
 productReturns,
 } = useDb();

 // Localized tab inside the accounting console
 const [activeLedgerTab, setActiveLedgerTab] = useState<"damage" | "shift-shortages" | "voids" | "expenses" | "csv-logger">("damage");
  const [csvSearchQuery, setCsvSearchQuery] = useState("");
  const [csvSyncStatus, setCsvSyncStatus] = useState<string | null>(null);
 
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

 // P&L Statement states
 const [isDetailedOpexExpanded, setIsDetailedOpexExpanded] = useState(false);
 const [isDetailedLossesExpanded, setIsDetailedLossesExpanded] = useState(false);

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
 
 addAuditLog(
 "EXPENSE_LOG",
 `Spent ₱${amt.toLocaleString()} on ${expenseCategory}: ${expenseNotes}`,
 "Expenses",
 newExpense.id,
 JSON.stringify(newExpense),
 );
 
 // Reset fields
 setExpenseAmount("");
 setExpenseNotes("");
 showToastMsg(`Recorded expense entry of ₱${amt.toLocaleString()} under ${expenseCategory}.`, "success");
 };

 const handleDeleteExpense = (id: string) => {
 const target = expenses.find(exp => exp.id === id);
 const updated = expenses.map(exp => {
 if (exp.id === id) return { ...exp, isDeleted: true, deletedAt: new Date().toISOString() };
 return exp;
 });
 setExpenses(updated);
 addAuditLog(
 "EXPENSE_DELETE",
 `Soft-deleted expense ID ${id}`,
 "Expenses",
 id,
 JSON.stringify({ expenseId: id, oldRecord: target, action: "soft_delete" }),
 );
 showToastMsg("Expense log deleted successfully.", "info");
 };

 const handleExportPLCsv = (opexByCategory: Record<string, number>) => {
 const csvRows = [
 ["TilePoint ERP - PROFIT & LOSS STATEMENT"],
 [`Showroom/Branch: ${selectedBranchId === "all" ? "Consolidated (All Branches)" : getBranchName(selectedBranchId)}`],
 [`Report Period: Active Financial Ledger Boundaries`],
 [`Generated On: ${new Date().toLocaleString()}`],
 [],
 ["Line Item", "Debits / Outflows", "Credits / Inflows", "Balance (PHP)"],
 ["1. OPERATING REVENUE"],
 [" Gross Sales (Subtotal)", "", metrics.grossSubtotal.toFixed(2), metrics.grossSubtotal.toFixed(2)],
 [" VAT/Sales Tax Collected", "", metrics.vatCollected.toFixed(2), metrics.vatCollected.toFixed(2)],
 [" Less: Discounts Allowed", `-${metrics.discountsAllowed.toFixed(2)}`, "", `-${metrics.discountsAllowed.toFixed(2)}`],
 [" NET SALES REVENUE (A)", "", "", metrics.grossRevenue.toFixed(2)],
 [],
 ["2. COST OF SALES (COGS)"],
 [" Wholesale Inventory Base Cost", `-${metrics.cogs.toFixed(2)}`, "", `-${metrics.cogs.toFixed(2)}`],
 [" TOTAL COST OF SALES (B)", "", "", `-${metrics.cogs.toFixed(2)}`],
 [],
 ["3. GROSS PROFIT (C = A - B)", "", "", (metrics.grossRevenue - metrics.cogs).toFixed(2)],
 [],
 ["4. OPERATING EXPENSES (OPEX)"],
 ...Object.entries(opexByCategory).map(([cat, val]) => [
 ` ${cat}`, `-${val.toFixed(2)}`, "", `-${val.toFixed(2)}`
 ]),
 [" TOTAL OPERATING EXPENSES (D)", "", "", `-${metrics.opex.toFixed(2)}`],
 [],
 ["5. NON-OPERATING LOSSES / SHRINKAGE"],
 [" Inventory Damage & Breakage Write-offs", `-${metrics.damageLoss.toFixed(2)}`, "", `-${metrics.damageLoss.toFixed(2)}`],
 [" Shift Drawer Cash Shortages", `-${metrics.shiftShortage.toFixed(2)}`, "", `-${metrics.shiftShortage.toFixed(2)}`],
 [" Voided Receipts & Write-offs", `-${metrics.voidedLoss.toFixed(2)}`, "", `-${metrics.voidedLoss.toFixed(2)}`],
 [" TOTAL ADJUSTMENTS & LOSSES (E)", "", "", `-${metrics.shrinkage.toFixed(2)}`],
 [],
 ["6. NET INCOME / SURPLUS (F = C - D - E)", "", "", metrics.netProfit.toFixed(2)],
 [`Net Profit Margin: ${metrics.netMarginPercent.toFixed(2)}%`]
 ];

 const csvText = "\uFEFF" + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
 const filename = `TilePoint_PL_Statement_${selectedBranchId}_${new Date().toISOString().slice(0, 10)}.csv`;

 saveFileToBackup(csvText, filename, "Sales_Reports", "text/csv;charset=utf-8;")
 .then((res) => {
 showToastMsg(`P&L Statement saved successfully as ${res.path || filename}!`, "success");
 })
 .catch(() => {
 const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.setAttribute("download", filename);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 showToastMsg("P&L Statement exported to CSV successfully!", "success");
 });
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
 // Pre-indexed Map lookups for O(1) performance
 const saleItemsBySaleId = new Map<string, typeof saleItems>();
 if (saleItems) {
 saleItems.forEach((item) => {
 if (item.isDeleted) return;
 let list = saleItemsBySaleId.get(item.saleId);
 if (!list) {
 list = [];
 saleItemsBySaleId.set(item.saleId, list);
 }
 list.push(item);
 });
 }

 const productsById = new Map<string, (typeof products)[0]>();
 if (products) {
 products.forEach((p) => {
 if (!p.isDeleted) {
 productsById.set(p.id, p);
 }
 });
 }

 const activeSales = sales.filter((s) => {
 if (selectedBranchId !== "all" && s.branchId !== selectedBranchId) return false;
 return true;
 });

 const nonDeletedSales = activeSales.filter((s) => !s.isDeleted);
 const voidedSales = activeSales.filter((s) => s.isDeleted);

 // Gross Revenue
 const grossSalesCollected = nonDeletedSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
 const grossSalesSubtotal = nonDeletedSales.reduce((acc, s) => acc + (Number(s.subtotal) || 0), 0);
 const grossSalesVat = nonDeletedSales.reduce((acc, s) => acc + (Number(s.vat) || 0), 0);
 const grossSalesDiscount = nonDeletedSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);

 // COGS
 let calculatedCogs = 0;
 nonDeletedSales.forEach((sale) => {
 const items = saleItemsBySaleId.get(sale.id) || [];
 const modPercent = branchLandingModifiers[sale.branchId] ?? 2.5; // Default to 2.5% landing modifier if unconfigured
 items.forEach((item) => {
 const prod = productsById.get(item.productId);
 const baseCost = prod ? prod.costPrice : 0;
 calculatedCogs += item.quantity * baseCost * (1 + modPercent / 100);
 });
 });

 // Retrieve calendar payments from localStorage automatically
 const parsedInstallments: Record<string, { id: string, amount: number, date: string, notes?: string }[]> = (() => {
 try {
 const saved = localStorage.getItem("atpos_v2_payable_installments");
 return saved ? JSON.parse(saved) : {};
 } catch {
 return {};
 }
 })();

 const automatedPaymentsList: any[] = [];
 Object.entries(parsedInstallments).forEach(([poId, insts]) => {
 const bill = customBills?.find((b) => b.id === poId);
 const po = purchaseOrders?.find((p) => p.id === poId);
 
 const branchId = po?.branchId || "corporate";
 const title = bill?.title || po?.poNumber || `Payment (${poId})`;
 const category = bill ? "Utilities/Corporate Debt [Calendar]" : "Supplier Payment [Calendar]";
 
 if (selectedBranchId !== "all" && branchId !== selectedBranchId) return;

 insts.forEach((inst) => {
 automatedPaymentsList.push({
 id: inst.id,
 dateTime: inst.date,
 amount: inst.amount,
 recordedBy: "Automated Calendar Sync",
 category,
 notes: inst.notes || `Disbursement against ${title}`,
 branchId,
 isAutomated: true
 });
 });
 });

 // Operating Expenses (OpEx)
 const activeExpenses = expenses.filter((exp) => {
 if (exp.isDeleted) return false;
 if (selectedBranchId !== "all" && exp.branchId !== selectedBranchId) return false;
 return true;
 });

 const combinedExpensesList = [...activeExpenses, ...automatedPaymentsList];
 const totalOpex = combinedExpensesList.reduce((acc, exp) => acc + exp.amount, 0);

 // Shrink / System Loss Ledger
 const activeDamageLogs = damageLogs.filter((log) => {
 if (log.isDeleted) return false;
 if (selectedBranchId !== "all" && log.branchId !== selectedBranchId) return false;
 return true;
 });
  const totalDamageLoss = activeDamageLogs.reduce((acc, log) => {
    const prod = productsById.get(log.productId);
    if (!prod) return acc;
    const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
    return acc + (costPerUnit * Number(log.quantity || 0));
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

 const totalVoidsLoss = voidedSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
 const totalSystemLoss = totalDamageLoss + totalShiftShortage;

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
 combinedExpenses: combinedExpensesList,
 activeDamageLogs,
 activeShifts,
 voidedSales,
 };
 }, [sales, saleItems, products, damageLogs, shifts, branchLandingModifiers, selectedBranchId, expenses, customBills, purchaseOrders, productReturns]);

 const opexByCategory = useMemo(() => {
 const categories: Record<string, number> = {
 "Utilities & Energy": 0,
 "Logistics, Freight & Delivery": 0,
 "Packaging Materials": 0,
 "Local Marketing & Ads": 0,
 "Repairs & Showroom Maintenance": 0,
 "Supplier Payments (Calendar)": 0,
 "Utilities/Corporate Debt (Calendar)": 0,
 "Miscellaneous Expenses": 0,
 };

 metrics.combinedExpenses.forEach((exp) => {
 if (exp.category === "Utilities") {
 categories["Utilities & Energy"] += exp.amount;
 } else if (exp.category === "Logistics") {
 categories["Logistics, Freight & Delivery"] += exp.amount;
 } else if (exp.category === "Packaging") {
 categories["Packaging Materials"] += exp.amount;
 } else if (exp.category === "Marketing") {
 categories["Local Marketing & Ads"] += exp.amount;
 } else if (exp.category === "Repairs") {
 categories["Repairs & Showroom Maintenance"] += exp.amount;
 } else if (exp.category === "Supplier Payment [Calendar]") {
 categories["Supplier Payments (Calendar)"] += exp.amount;
 } else if (exp.category === "Utilities/Corporate Debt [Calendar]") {
 categories["Utilities/Corporate Debt (Calendar)"] += exp.amount;
 } else {
 categories["Miscellaneous Expenses"] += exp.amount;
 }
 });

 return categories;
 }, [metrics.combinedExpenses]);

 // Branch Rank calculation list
 const branchLeaderboard = useMemo(() => {
 // Retrieve calendar payments from localStorage automatically
 const parsedInstallments: Record<string, { id: string, amount: number, date: string, notes?: string }[]> = (() => {
 try {
 const saved = localStorage.getItem("atpos_v2_payable_installments");
 return saved ? JSON.parse(saved) : {};
 } catch {
 return {};
 }
 })();

 return branches.filter((b) => !b.isDeleted).map((branch) => {
 const branchSales = sales.filter((s) => s.branchId === branch.id && !s.isDeleted);
 const branchGross = branchSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
 
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

 // Automated calendar payments for this branch
 let branchAutomatedCalendarPayments = 0;
 Object.entries(parsedInstallments).forEach(([poId, insts]) => {
 const bill = customBills?.find((b) => b.id === poId);
 const po = purchaseOrders?.find((p) => p.id === poId);
 const bId = po?.branchId || "corporate";
 if (bId === branch.id) {
 insts.forEach((inst) => {
 branchAutomatedCalendarPayments += inst.amount;
 });
 }
 });

 const branchOpex = expenses
 .filter((exp) => !exp.isDeleted && exp.branchId === branch.id)
 .reduce((acc, exp) => acc + exp.amount, 0) + branchAutomatedCalendarPayments;

  const branchDamages = damageLogs
    .filter((log) => !log.isDeleted && log.branchId === branch.id)
    .reduce((acc, log) => {
      const prod = products.find((p) => p.id === log.productId);
      if (!prod) return acc;
      const costPerUnit = log.unitType === "Piece" ? (prod.costPrice / (prod.boxQuantity || 4)) : prod.costPrice;
      return acc + (costPerUnit * Number(log.quantity || 0));
    }, 0);

 const branchShiftShortages = shifts
 .filter((sh) => sh.branchId === branch.id)
 .reduce((acc, sh) => {
 const v = sh.variance ?? 0;
 return v < 0 ? acc + Math.abs(v) : acc;
 }, 0);

 const branchVoids = sales
 .filter((s) => s.isDeleted && s.branchId === branch.id)
 .reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);

 const branchLoss = branchDamages + branchShiftShortages;
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
 }, [branches, sales, saleItems, products, expenses, damageLogs, shifts, branchLandingModifiers, customBills, purchaseOrders]);

  const consolidatedSummary = useMemo(() => {
    const gross = branchLeaderboard.reduce((acc, b) => acc + b.gross, 0);
    const cogs = branchLeaderboard.reduce((acc, b) => acc + b.cogs, 0);
    const opex = branchLeaderboard.reduce((acc, b) => acc + b.opex, 0);
    const loss = branchLeaderboard.reduce((acc, b) => acc + b.loss, 0);
    const net = branchLeaderboard.reduce((acc, b) => acc + b.net, 0);
    const margin = gross > 0 ? (net / gross) * 100 : 0;

    return {
      id: "all",
      name: "Consolidated (All Branches)",
      gross,
      cogs,
      opex,
      loss,
      net,
      margin,
    };
  }, [branchLeaderboard]);

  return (
    <div className="space-y-6" id="isolated-accounting-console">
      {/* P&L Desk Top Header */}
      <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[24px] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-m3-primary/10 text-m3-primary rounded-2xl border border-m3-primary/20 shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-m3-on-surface tracking-tight uppercase">
                P&L Accounting Desk
              </h2>
            </div>
            <p className="text-xs text-m3-on-surface-variant font-medium mt-0.5">
              Consolidated enterprise profitability, landing cost management & ledger audit logs
            </p>
          </div>
        </div>

        {/* Header Controls: Branch Selector & Export Statement */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-m3-surface-lowest border border-m3-outline-variant/30 px-3 py-1.5 rounded-xl text-xs">
            <Building className="h-3.5 w-3.5 text-m3-primary shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-m3-on-surface focus:outline-none cursor-pointer text-xs pr-1"
            >
              <option value="all">Consolidated (All Branches)</option>
              {branches.filter(b => !b.isDeleted).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const opexCats: Record<string, number> = {};
              metrics.combinedExpenses.forEach(exp => {
                opexCats[exp.category] = (opexCats[exp.category] || 0) + exp.amount;
              });
              handleExportPLCsv(opexCats);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            title="Download formatted P&L CSV statement"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export P&L Statement</span>
          </button>
        </div>
      </div>

      {/* 1. FINANCIAL MODEL CARDS & REVENUE ALLOCATION */}
      <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[24px] p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-m3-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">
              Consolidated Financial Model
            </h3>
          </div>
          <span className="text-[10.5px] font-mono text-m3-on-surface-variant font-semibold">
            Target Viewport: {selectedBranchId === "all" ? "Consolidated All Branches" : getBranchName(selectedBranchId)}
          </span>
        </div>

        {/* 3 Main Metric Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gross Revenue */}
          <div className="bg-m3-surface-lowest border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant">Gross Revenue</span>
              <span className="text-[9.5px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase">
                INFLOW (+)
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                ₱{metrics.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10.5px] text-m3-on-surface-variant mt-1 font-medium">
                Discounts Offset: <span className="font-mono font-bold">₱{metrics.discountsAllowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </p>
            </div>
            <div className="text-[10px] text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/10 flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Consolidated Sales Volume</span>
            </div>
          </div>

          {/* Outflows & Deductions */}
          <div className="bg-m3-surface-lowest border border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant">Total Deductions</span>
              <span className="text-[9.5px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full font-bold uppercase">
                OUTFLOW (−)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 my-2.5">
              <div className="p-2 rounded-xl bg-m3-surface-low border border-m3-outline-variant/10">
                <span className="text-[9px] font-bold text-m3-on-surface-variant uppercase block">COGS</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs mt-0.5 block">
                  ₱{metrics.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-m3-surface-low border border-m3-outline-variant/10">
                <span className="text-[9px] font-bold text-m3-on-surface-variant uppercase block">OpEx</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs mt-0.5 block">
                  ₱{metrics.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-m3-surface-low border border-m3-outline-variant/10">
                <span className="text-[9px] font-bold text-m3-on-surface-variant uppercase block">Shrink</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs mt-0.5 block">
                  ₱{metrics.shrinkage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/10 flex items-center justify-between font-mono font-extrabold">
              <span className="uppercase text-[9px] text-m3-on-surface-variant font-sans">Sum Outflows</span>
              <span>₱{(metrics.cogs + metrics.opex + metrics.shrinkage).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Net Profit Result */}
          <div className={`bg-m3-surface-lowest border rounded-2xl p-4 flex flex-col justify-between transition-colors ${
            metrics.netProfit >= 0 ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface-variant">Net Earnings</span>
              <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                metrics.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400"
              }`}>
                {metrics.netProfit >= 0 ? "SURPLUS" : "DEFICIT"}
              </span>
            </div>
            <div className="my-3">
              <div className="text-2xl font-black font-mono tracking-tight">
                ₱{metrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-m3-on-surface">
                {metrics.netProfit >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span>Net Margin: {metrics.netMarginPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-[10px] text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/10 flex items-center gap-1.5 font-mono">
              <span className={`h-1.5 w-1.5 rounded-full ${metrics.netProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"} shrink-0`} />
              <span>Return on Enterprise Capital</span>
            </div>
          </div>
        </div>

        {/* Revenue Allocation Ratios Progress Bar */}
        {metrics.grossRevenue > 0 && (
          <div className="space-y-2 pt-2 border-t border-m3-outline-variant/15">
            <span className="text-[10px] text-m3-on-surface-variant font-black uppercase tracking-wider font-mono">
              Gross Revenue Allocation Breakdowns
            </span>
            <div className="w-full h-4.5 rounded-xl bg-m3-surface-lowest flex overflow-hidden shadow-inner text-[9px] font-black font-mono text-white text-center border border-m3-outline-variant/20">
              <div
                style={{ width: `${(metrics.cogs / metrics.grossRevenue) * 100}%` }}
                className="bg-amber-600/90 flex items-center justify-center min-w-[12px] transition-all"
                title={`COGS: ${((metrics.cogs / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.cogs / metrics.grossRevenue) * 100) >= 12 && `COGS (${((metrics.cogs / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
              <div
                style={{ width: `${(metrics.opex / metrics.grossRevenue) * 100}%` }}
                className="bg-rose-600/90 flex items-center justify-center min-w-[12px] transition-all"
                title={`OpEx: ${((metrics.opex / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.opex / metrics.grossRevenue) * 100) >= 12 && `OpEx (${((metrics.opex / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
              <div
                style={{ width: `${(metrics.shrinkage / metrics.grossRevenue) * 100}%` }}
                className="bg-red-700/95 flex items-center justify-center min-w-[12px] transition-all"
                title={`Loss: ${((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.shrinkage / metrics.grossRevenue) * 100) >= 12 && `Loss (${((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
              <div
                style={{ width: `${Math.max(0, (metrics.netProfit / metrics.grossRevenue) * 100)}%` }}
                className="bg-emerald-600/90 flex items-center justify-center min-w-[12px] transition-all"
                title={`Net Profit: ${((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(1)}%`}
              >
                {((metrics.netProfit / metrics.grossRevenue) * 100) >= 12 && `Margin (${((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(0)}%)`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-m3-on-surface-variant font-medium pt-0.5 justify-center">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-600/90 shrink-0" /> COGS Base ({((metrics.cogs / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600/90 shrink-0" /> OpEx ({((metrics.opex / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-700/95 shrink-0" /> Loss/Shrink ({((metrics.shrinkage / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600/90 shrink-0" /> Net Surplus ({((metrics.netProfit / metrics.grossRevenue) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. PROFIT ANALYTICS TIMELINE & GRAPH */}
      <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[24px] p-2 shadow-sm">
        <ProfitAnalytics
          darkMode={darkMode}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          getBranchName={getBranchName}
          showToastMsg={showToastMsg}
        />
      </div>

      {/* 3. MULTI-BRANCH COMPARISON & OPERATIONAL AUDIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Branch Leaderboard & Landing Cost Multipliers */}
        <div className="lg:col-span-7 space-y-6">
          {/* Branch Leaderboard */}
          <div className="p-5 sm:p-6 bg-m3-surface-low border border-m3-outline-variant/30 shadow-sm rounded-[24px] space-y-4">
            <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4.5 w-4.5 text-m3-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">
                  Branch Profitability Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBranchId("all")}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedBranchId === "all"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm"
                    : "bg-m3-surface-lowest text-m3-on-surface-variant border-m3-outline-variant/30 hover:bg-m3-primary/10"
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Consolidated All</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-m3-outline-variant/20 text-m3-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-2">Branch Profile</th>
                    <th className="py-2 text-right">Gross Rev</th>
                    <th className="py-2 text-right">COGS</th>
                    <th className="py-2 text-right">OpEx</th>
                    <th className="py-2 text-right">System Loss</th>
                    <th className="py-2 text-right">Net Profit</th>
                    <th className="py-2 text-right pr-1">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10">
                  {/* Consolidated Enterprise Row */}
                  <tr
                    className={`transition-colors cursor-pointer border-b-2 border-m3-outline-variant/25 ${
                      selectedBranchId === "all"
                        ? "bg-m3-primary/10 font-black text-m3-primary"
                        : "hover:bg-m3-primary/5 bg-m3-surface-lowest/50 font-bold text-m3-on-surface"
                    }`}
                    onClick={() => setSelectedBranchId("all")}
                  >
                    <td className="py-2.5 font-extrabold flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                        ALL
                      </span>
                      <span className="truncate">{consolidatedSummary.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold">₱{consolidatedSummary.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{consolidatedSummary.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{consolidatedSummary.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{consolidatedSummary.loss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className={`py-2.5 text-right font-mono font-black ${consolidatedSummary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      ₱{consolidatedSummary.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`py-2.5 text-right pr-1 font-mono font-black ${consolidatedSummary.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {consolidatedSummary.margin.toFixed(1)}%
                    </td>
                  </tr>

                  {branchLeaderboard.map((item, index) => {
                    const rankBadge = index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : `#${index + 1}`;
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-m3-primary/5 transition-colors cursor-pointer ${
                          selectedBranchId === item.id ? "bg-m3-primary/10 font-extrabold text-m3-primary" : ""
                        }`}
                        onClick={() => setSelectedBranchId(selectedBranchId === item.id ? "all" : item.id)}
                      >
                        <td className="py-2.5 font-semibold flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-m3-on-surface-variant">{rankBadge}</span>
                          <span className="truncate">{item.name}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono">₱{item.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{item.cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{item.opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 text-right font-mono text-m3-on-surface-variant">₱{item.loss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={`py-2.5 text-right font-mono font-black ${item.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          ₱{item.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`py-2.5 text-right pr-1 font-mono font-black ${item.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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

            <p className="text-[10px] text-m3-on-surface-variant italic pt-2 border-t border-m3-outline-variant/10 text-center font-sans">
              Click any branch row or Consolidated to isolate analytics for that location.
            </p>
          </div>

          {/* Landing Cost Multipliers Panel */}
          <div className="p-5 sm:p-6 bg-m3-surface-low border border-m3-outline-variant/30 shadow-sm rounded-[24px] space-y-4">
            <div className="flex items-center gap-2 border-b border-m3-outline-variant/15 pb-3">
              <Sliders className="h-4.5 w-4.5 text-m3-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">
                Branch Landing Cost Multipliers
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {branches.filter((b) => !b.isDeleted).map((b) => {
                const currentModifier = branchLandingModifiers[b.id] ?? 2.5;
                const isEditing = editingBranchId === b.id;

                return (
                  <div key={b.id} className="p-3 rounded-xl bg-m3-surface-lowest border border-m3-outline-variant/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-m3-on-surface truncate">{b.name}</span>
                      <span className="text-[10.5px] font-mono font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        {currentModifier}%
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editingValue ?? ''}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-full bg-m3-surface-low border border-m3-outline-variant/30 rounded-lg text-xs p-1.5 font-mono text-center text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="2.5"
                        />
                        <button
                          type="button"
                          onClick={() => handleModifierSave(b.id)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[10px] font-black uppercase rounded-lg cursor-pointer shrink-0 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBranchId(null)}
                          className="px-2.5 py-1.5 bg-m3-surface-low text-m3-on-surface-variant text-[10px] font-bold uppercase rounded-lg cursor-pointer shrink-0 transition-colors"
                        >
                          Esc
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBranchId(b.id);
                            setEditingValue(currentModifier.toString());
                          }}
                          className="text-[9.5px] uppercase font-black tracking-wider text-m3-primary hover:underline cursor-pointer"
                        >
                          Configure
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed font-sans">
              <strong>Cost Accounting Rule</strong>: COGS is calculated by taking the product base wholesale cost and adding this percentage. Always verify actual shipping receipts before overriding values.
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Expenses Intake Form & Tabbed Audit Streams */}
        <div className="lg:col-span-5 space-y-6">
          {/* Record Branch Expenses Form */}
          <div className="p-5 sm:p-6 bg-m3-surface-low border border-m3-outline-variant/30 shadow-sm rounded-[24px]">
            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-m3-outline-variant/15 pb-3">
                <Plus className="h-4.5 w-4.5 text-m3-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-m3-on-surface">
                  Record Branch Expenses
                </h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-m3-on-surface-variant">Target Showroom Branch</label>
                <select
                  value={expenseBranch ?? ''}
                  onChange={(e) => setExpenseBranch(e.target.value)}
                  className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary cursor-pointer font-medium"
                >
                  {branches.filter(b => !b.isDeleted).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-m3-on-surface-variant">Expense Category</label>
                  <select
                    value={expenseCategory ?? ''}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary cursor-pointer font-medium"
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
                  <label className="text-[10px] font-extrabold uppercase text-m3-on-surface-variant">Amount (PHP)</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={expenseAmount ?? ''}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-m3-on-surface-variant">Audit Notes / Itemized Details</label>
                <textarea
                  placeholder="E.g., June electricity bill, Meralco invoice #..."
                  value={expenseNotes ?? ''}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs px-3 py-2 rounded-xl text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense Log</span>
              </button>
            </form>
          </div>

          {/* Detailed Tabbed Audit Streams */}
          <div className="p-5 sm:p-6 bg-m3-surface-low border border-m3-outline-variant/30 shadow-sm rounded-[24px] space-y-4">
            <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
              <div className="flex bg-m3-surface-lowest p-1 rounded-xl border border-m3-outline-variant/20 text-xs font-bold gap-1 flex-wrap w-full">
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("damage")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] ${
                    activeLedgerTab === "damage" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-m3-on-surface-variant hover:text-m3-on-surface"
                  }`}
                >
                  Damage Write-offs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("shift-shortages")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] ${
                    activeLedgerTab === "shift-shortages" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-m3-on-surface-variant hover:text-m3-on-surface"
                  }`}
                >
                  Shift Variance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("voids")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] ${
                    activeLedgerTab === "voids" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-m3-on-surface-variant hover:text-m3-on-surface"
                  }`}
                >
                  Voids Log
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("expenses")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] ${
                    activeLedgerTab === "expenses" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-m3-on-surface-variant hover:text-m3-on-surface"
                  }`}
                >
                  Expenses List
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("csv-logger")}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-[11px] ${
                    activeLedgerTab === "csv-logger" ? "bg-m3-primary text-m3-on-primary font-black shadow" : "text-m3-on-surface-variant hover:text-m3-on-surface"
                  }`}
                >
                  CSV Logs
                </button>
              </div>
            </div>

            {/* TAB PANELS */}
            <div className="max-h-72 overflow-y-auto pr-1">
              {/* Tab: Damage logs write-offs */}
              {activeLedgerTab === "damage" && (
                <div className="space-y-2">
                  {metrics.activeDamageLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-m3-on-surface">{log.productName}</div>
                        <div className="text-[10px] text-m3-on-surface-variant mt-0.5 font-mono">
                          Quantity: {log.quantity} {log.unitType || "Pieces"} • Reason: <span className="text-red-600 dark:text-red-400 font-bold uppercase">{log.reason || "BROKEN"}</span>
                        </div>
                      </div>
                      <div className="font-mono text-rose-600 dark:text-rose-400 font-bold shrink-0">
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
                    <p className="text-center py-6 text-m3-on-surface-variant text-xs italic">No damage write-off entries logged under this branch.</p>
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
                      <div key={sh.id} className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-m3-on-surface">Cashier: {sh.cashierName}</div>
                          <div className="text-[10px] text-m3-on-surface-variant mt-0.5 font-mono">
                            Opened: {sh.openedAt && !isNaN(new Date(sh.openedAt).getTime()) ? new Date(sh.openedAt).toLocaleDateString() : "N/A"} • Branch: {getBranchName(sh.branchId)}
                          </div>
                        </div>
                        <div className={`font-mono font-black ${isShortage ? "text-rose-600 dark:text-rose-400" : isOverage ? "text-emerald-600 dark:text-emerald-400" : "text-m3-on-surface-variant"}`}>
                          {sh.variance !== undefined ? (
                            sh.variance < 0 ? `-₱${Math.abs(sh.variance).toLocaleString()}` : `+₱${sh.variance.toLocaleString()}`
                          ) : "₱0"}
                        </div>
                      </div>
                    );
                  })}
                  {metrics.activeShifts.length === 0 && (
                    <p className="text-center py-6 text-m3-on-surface-variant text-xs italic">No closed shift variance logs available.</p>
                  )}
                </div>
              )}

              {/* Tab: Voids */}
              {activeLedgerTab === "voids" && (
                <div className="space-y-2">
                  {metrics.voidedSales.map((sale) => (
                    <div key={sale.id} className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-m3-on-surface">Invoice: {sale.saleNumber}</div>
                        <div className="text-[10px] text-m3-on-surface-variant mt-0.5 font-mono">
                          Voided At: {sale.deletedAt && !isNaN(new Date(sale.deletedAt).getTime()) ? new Date(sale.deletedAt).toLocaleDateString() : "Unknown"} • Branch: {getBranchName(sale.branchId)}
                        </div>
                      </div>
                      <div className="font-mono text-m3-on-surface font-black shrink-0">
                        ₱{sale.grandTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {metrics.voidedSales.length === 0 && (
                    <p className="text-center py-6 text-m3-on-surface-variant text-xs italic">No supervisor-voided invoices logged.</p>
                  )}
                </div>
              )}

              {/* Tab: Expenses register */}
              {activeLedgerTab === "expenses" && (
                <div className="space-y-2">
                  {metrics.combinedExpenses
                    .slice()
                    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                    .map((exp) => (
                      <div key={exp.id} className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-m3-on-surface">{exp.category}</span>
                            <span className="text-[9px] bg-m3-surface-low text-m3-on-surface-variant px-1.5 py-0.2 rounded-md font-mono">{getBranchName(exp.branchId)}</span>
                          </div>
                          <p className="text-[10px] text-m3-on-surface-variant mt-0.5">{exp.notes || "Itemized expense receipt"}</p>
                          <span className="text-[9.5px] text-m3-on-surface-variant block font-mono mt-0.5">Recorded: {exp.dateTime && !isNaN(new Date(exp.dateTime).getTime()) ? new Date(exp.dateTime).toLocaleDateString() : "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">₱{exp.amount.toLocaleString()}</span>
                          {!exp.isAutomated ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-m3-on-surface-variant hover:text-rose-500 cursor-pointer text-[10px] font-bold"
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="text-[10px] text-m3-on-surface-variant font-medium italic">Lock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  {metrics.combinedExpenses.length === 0 && (
                    <p className="text-center py-6 text-m3-on-surface-variant text-xs italic">No expenses recorded for this viewport assignment.</p>
                  )}
                </div>
              )}

              {/* Tab: CSV Master Logger */}
              {activeLedgerTab === "csv-logger" && (
                <div className="space-y-3">
                  <div className="p-3 bg-m3-surface-lowest border border-m3-outline-variant/20 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-m3-primary">
                        Transaction History Master CSV
                      </span>
                      <span className="text-[10px] font-mono bg-m3-surface-low text-m3-on-surface-variant px-2 py-0.5 rounded">
                        Sorted Chronologically
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const csv = generateTransactionCsv(sales, saleItems, branches);
                          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Transaction_History_Master_Log_${new Date().toISOString().slice(0, 10)}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToastMsg("Exported Master Transaction History CSV", "success");
                        }}
                        className="px-3 py-1.5 bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary text-[10px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          downloadWindowsLauncherScript();
                          showToastMsg("Downloaded TilePoint Windows Launcher (.cmd)", "info");
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Terminal className="h-3 w-3" />
                        <span>Windows Launcher (.cmd)</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-m3-on-surface-variant" />
                    <input
                      type="text"
                      placeholder="Filter logs by Invoice #, Cashier, Customer..."
                      value={csvSearchQuery ?? ''}
                      onChange={(e) => setCsvSearchQuery(e.target.value)}
                      className="w-full bg-m3-surface-lowest border border-m3-outline-variant/30 text-xs pl-8 pr-3 py-1.5 rounded-xl text-m3-on-surface focus:outline-none focus:ring-1 focus:ring-m3-primary"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {(() => {
                      const sorted = [...sales]
                        .filter((s) => !s.isDeleted)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      const filtered = sorted.filter((s) => {
                        if (!csvSearchQuery.trim()) return true;
                        const q = csvSearchQuery.toLowerCase();
                        return (
                          (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
                          (s.cashierName && s.cashierName.toLowerCase().includes(q)) ||
                          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
                          (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <p className="text-center py-6 text-m3-on-surface-variant text-xs italic">
                            No transaction logs match search criteria.
                          </p>
                        );
                      }

                      return filtered.slice(-15).reverse().map((s) => {
                        const dt = new Date(s.createdAt);
                        const timeFormatted = !isNaN(dt.getTime())
                          ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                          : s.createdAt;
                        const dateFormatted = !isNaN(dt.getTime())
                          ? dt.toLocaleDateString()
                          : s.createdAt.slice(0, 10);

                        return (
                          <div
                            key={s.id}
                            className="p-2.5 bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-xl flex items-center justify-between text-xs hover:border-m3-primary/30 transition-all"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-m3-primary">{s.saleNumber || s.id}</span>
                                <span className="text-[10px] font-mono bg-m3-surface-low text-m3-on-surface-variant px-1.5 py-0.2 rounded">
                                  {timeFormatted} ({dateFormatted})
                                </span>
                              </div>
                              <div className="text-[10px] text-m3-on-surface-variant flex items-center gap-1.5 font-mono">
                                <span>Cashier: {s.cashierName || "System"}</span>
                                <span>•</span>
                                <span className="uppercase font-bold">{s.paymentMethod}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 font-mono">
                              <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                                ₱{(s.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

