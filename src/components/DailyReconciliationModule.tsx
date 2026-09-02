/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
AlertCircle,
AlertTriangle,
ArrowRight,
CheckCircle2,
ChevronDown,
ChevronUp,
Coins,
Copy,
Download,
FileCheck,
FileSpreadsheet,
Mail,
Receipt,
Share2,
ShieldCheck,
TrendingDown,
TrendingUp
} from "lucide-react";
import { motion } from "motion/react";
import React,{ useEffect,useMemo,useState } from "react";
import { encryptString,getSecuritySecretKey,useDb } from "../context/DbContext";
import { saveFileToBackup } from "../lib/fileBackupHelper";
import { UserRole } from "../types/db";
import { ToastNotification } from "./ToastNotification";
import { HeaderBar } from "./common/HeaderBar";
import { HeroDropdownSelect } from "./common/ui/HeroDropdown";

interface DailyReconciliationModuleProps {
  darkMode?: boolean;
  _darkMode?: boolean;
}

export const DailyReconciliationModule: React.FC<DailyReconciliationModuleProps> = ({ darkMode, _darkMode }) => {
  const {
    currentUser,
    branches,
    sales,
    saleItems,
    products,
    expenses,
    addAuditLog
  } = useDb();

  // Selected date for reconciliation
  const [reportingDate, setReportingDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Local active branch when compiling (only admins/HQ can toggle this; branch personnel are locked)
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return currentUser?.branchAssignmentId || "B1";
  });

  // Expand states for detailed tables
  const [showSalesList, setShowSalesList] = useState(true);
  const [showExpensesList, setShowExpensesList] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Reconciliation Checklists
  const [checks, setChecks] = useState({
    salesMatch: false,
    expensesDocumented: false,
    cogsVerified: false,
  });

  // Local state for reconciled days
  const [reconciledDays, setReconciledDays] = useState<Record<string, { verifiedAt: string; verifiedBy: string }>>({});

  useEffect(() => {
    const saved = localStorage.getItem("tp_daily_reconciliations");
    if (saved) {
      try {
        setReconciledDays(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse reconciliations", e);
      }
    }
  }, []);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Get current branch metadata with fallback
  const currentBranchMeta = useMemo(() => {
    const id = currentUser?.role === UserRole.ADMIN ? selectedBranchId : (currentUser?.branchAssignmentId || "B1");
    const found = (branches || []).find((b) => b?.id === id) || (branches || [])[0];
    return found || {
      id: id || "B1",
      name: "Main Branch",
      manager: "",
      address: "",
      phone: "",
      monthlySales: 0,
      staffCount: 0,
      activeCashiers: 0,
    };
  }, [branches, currentUser, selectedBranchId]);

  // Reconciliation Key for local storage
  const reconciliationKey = `${currentBranchMeta?.id || "B1"}_${reportingDate}`;
  const isReconciled = !!reconciledDays[reconciliationKey];
  const reconciliationInfo = reconciledDays[reconciliationKey];

  // Compile calculations
  const stats = useMemo(() => {
    const targetBranchId = currentBranchMeta?.id || "B1";

    const allSales = sales || [];
    const allSaleItems = saleItems || [];
    const allProducts = products || [];
    const allExpenses = expenses || [];

    // Filter non-voided sales for this branch and date
    const localSales = allSales.filter((s) => {
      if (!s || s.isDeleted) return false;
      if (s.branchId !== targetBranchId) return false;
      return s.createdAt && s.createdAt.split("T")[0] === reportingDate;
    });

    const localSaleItems = allSaleItems.filter((item) => {
      if (!item) return false;
      const parentSale = allSales.find((s) => s && s.id === item.saleId);
      return (
        parentSale &&
        parentSale.branchId === targetBranchId &&
        !parentSale.isDeleted &&
        parentSale.createdAt &&
        parentSale.createdAt.split("T")[0] === reportingDate
      );
    });

    // Compute revenue, discounts, vat
    const totalRevenue = localSales.reduce((acc, s) => acc + (Number(s.grandTotal) || 0), 0);
    const totalSubtotal = localSales.reduce((acc, s) => acc + (Number(s.subtotal) || 0), 0);
    const totalVat = localSales.reduce((acc, s) => acc + (Number(s.vat) || 0), 0);
    const totalDiscount = localSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);

    // Compute COGS
    let totalCogs = 0;
    const saleItemCogsMap: Record<string, { cogs: number; items: any[] }> = {};

    localSales.forEach((s) => {
      if (!s) return;
      let saleCogs = 0;
      const itemsForSale = localSaleItems.filter((item) => item && item.saleId === s.id);

      itemsForSale.forEach((item) => {
        const prod = allProducts.find((p) => p && p.id === item.productId);
        // Fallback to 60% of unitPrice if costPrice is 0 or missing
        const unitCost = prod && prod.costPrice > 0 ? prod.costPrice : (item.unitPrice || 0) * 0.6;
        const itemCogs = unitCost * (item.quantity || 0);
        saleCogs += itemCogs;
        totalCogs += itemCogs;
      });

      saleItemCogsMap[s.id] = {
        cogs: saleCogs,
        items: itemsForSale,
      };
    });

    // Expenses for the branch on selected date
    const branchExpenses = allExpenses.filter((e) => {
      if (!e || e.isDeleted) return false;
      if (e.branchId !== targetBranchId) return false;
      return e.dateTime && e.dateTime.split("T")[0] === reportingDate;
    });

    const totalExpenses = branchExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      sales: localSales,
      saleItems: localSaleItems,
      count: localSales.length,
      revenue: totalRevenue,
      subtotal: totalSubtotal,
      vat: totalVat,
      discount: totalDiscount,
      cogs: totalCogs,
      grossProfit,
      netProfit,
      expenses: branchExpenses,
      totalExpenses,
      saleItemCogsMap,
    };
  }, [sales, saleItems, products, expenses, currentBranchMeta, reportingDate]);

  // Auto-reset checklists when changing date or branch
  useEffect(() => {
    setChecks({
      salesMatch: false,
      expensesDocumented: false,
      cogsVerified: false,
    });
  }, [reportingDate, selectedBranchId]);

  // Certify Daily figures
  const handleCertify = () => {
    if (!checks.salesMatch || !checks.expensesDocumented || !checks.cogsVerified) {
      triggerToast("Please verify and check all items on the reconciliation checklist before certifying.", "error");
      return;
    }

    const payload = {
      verifiedAt: new Date().toISOString(),
      verifiedBy: `${currentUser?.fullName || "User"} (${currentUser?.role || "Staff"})`,
    };

    const updated = {
      ...reconciledDays,
      [reconciliationKey]: payload,
    };

    setReconciledDays(updated);
    localStorage.setItem("tp_daily_reconciliations", JSON.stringify(updated));

    addAuditLog(
      "DAILY_RECONCILIATION_CERTIFIED",
      `Manager Certified daily reconciliation for ${currentBranchMeta?.name || "Branch"} on ${reportingDate}. Revenue: ₱${stats.revenue.toLocaleString()}, COGS: ₱${stats.cogs.toLocaleString()}, Expenses: ₱${stats.totalExpenses.toLocaleString()}, Net Profit: ₱${stats.netProfit.toLocaleString()}`,
      "DailyReconciliation",
      reconciliationKey
    );

    triggerToast(`Daily reconciliation certified successfully for ${reportingDate}!`, "success");
  };

  // Download cryptographic signed report for manual transmission
  const handleDownloadSignedReport = () => {
    const secureKey = getSecuritySecretKey();

    const reportPayload = {
      version: "1.2-reconciled",
      branchId: currentBranchMeta?.id || "B1",
      branchName: currentBranchMeta?.name || "Main Branch",
      reportingDate,
      compiledAt: new Date().toISOString(),
      compiledBy: currentUser?.fullName || "User",
      compiledByRole: currentUser?.role || "Staff",
      reconciliationStatus: "Certified Reconciled",
      certifiedBy: reconciliationInfo?.verifiedBy || currentUser?.fullName || "User",
      certifiedAt: reconciliationInfo?.verifiedAt || new Date().toISOString(),
      financials: {
        totalReceipts: stats.count,
        subtotal: stats.subtotal,
        discount: stats.discount,
        vat: stats.vat,
        revenue: stats.revenue,
        cogs: stats.cogs,
        grossProfit: stats.grossProfit,
        totalExpenses: stats.totalExpenses,
        netProfit: stats.netProfit,
      },
      sales: stats.sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        shiftId: s.shiftId || "SHIFT-1",
        branchId: s.branchId || currentBranchMeta?.id || "B1",
        cashierId: s.cashierId || "U1",
        cashierName: s.cashierName || "Cashier",
        customerName: s.customerName || "Walk-in Customer",
        subtotal: s.subtotal ?? s.grandTotal ?? 0,
        vat: s.vat ?? 0,
        discount: s.discount ?? 0,
        grandTotal: s.grandTotal ?? s.subtotal ?? 0,
        paymentMethod: s.paymentMethod || "Cash",
        amountTendered: s.amountTendered ?? s.grandTotal ?? 0,
        changeAmount: s.changeAmount ?? 0,
        createdAt: s.createdAt || new Date().toISOString(),
        calculatedCogs: stats.saleItemCogsMap[s.id]?.cogs || 0,
      })),
      saleItems: (saleItems || []).filter((si) => stats.sales.some((s) => s.id === si.saleId)),
      expenses: stats.expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        recordedBy: e.recordedBy,
        notes: e.notes,
        dateTime: e.dateTime,
      })),
    };

    try {
      const encryptedData = encryptString(JSON.stringify(reportPayload), secureKey);
      
      const fileContent = JSON.stringify({
        integritySign: "TILEPOINT_SECURE_RECONCILED_LEDGER_V1",
        checksum: btoa(reportingDate + (currentBranchMeta?.id || "B1") + stats.revenue),
        signedBy: currentUser?.fullName || "User",
        branchId: currentBranchMeta?.id || "B1",
        date: reportingDate,
        payload: encryptedData
      }, null, 2);

      const filename = `RECONCILED_SALES_${currentBranchMeta?.id || "B1"}_${reportingDate}.json`;
      
      saveFileToBackup(fileContent, filename, "Sales_Reports").then((res) => {
        triggerToast(`Signed JSON Reconciled packet saved successfully to: ${res.path || filename}!`, "success");
      });
    } catch (err) {
      console.error("Signed report download failed", err);
      triggerToast("Failed to compile or sign report.", "error");
    }
  };

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, successMessage: string) => {
    let success = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (err) {
      console.warn("Modern clipboard API failed, using fallback:", err);
    }

    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        success = true;
      } catch (err) {
        console.warn("Fallback copy failed:", err);
      }
    }

    if (success) {
      triggerToast(successMessage, "success");
    } else {
      triggerToast("Failed to copy to clipboard", "error");
    }
  };

  // Compile reactive shared payload text for transmission and clipboard share
  const sharePayloadText = useMemo(() => {
    if (!isReconciled) return "";
    const secureKey = getSecuritySecretKey();

    const reportPayload = {
      version: "1.2-reconciled",
      branchId: currentBranchMeta?.id || "B1",
      branchName: currentBranchMeta?.name || "Main Branch",
      reportingDate,
      compiledAt: new Date().toISOString(),
      compiledBy: currentUser?.fullName || "User",
      compiledByRole: currentUser?.role || "Staff",
      reconciliationStatus: "Certified Reconciled",
      certifiedBy: reconciliationInfo?.verifiedBy || currentUser?.fullName || "User",
      certifiedAt: reconciliationInfo?.verifiedAt || new Date().toISOString(),
      financials: {
        totalReceipts: stats.count,
        subtotal: stats.subtotal,
        discount: stats.discount,
        vat: stats.vat,
        revenue: stats.revenue,
        cogs: stats.cogs,
        grossProfit: stats.grossProfit,
        totalExpenses: stats.totalExpenses,
        netProfit: stats.netProfit,
      },
      sales: stats.sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        shiftId: s.shiftId || "SHIFT-1",
        branchId: s.branchId || currentBranchMeta?.id || "B1",
        cashierId: s.cashierId || "U1",
        cashierName: s.cashierName || "Cashier",
        customerName: s.customerName || "Walk-in Customer",
        subtotal: s.subtotal ?? s.grandTotal ?? 0,
        vat: s.vat ?? 0,
        discount: s.discount ?? 0,
        grandTotal: s.grandTotal ?? s.subtotal ?? 0,
        paymentMethod: s.paymentMethod || "Cash",
        amountTendered: s.amountTendered ?? s.grandTotal ?? 0,
        changeAmount: s.changeAmount ?? 0,
        createdAt: s.createdAt || new Date().toISOString(),
        calculatedCogs: stats.saleItemCogsMap[s.id]?.cogs || 0,
      })),
      saleItems: (saleItems || []).filter((si) => stats.sales.some((s) => s.id === si.saleId)),
      expenses: stats.expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        recordedBy: e.recordedBy,
        notes: e.notes,
        dateTime: e.dateTime,
      })),
    };

    try {
      const encryptedData = encryptString(JSON.stringify(reportPayload), secureKey);
      
      return JSON.stringify({
        integritySign: "TILEPOINT_SECURE_RECONCILED_LEDGER_V1",
        checksum: btoa(reportingDate + (currentBranchMeta?.id || "B1") + stats.revenue),
        signedBy: currentUser?.fullName || "User",
        branchId: currentBranchMeta?.id || "B1",
        date: reportingDate,
        payload: encryptedData
      }, null, 2);
    } catch (e) {
      console.error("Payload compilation error", e);
      return "";
    }
  }, [isReconciled, currentBranchMeta, reportingDate, stats, currentUser, reconciliationInfo, saleItems]);

  return (
    <div className="space-y-6 text-default-500">
      {/* Toast */}
      <ToastNotification
        message={toast?.message || null}
        type={toast?.type || "success"}
        onClose={() => setToast(null)}
      />

      {/* Header Banner */}
      <HeaderBar
        title="Daily Sales Reconciliation Desk"
        subtitle="Review, audit, certify, and compile secure end-of-day sales packets for corporate synchronization."
        icon={Receipt}
        badge={{
          text: isReconciled ? "Certified & Verified" : "Pending Audit",
          variant: isReconciled ? "secondary" : "accent"
        }}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto shrink-0">
            {currentUser?.role === UserRole.ADMIN && (
              <div className="flex items-center gap-2 shrink-0">
                <HeroDropdownSelect
                  startIcon={<span className="text-[10px] font-black uppercase text-primary tracking-widest">Branch:</span>}
                  items={(branches || []).map((b) => ({
                    key: b.id,
                    label: b.name.toUpperCase(),
                  }))}
                  selectedKey={selectedBranchId ?? ''}
                  onSelectionChange={(val) => setSelectedBranchId(val)}
                  size="sm"
                  variant="pill"
                  className="min-w-[160px]"
                />
              </div>
            )}

            <div className="flex items-center gap-2 bg-content2/60 border border-divider/30 p-1.5 rounded-xl shadow-sm pl-3 pr-2 shrink-0">
              <span className="text-[10px] font-black uppercase text-default-500 tracking-widest">
                Date:
              </span>
              <input
                type="date"
                value={reportingDate ?? ''}
                onChange={(e) => setReportingDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="text-xs bg-background text-foreground font-black tracking-wide border-0 focus:outline-none py-1 px-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        }
      />

      {/* Main KPI Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-content1 border border-divider/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Gross Revenue
            </span>
            <span className="text-2xl font-black text-foreground mt-1 block">
              ₱{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-default-500 border-t border-divider/15 pt-2">
            <Receipt className="h-3.5 w-3.5 text-default-500" />
            <span>{stats.count} Invoices</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="p-5 rounded-2xl bg-content1 border border-divider/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            <span className="text-2xl font-black text-amber-500 mt-1 block">
              ₱{stats.cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-default-500 border-t border-divider/15 pt-2">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span>Margin: {stats.revenue > 0 ? ((1 - stats.cogs / stats.revenue) * 100).toFixed(1) : "0.0"}%</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-content1 border border-divider/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              ₱{stats.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-default-500 border-t border-divider/15 pt-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>{stats.revenue > 0 ? ((stats.grossProfit / stats.revenue) * 100).toFixed(1) : "0.0"}% of Revenue</span>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="p-5 rounded-2xl bg-content1 border border-divider/10 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-default-500 block uppercase tracking-wider">
              Operating Expenses
            </span>
            <span className="text-2xl font-black text-rose-400 mt-1 block">
              ₱{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-default-500 border-t border-divider/15 pt-2">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            <span>{stats.expenses.length} Expense Records</span>
          </div>
        </div>

        {/* Net Daily profit */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          stats.netProfit >= 0
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-rose-500/5 border-rose-500/20"
        }`}>
          <div>
            <span className="text-[10px] font-black text-foreground block uppercase tracking-wider">
              Net Profit / Loss
            </span>
            <span className={`text-2xl font-black mt-1 block ${
              stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              ₱{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
 <div className="flex items-center gap-2 mt-4 text-[10px] border-t border-divider/15 pt-2 ">
            {stats.netProfit >= 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold uppercase text-[9px] tracking-wider">Positive Margin</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-rose-400 font-bold uppercase text-[9px] tracking-wider">Deficit Margin</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Breakdown Bar Chart */}
      <div className="p-6 rounded-2xl bg-content1 border border-divider/10 space-y-4">
        <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span>Profit & Loss Visual Flow Reconciliation</span>
        </h3>

        {stats.revenue === 0 ? (
          <div className="py-8 text-center text-default-500 text-xs italic">
            No sales or expenses data available for this date to display the breakdown.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
 <div className="flex justify-between text-[11px] font-bold text-default-500 uppercase ">
                <span>Revenue Allocation breakdown</span>
                <span>₱{stats.revenue.toLocaleString()}</span>
              </div>
 <div className="h-6 w-full bg-content1 rounded-lg overflow-hidden flex text-[10px] font-black text-white ">
                {stats.cogs > 0 && (
                  <div
                    style={{ width: `${Math.min(100, (stats.cogs / stats.revenue) * 100)}%` }}
                    className="bg-amber-600/60 flex items-center justify-center border-r border-divider px-1 truncate"
                    title={`COGS: ₱${stats.cogs.toLocaleString()}`}
                  >
                    COGS ({((stats.cogs / stats.revenue) * 100).toFixed(0)}%)
                  </div>
                )}
                {stats.totalExpenses > 0 && (
                  <div
                    style={{ width: `${Math.min(100, (stats.totalExpenses / stats.revenue) * 100)}%` }}
                    className="bg-rose-500/60 flex items-center justify-center border-r border-divider px-1 truncate"
                    title={`Expenses: ₱${stats.totalExpenses.toLocaleString()}`}
                  >
                    Expenses ({((stats.totalExpenses / stats.revenue) * 100).toFixed(0)}%)
                  </div>
                )}
                {stats.netProfit > 0 && (
                  <div
                    style={{ width: `${Math.min(100, (stats.netProfit / stats.revenue) * 100)}%` }}
                    className="bg-emerald-500/60 flex items-center justify-center px-1 truncate"
                    title={`Net Profit: ₱${stats.netProfit.toLocaleString()}`}
                  >
                    Net ({((stats.netProfit / stats.revenue) * 100).toFixed(0)}%)
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-divider/15 text-[10px] text-default-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-600/60 inline-block shrink-0"></span>
                <span>Cost of Goods (COGS): {((stats.cogs / stats.revenue) * 100).toFixed(1)}% of Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-500/60 inline-block shrink-0"></span>
                <span>Operating Expenses: {((stats.totalExpenses / stats.revenue) * 100).toFixed(1)}% of Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500/60 inline-block shrink-0"></span>
                <span>Net Profit Contribution: {stats.netProfit > 0 ? ((stats.netProfit / stats.revenue) * 100).toFixed(1) : "0"}% of Revenue</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Reconciliation & Actions Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist & Transmission Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Display Card */}
          <div className="p-6 rounded-2xl bg-content1 border border-divider/10 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center bg-content1">
              {isReconciled ? (
                <ShieldCheck className="h-7 w-7 text-emerald-400" />
              ) : (
                <AlertCircle className="h-7 w-7 text-amber-500" />
              )}
            </div>

            <div>
 <h4 className="text-[10px] font-bold uppercase tracking-widest text-default-500 ">
                Reconciliation Status
              </h4>
              <span className={`text-base font-black uppercase mt-1 block tracking-wider ${
                isReconciled ? "text-emerald-400" : "text-amber-500"
              }`}>
                {isReconciled ? "Certified & Verified" : "Verification Pending"}
              </span>
            </div>

            {isReconciled ? (
 <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[10.5px] text-default-500 space-y-1 text-left leading-relaxed">
                <div className="text-foreground font-extrabold uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Ledger Certified</span>
                </div>
                <div>Certified By: <span className="text-foreground">{reconciliationInfo.verifiedBy}</span></div>
                <div>Certified At: <span className="text-foreground">{new Date(reconciliationInfo.verifiedAt).toLocaleString()}</span></div>
              </div>
            ) : (
              <p className="text-[11px] text-default-500 leading-relaxed">
                The manager must check and sign the reconciliation ledger below to compile a secure transmission payload.
              </p>
            )}
          </div>

          {/* Checklist Panel */}
          <div className="p-6 rounded-2xl bg-content1 border border-divider/10 space-y-4">
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="h-4.5 w-4.5 text-amber-500" />
              <span>Manager Check-list</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-content1/40 transition-all border border-transparent hover:border-divider/30 cursor-pointer select-none active:scale-[0.98]">
                <input
                  type="checkbox"
                  disabled={isReconciled}
                  checked={checks.salesMatch || isReconciled}
                  onChange={(e) => setChecks((prev) => ({ ...prev, salesMatch: e.target.checked }))}
                  className="h-4 w-4 rounded bg-content1 border-divider/30 text-primary focus:ring-0 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Gross sales match X-Report</span>
                  <span className="text-[10px] text-default-500 leading-relaxed mt-0.5 block">
                    {stats.count} invoices match daily cashier readings.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-content1/40 transition-all border border-transparent hover:border-divider/30 cursor-pointer select-none active:scale-[0.98]">
                <input
                  type="checkbox"
                  disabled={isReconciled}
                  checked={checks.expensesDocumented || isReconciled}
                  onChange={(e) => setChecks((prev) => ({ ...prev, expensesDocumented: e.target.checked }))}
                  className="h-4 w-4 rounded bg-content1 border-divider/30 text-primary focus:ring-0 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Expenses documented</span>
                  <span className="text-[10px] text-default-500 leading-relaxed mt-0.5 block">
                    ₱{stats.totalExpenses.toLocaleString()} backed by physical receipts.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-content1/40 transition-all border border-transparent hover:border-divider/30 cursor-pointer select-none active:scale-[0.98]">
                <input
                  type="checkbox"
                  disabled={isReconciled}
                  checked={checks.cogsVerified || isReconciled}
                  onChange={(e) => setChecks((prev) => ({ ...prev, cogsVerified: e.target.checked }))}
                  className="h-4 w-4 rounded bg-content1 border-divider/30 text-primary focus:ring-0 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Inventory COGS verified</span>
                  <span className="text-[10px] text-default-500 leading-relaxed mt-0.5 block">
                    ₱{stats.cogs.toLocaleString()} COGS aligns with dispatches.
                  </span>
                </div>
              </label>
            </div>

            {!isReconciled ? (
              <button
                onClick={handleCertify}
                disabled={stats.count === 0}
                className="w-full py-3 mt-2 bg-primary hover:bg-opacity-95 disabled:opacity-40 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl transition-all cursor-pointer shadow-md disabled:cursor-not-allowed active:scale-98"
              >
                Certify & Lock Daily Figures
              </button>
            ) : (
              <button
                onClick={handleDownloadSignedReport}
                className="w-full py-3 mt-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30 text-primary font-black uppercase text-[10px] tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="h-4 w-4 text-primary" />
                <span>Export Signed JSON Packet</span>
              </button>
            )}
          </div>

          {/* Daily Sales Report / Transmission Panel */}
          {isReconciled && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-content1 border border-primary/20 space-y-4"
            >
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Share2 className="h-4.5 w-4.5 text-primary" />
                  <span>Admin Transmission Desk</span>
                </h3>
                <p className="text-[10px] text-default-500 mt-1 leading-relaxed">
                  Your daily ledger has been verified and certified. Use these options to securely transmit this reconciled sales packet to the Central HQ Administration.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Copy to Clipboard */}
                <button
                  onClick={() => handleCopyText(sharePayloadText, "Encrypted sales report copied to clipboard!")}
                  className="p-3 bg-content1 hover:bg-content3 border border-divider/20 hover:border-divider/40 text-left rounded-xl transition group flex flex-col justify-between h-[84px] cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
 <span className="text-[9px] font-black uppercase tracking-wider text-default-500">Clipboard</span>
                    <Copy className="h-4 w-4 text-default-500 group-hover:scale-110 transition-transform active:scale-[0.98]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-foreground leading-tight">Copy JSON Packet</div>
                    <p className="text-[9px] text-default-500 mt-0.5 leading-snug">Copy encrypted key for Viber/any chat</p>
                  </div>
                </button>

                {/* Share to Messenger */}
                <button
                  onClick={() => {
                    handleCopyText(sharePayloadText, "JSON report copied! Opening Messenger...");
                    setTimeout(() => {
                      try {
                        window.open("https://www.messenger.com", "_blank", "noopener,noreferrer");
                      } catch (err) {
                        console.warn("Blocked popup:", err);
                      }
                    }, 500);
                  }}
                  className="p-3 bg-content1 hover:bg-content3 border border-divider/20 hover:border-divider/40 text-left rounded-xl transition group flex flex-col justify-between h-[84px] cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
 <span className="text-[9px] font-black uppercase tracking-wider text-default-500">Messenger</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 active:scale-[0.98]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-foreground leading-tight">Share on Messenger</div>
                    <p className="text-[9px] text-default-500 mt-0.5 leading-snug">Copies packet & loads Messenger</p>
                  </div>
                </button>
              </div>

              {/* Email to Admin */}
              <button
                onClick={() => {
                  handleCopyText(sharePayloadText, "JSON report copied! Launching email...");
                  setTimeout(() => {
                    try {
                      const mailtoUrl = `mailto:?subject=${encodeURIComponent(
                        `TilePoint Reconciled Sales Report - ${currentBranchMeta?.name || "Branch"} (${reportingDate})`
                      )}&body=${encodeURIComponent(
                        `Dear Admin,\n\nHere is the certified, reconciled sales and operational expenses report for ${currentBranchMeta?.name || "Branch"} on ${reportingDate}.\n\nPlease copy and paste the encrypted payload below directly into the HQ import panel:\n\n${sharePayloadText}\n\nKind regards,\n${currentUser?.fullName || "User"}\nTilePoint Store Manager`
                      )}`;
                      window.location.href = mailtoUrl;
                    } catch (err) {
                      console.warn("Mailto redirection failed:", err);
                    }
                  }, 500);
                }}
                className="w-full py-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary hover:text-primary/80 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Mail className="h-4 w-4" />
                <span>Email Reconciled Report to Admin</span>
              </button>

              {/* Raw preview area */}
              <div className="space-y-1.5 pt-2 border-t border-divider/15">
 <div className="flex items-center justify-between text-[9px] font-bold text-default-500 uppercase ">
                  <span>Raw Report Data String</span>
                  <button
                    onClick={() => handleCopyText(sharePayloadText, "Full report JSON copied!")}
                    className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy Raw String</span>
                  </button>
                </div>
 <pre className="text-[8px] text-default-500 bg-content1 p-2.5 rounded-lg select-all overflow-x-auto whitespace-pre scrollbar-thin max-h-16 max-w-full opacity-85 border border-divider/15">
                  {sharePayloadText}
                </pre>
              </div>
            </motion.div>
          )}
        </div>

        {/* Detailed Sales and Expenses tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Sales Ledger Section */}
          <div className="p-6 rounded-2xl bg-content1 border border-divider/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-primary" />
                <span>Sales Ledger ({stats.count} non-voided receipts)</span>
              </h3>
              <button
                onClick={() => setShowSalesList(!showSalesList)}
                className="p-1 hover:bg-content1 text-default-500 hover:text-foreground rounded-lg transition active:scale-95"
              >
                {showSalesList ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </button>
            </div>

            {showSalesList && (
              <div className="overflow-x-auto border border-divider/20 rounded-xl">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-content1/60 border-b border-divider/20 text-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Receipt No.</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3 text-right">Sales (₱)</th>
                      <th className="p-3 text-right">COGS (₱)</th>
                      <th className="p-3 text-right">Gross Margin</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-default-500 italic">
                          No non-voided sales logged for this branch on selected date.
                        </td>
                      </tr>
                    ) : (
                      stats.sales.map((s) => {
                        const saleCogs = stats.saleItemCogsMap[s.id]?.cogs || 0;
                        const grossMargin = s.grandTotal > 0 ? ((s.grandTotal - saleCogs) / s.grandTotal) * 100 : 0;
                        const isExpanded = expandedSaleId === s.id;

                        return (
                          <React.Fragment key={s.id}>
 <tr className="border-b border-divider/15 hover:bg-content1/40 transition-all  active:scale-[0.98]">
                              <td className="p-3 text-foreground font-extrabold">{s.saleNumber}</td>
                              <td className="p-3 text-default-500 font-sans">{s.cashierName}</td>
                              <td className="p-3 text-right text-foreground">
                                {s.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right text-amber-500">
                                {saleCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`p-3 text-right font-extrabold ${
                                grossMargin >= 25 ? "text-emerald-400" : "text-amber-400"
                              }`}>
                                {grossMargin.toFixed(1)}%
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                                  className="p-1 bg-content1 hover:bg-default-100 text-default-500 hover:text-foreground border border-divider/20 rounded-lg transition active:scale-95"
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="bg-content1/40 p-4 border-b border-divider/20">
                                  <div className="space-y-2.5">
 <div className="text-[10px] font-black uppercase tracking-widest text-default-500 ">
                                      Receipt {s.saleNumber} Itemized Costing
                                    </div>
                                    <div className="overflow-hidden border border-divider/15 rounded-lg">
 <table className="w-full text-left text-[11px] ">
                                        <thead>
                                          <tr className="bg-content1 text-foreground border-b border-divider/20 font-bold uppercase text-[9px] tracking-wider">
                                            <th className="p-2">Item / SKU</th>
                                            <th className="p-2 text-center">Qty</th>
                                            <th className="p-2 text-right">Price (₱)</th>
                                            <th className="p-2 text-right">Cost (₱)</th>
                                            <th className="p-2 text-right">Line Total (₱)</th>
                                            <th className="p-2 text-right">Margin</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(!stats.saleItemCogsMap[s.id]?.items || stats.saleItemCogsMap[s.id].items.length === 0) ? (
                                            <tr>
                                              <td colSpan={6} className="p-4 text-center text-xs text-default-500 italic">
                                                No itemized product details found for this transaction.
                                              </td>
                                            </tr>
                                          ) : (
                                            stats.saleItemCogsMap[s.id].items.map((item: any) => {
                                            const prod = products.find((p) => p.id === item.productId);
                                            const cost = prod && prod.costPrice > 0 ? prod.costPrice : item.unitPrice * 0.6;
                                            const margin = item.unitPrice > 0 ? ((item.unitPrice - cost) / item.unitPrice) * 100 : 0;
                                            return (
                                              <tr key={item.id} className="border-b border-divider/10 text-default-500">
                                                <td className="p-2 font-sans font-medium text-foreground">{item.productName}</td>
                                                <td className="p-2 text-center text-default-500">{item.quantity}</td>
                                                <td className="p-2 text-right">
                                                  {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-2 text-right text-amber-500">
                                                  {cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-2 text-right text-foreground">
                                                  {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className={`p-2 text-right font-bold ${
                                                  margin >= 25 ? "text-emerald-400" : "text-amber-400"
                                                }`}>
                                                  {margin.toFixed(0)}%
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
</tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
 </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Operating Expenses Ledger Section */}
          <div className="p-6 rounded-2xl bg-content1 border border-divider/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="h-4.5 w-4.5 text-rose-400" />
                <span>Operating Expense Logs (₱{stats.totalExpenses.toLocaleString()})</span>
              </h3>
              <button
                onClick={() => setShowExpensesList(!showExpensesList)}
                className="p-1 hover:bg-content1 text-default-500 hover:text-foreground rounded-lg transition active:scale-95"
              >
                {showExpensesList ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </button>
            </div>

            {showExpensesList && (
              <div className="overflow-x-auto border border-divider/20 rounded-xl">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-content1/60 border-b border-divider/20 text-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3">Category</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3 text-right">Amount (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2 py-4">
                            <Receipt className="h-8 w-8 text-rose-400/40" />
                            <p className="font-bold text-xs text-foreground">No Operating Expenses Logged</p>
                            <p className="text-[11px] text-default-500 max-w-xs">
                              No operating expenses logged for this branch on the selected reporting date.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      stats.expenses.map((e) => (
 <tr key={e.id} className="border-b border-divider/10 hover:bg-content1/40 transition text-default-500 active:scale-[0.98]">
                          <td className="p-3 text-rose-400 font-extrabold uppercase text-[10px] tracking-wider">{e.category}</td>
                          <td className="p-3 text-default-500 font-sans text-[11px] leading-relaxed max-w-xs truncate" title={e.notes}>
                            {e.notes || "No details provided"}
                          </td>
                          <td className="p-3 text-default-500 font-sans">{e.recordedBy}</td>
                          <td className="p-3 text-right text-rose-400 font-bold">
                            {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
