import React, { useState, useMemo } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Branch, Sale, User, UserRole } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton } from "../../common/ui/HeroButton";
import { saveFileToBackup } from "../../../lib/fileBackupHelper";

export interface BirReportsDeskProps {
  activeSubTab: string;
  sales: Sale[];
  currentUser: User | null;
  branches: Branch[];
  onPrintSlip?: (slipData: any) => void;
  onRequestZReading?: () => void;
}

export const BirReportsDesk: React.FC<BirReportsDeskProps> = ({
  activeSubTab,
  sales,
  currentUser,
  branches,
  onPrintSlip,
  onRequestZReading,
}) => {
  const [reportDateFilter, setReportDateFilter] = useState("");

  const activeSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.isDeleted) return false;
      if (
        currentUser?.role !== UserRole.ADMIN &&
        s.branchId !== currentUser?.branchAssignmentId
      ) {
        return false;
      }
      if (reportDateFilter) {
        const sDate = s.createdAt || "";
        if (!sDate.startsWith(reportDateFilter)) return false;
      }
      return true;
    });
  }, [sales, currentUser?.role, currentUser?.branchAssignmentId, reportDateFilter]);

  const {
    totalSalesFromDay,
    discountTotal,
    vatOutput,
    vatableSales,
    vatExemptSales,
  } = useMemo(() => {
    let salesTotal = 0;
    let discTotal = 0;
    let vatTot = 0;
    let vatable = 0;
    let vatExempt = 0;

    for (let i = 0; i < activeSales.length; i++) {
      const s = activeSales[i];
      const gTotal = Number(s.grandTotal) || 0;
      const disc = Number(s.discount) || 0;
      const vat = Number(s.vat) || 0;
      const sub = Number(s.subtotal) || 0;

      salesTotal += gTotal;
      discTotal += disc;
      vatTot += vat;
      if (vat > 0) {
        vatable += (sub - vat) || 0;
      } else {
        vatExempt += sub || 0;
      }
    }

    return {
      totalSalesFromDay: salesTotal,
      discountTotal: discTotal,
      vatOutput: vatTot,
      vatableSales: vatable,
      vatExemptSales: vatExempt,
    };
  }, [activeSales]);

  const activeBranchName = useMemo(() => {
    return (branches.find(b => b.id === currentUser?.branchAssignmentId) || branches[0])?.name || "Main Branch";
  }, [branches, currentUser?.branchAssignmentId]);

  // Filter sales per sub-tab
  const filteredReportSales = useMemo(() => {
    return activeSales.filter((s: any) => {
      const sDiscountType = s.discountType || "";
      const keyVal = s.discountOptionKey;

      if (activeSubTab === "bir-pwd") return sDiscountType === "PWD" || keyVal === 0;
      if (activeSubTab === "bir-senior20") return sDiscountType === "SENIOR" || keyVal === 1;
      if (activeSubTab === "bir-senior5") return sDiscountType === "SENIOR5" || keyVal === 2;
      if (activeSubTab === "bir-solo") return sDiscountType === "SOLO" || keyVal === 3;
      if (activeSubTab === "bir-athletes") return sDiscountType === "ATHLETES" || keyVal === 4;
      if (activeSubTab === "bir-regular") {
        return (Number(s.discount) || 0) > 0 &&
          !["PWD", "SENIOR", "SENIOR5", "SOLO", "ATHLETES"].includes(sDiscountType) &&
          ![0, 1, 2, 3, 4].includes(keyVal);
      }
      return true; // summary or all
    });
  }, [activeSales, activeSubTab]);

  const handleExportCSV = () => {
    if (filteredReportSales.length === 0) {
      alert("No tax transactions match current filter criteria to export.");
      return;
    }

    const headers = [
      "Invoice No",
      "Date Time",
      "Gross Total",
      "Vatable Sales",
      "VAT Amount",
      "VAT Exempt",
      "Discount",
      "Net Amount",
      "Customer / ID",
      "Cashier",
    ];

    const rows = filteredReportSales.map((s: any) => [
      s.saleNumber || s.id,
      new Date(s.createdAt || Date.now()).toLocaleString("en-US"),
      (Number(s.subtotal) || Number(s.grandTotal) || 0).toFixed(2),
      (Number(s.vat) > 0 ? (Number(s.subtotal) - (Number(s.vat) || 0)) : 0).toFixed(2),
      (Number(s.vat) || 0).toFixed(2),
      (Number(s.vat) === 0 ? Number(s.subtotal) || 0 : 0).toFixed(2),
      (Number(s.discount) || 0).toFixed(2),
      (Number(s.grandTotal) || 0).toFixed(2),
      s.customerName || "Walk-In",
      s.cashierName || "Cashier",
    ]);

    const csvContent = "\uFEFF" + [
      `"TILEPOINT ENTERPRISES - BIR TAXATION REPORT (${activeSubTab.toUpperCase()})"`,
      `"Exported On: ${new Date().toLocaleString()}"`,
      "",
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const filename = `TilePoint_BIR_Taxation_${activeSubTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    saveFileToBackup(csvContent, filename, "Sales_Reports", "text/csv;charset=utf-8;")
      .then((res) => {
        alert(`BIR tax report exported to CSV successfully! Saved as ${res.path || filename}`);
      })
      .catch(() => {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6 font-sans text-xs text-left">
      {/* 5-Column Taxation Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl space-y-1 shadow-elevation-soft">
          <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
            Vatable Sales (Net of VAT)
          </span>
          <span className="text-sm font-bold text-foreground font-mono">
            {formatCurrency(vatableSales)}
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl space-y-1 shadow-elevation-soft">
          <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
            VAT-Exempt Sales Base
          </span>
          <span className="text-sm font-bold text-foreground font-mono">
            {formatCurrency(vatExemptSales)}
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl space-y-1 shadow-elevation-soft">
          <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
            12% Output VAT Amount
          </span>
          <span className="text-sm font-bold text-amber-500 font-mono">
            {formatCurrency(vatOutput)}
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl space-y-1 shadow-elevation-soft">
          <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
            BIR Discounts &amp; Deductions
          </span>
          <span className="text-sm font-bold text-emerald-500 font-mono">
            {formatCurrency(discountTotal)}
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl space-y-1 col-span-2 sm:col-span-1 shadow-elevation-soft">
          <span className="text-default-500 block font-bold uppercase tracking-wider text-[9px]">
            Accredited Net Sales Due
          </span>
          <span className="text-sm font-bold text-emerald-500 font-mono">
            {formatCurrency(totalSalesFromDay)}
          </span>
        </div>
      </div>

      {activeSubTab === "bir-xz" ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* X Reading Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl space-y-4 shadow-elevation-soft font-sans">
            <div>
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                Generate Cashier X-Reading
              </h3>
              <p className="text-xs text-default-500 mt-1 font-medium">
                Runs the cumulative reading for the active terminal session without closing counters.
              </p>
            </div>
            <div className="p-4 bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-2 text-[11px] shadow-2xs">
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Assigned Terminal:</span>
                <span className="font-bold text-foreground">TERM-01 ({activeBranchName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Working Cashier:</span>
                <span className="font-bold text-foreground">{currentUser?.fullName || "Active Cashier"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Subtotal Item Sales:</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(totalSalesFromDay + discountTotal)}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span className="font-medium">Deducted Vouchers:</span>
                <span className="font-mono font-bold">-{formatCurrency(discountTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-500 font-bold border-t border-dashed border-divider/20 pt-1.5 text-xs">
                <span>Cash In Drawer Match:</span>
                <span className="font-mono">{formatCurrency(totalSalesFromDay)}</span>
              </div>
            </div>
            <HeroButton
              type="button"
              color="primary"
              variant="solid"
              size="md"
              radius="full"
              startIcon={<Printer className="h-4 w-4" />}
              onClick={() => {
                if (onPrintSlip) {
                  onPrintSlip({
                    title: "BIR X-READING SLIP",
                    receiptNo: "X-" + Math.floor(Math.random() * 89999 + 10000),
                    customer: currentUser?.fullName || "Walk-In Customer",
                    date: new Date().toLocaleString(),
                    prevBalance: totalSalesFromDay + discountTotal,
                    paid: discountTotal,
                    newBalance: totalSalesFromDay,
                    pointsGained: 0,
                  });
                }
              }}
              className="w-full font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Print Current X-Reading Slip
            </HeroButton>
          </div>

          {/* Z Reading Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-5 rounded-2xl space-y-4 shadow-elevation-soft font-sans">
            <div>
              <h3 className="font-bold text-sm text-amber-500 uppercase tracking-wider">
                Generate Cumulative Z-Reading
              </h3>
              <p className="text-xs text-default-500 mt-1 font-medium">
                Concludes working shifts, commits locked fiscal audit counts, and resets drawers.
              </p>
            </div>
            <div className="p-4 bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-2 text-[11px] shadow-2xs">
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Z-Reading Record #:</span>
                <span className="font-bold font-mono text-foreground">Z-FINAL-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Total Accumulated Sales:</span>
                <span className="font-bold font-mono text-foreground">{formatCurrency(totalSalesFromDay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Total Output Tax (12%):</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(vatOutput)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500 font-medium">Fiscal Register Counter:</span>
                <span className="font-mono text-emerald-500 font-bold">LOCKED &amp; READY</span>
              </div>
            </div>
            <HeroButton
              type="button"
              color="warning"
              variant="solid"
              size="md"
              radius="full"
              startIcon={<Printer className="h-4 w-4" />}
              onClick={() => {
                if (onRequestZReading) onRequestZReading();
              }}
              className="w-full font-bold text-black shadow-2xs"
            >
              Finalize End-Of-Day Z-Reading
            </HeroButton>
          </div>
        </div>
      ) : (
        /* Detailed Table & CSV Export for BIR Discount Books / Summary */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl shadow-elevation-soft">
            <div className="flex items-center gap-2">
              <span className="font-bold text-default-500">Filter Date:</span>
              <input
                type="date"
                value={reportDateFilter}
                onChange={(e) => setReportDateFilter(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl px-2.5 py-1 text-xs text-foreground outline-none font-sans"
              />
              {reportDateFilter && (
                <button
                  type="button"
                  onClick={() => setReportDateFilter("")}
                  className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <HeroButton
              type="button"
              variant="flat"
              color="primary"
              size="sm"
              radius="full"
              startIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCSV}
              className="font-bold"
            >
              Export Tax CSV
            </HeroButton>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl overflow-hidden shadow-elevation-soft">
            <div className="p-4 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                  {activeSubTab.replace("bir-", "").replace("-", " ")} Ledger Book
                </h4>
                <span className="text-[11px] text-default-500 font-medium">{filteredReportSales.length} records registered</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-zinc-100/50 dark:bg-zinc-800/50 font-bold border-b border-divider/20 text-default-600 dark:text-default-400">
                  <tr>
                    <th className="p-3.5">Invoice / Timestamp</th>
                    <th className="p-3.5">Client / ID</th>
                    <th className="p-3.5 text-right">Gross Amount</th>
                    <th className="p-3.5 text-right">VAT (12%)</th>
                    <th className="p-3.5 text-right">Discount</th>
                    <th className="p-3.5 text-right">Net Tendered</th>
                    <th className="p-3.5 text-center">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/10">
                  {filteredReportSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-default-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No transaction records match this BIR report category.
                      </td>
                    </tr>
                  ) : (
                    filteredReportSales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="p-3.5 font-semibold text-foreground">
                          <div className="font-mono font-bold">{s.saleNumber || s.id}</div>
                          <div className="text-[10px] text-default-400">
                            {new Date(s.createdAt || Date.now()).toLocaleString("en-US")}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-foreground">{s.customerName || "Walk-In"}</div>
                          {s.seniorCitizenId && (
                            <div className="text-[9.5px] text-primary font-mono font-bold">
                              SC ID: {s.seniorCitizenId}
                            </div>
                          )}
                          {s.pwdId && (
                            <div className="text-[9.5px] text-primary font-mono font-bold">
                              PWD ID: {s.pwdId}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-bold font-mono">
                          {formatCurrency(Number(s.subtotal) || Number(s.grandTotal) || 0)}
                        </td>
                        <td className="p-3.5 text-right text-amber-500 font-bold font-mono">
                          {formatCurrency(Number(s.vat) || 0)}
                        </td>
                        <td className="p-3.5 text-right text-rose-500 font-bold font-mono">
                          -{formatCurrency(Number(s.discount) || 0)}
                        </td>
                        <td className="p-3.5 text-right text-emerald-500 font-bold font-mono">
                          {formatCurrency(Number(s.grandTotal) || 0)}
                        </td>
                        <td className="p-3.5 text-center text-default-500">
                          {s.cashierName || "Cashier"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
