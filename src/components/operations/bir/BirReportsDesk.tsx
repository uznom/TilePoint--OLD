import React, { useState, useMemo } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Branch, Sale, User, UserRole } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroDatePicker } from "../../common/ui/HeroDatePicker";
import { HeroDropdownSelect } from "../../common/ui/HeroDropdown";
import { saveFileToBackup } from "../../../lib/fileBackupHelper";

export interface BirReportsDeskProps {
  activeSubTab: string;
  sales: Sale[];
  currentUser: User | null;
  branches: Branch[];
  onPrintSlip?: (slipData: any) => void;
  onRequestZReading?: () => void;
}

const CATEGORY_OPTIONS = [
  { key: "all", label: "All Categories (Summary)" },
  { key: "bir-pwd", label: "PWD Book (20%)" },
  { key: "bir-senior20", label: "Senior Citizen (20%)" },
  { key: "bir-senior5", label: "Senior Citizen (5%)" },
  { key: "bir-solo", label: "Solo Parent (10%)" },
  { key: "bir-athletes", label: "National Athletes" },
  { key: "bir-regular", label: "Regular Promos" },
  { key: "vatable", label: "Vatable Sales (12%)" },
  { key: "vat-exempt", label: "VAT-Exempt Only" },
];

export const BirReportsDesk: React.FC<BirReportsDeskProps> = ({
  activeSubTab,
  sales,
  currentUser,
  branches,
  onPrintSlip,
  onRequestZReading,
}) => {
  const [reportDateFilter, setReportDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const branchOptions = useMemo(() => [
    { key: "all", label: "All Branches" },
    ...branches.filter((b) => !b.isDeleted).map((b) => ({
      key: b.id,
      label: b.name,
    })),
  ], [branches]);

  const activeSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.isDeleted) return false;
      if (currentUser?.role === UserRole.ADMIN) {
        if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
      } else if (s.branchId !== currentUser?.branchAssignmentId) {
        return false;
      }
      if (reportDateFilter) {
        let sDate = "";
        if (s.createdAt) {
          if (typeof s.createdAt === "string") {
            sDate = s.createdAt.substring(0, 10);
          } else {
            sDate = new Date(s.createdAt).toISOString().substring(0, 10);
          }
        }
        if (sDate !== reportDateFilter && !sDate.startsWith(reportDateFilter)) return false;
      }
      return true;
    });
  }, [sales, currentUser?.role, currentUser?.branchAssignmentId, reportDateFilter, branchFilter]);

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
    if (currentUser?.role === UserRole.ADMIN && branchFilter !== "all") {
      return branches.find(b => b.id === branchFilter)?.name || "All Branches";
    }
    return (branches.find(b => b.id === currentUser?.branchAssignmentId) || branches[0])?.name || "Main Branch";
  }, [branches, currentUser?.role, currentUser?.branchAssignmentId, branchFilter]);

  // Filter sales per sub-tab & category & search query
  const filteredReportSales = useMemo(() => {
    const targetCategory = activeSubTab === "bir-summary" ? categoryFilter : activeSubTab;

    return activeSales.filter((s: any) => {
      const sDiscountType = s.discountType || "";
      const keyVal = s.discountOptionKey;

      if (targetCategory === "bir-pwd") {
        if (!(sDiscountType === "PWD" || keyVal === 0)) return false;
      } else if (targetCategory === "bir-senior20") {
        if (!(sDiscountType === "SENIOR" || keyVal === 1)) return false;
      } else if (targetCategory === "bir-senior5") {
        if (!(sDiscountType === "SENIOR5" || keyVal === 2)) return false;
      } else if (targetCategory === "bir-solo") {
        if (!(sDiscountType === "SOLO" || keyVal === 3)) return false;
      } else if (targetCategory === "bir-athletes") {
        if (!(sDiscountType === "ATHLETES" || keyVal === 4)) return false;
      } else if (targetCategory === "bir-regular") {
        const isPromo = (Number(s.discount) || 0) > 0 &&
          !["PWD", "SENIOR", "SENIOR5", "SOLO", "ATHLETES"].includes(sDiscountType) &&
          ![0, 1, 2, 3, 4].includes(keyVal);
        if (!isPromo) return false;
      } else if (targetCategory === "vatable") {
        if (!((Number(s.vat) || 0) > 0)) return false;
      } else if (targetCategory === "vat-exempt") {
        if ((Number(s.vat) || 0) > 0) return false;
      }

      // Search Query filter logic
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const saleNo = (s.saleNumber || s.id || "").toLowerCase();
        const client = (s.customerName || "").toLowerCase();
        const sc = (s.seniorCitizenId || "").toLowerCase();
        const pwd = (s.pwdId || "").toLowerCase();
        const cashier = (s.cashierName || "").toLowerCase();
        if (!saleNo.includes(q) && !client.includes(q) && !sc.includes(q) && !pwd.includes(q) && !cashier.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [activeSales, activeSubTab, categoryFilter, searchQuery]);

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

    const effectiveCategory = activeSubTab === "bir-summary" ? `SUMMARY_${categoryFilter.toUpperCase()}` : activeSubTab.toUpperCase();
    const csvContent = "\uFEFF" + [
      `"TILEPOINT ENTERPRISES - BIR TAXATION REPORT (${effectiveCategory})"`,
      `"Exported On: ${new Date().toLocaleString()}"`,
      reportDateFilter ? `"Filtered Date: ${reportDateFilter}"` : `"Date Range: All Records"`,
      "",
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const filename = `TilePoint_BIR_Taxation_${activeSubTab}_${reportDateFilter || new Date().toISOString().slice(0, 10)}.csv`;
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
      {/* HeroUI v3 Operations & BIR Filter Suite */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 p-4 rounded-2xl shadow-elevation-soft">
        <div className="flex flex-wrap items-center gap-3">
          {/* HeroUI v3 Date Picker */}
          <div className="w-52 sm:w-56">
            <HeroDatePicker
              value={reportDateFilter}
              onChange={(val) => setReportDateFilter(val)}
              size="sm"
              radius="full"
              placeholder="Filter by Date"
            />
          </div>

          {/* Category Filter for BIR Summary Report or category badge */}
          {activeSubTab === "bir-summary" ? (
            <div className="min-w-[200px]">
              <HeroDropdownSelect
                items={CATEGORY_OPTIONS}
                selectedKey={categoryFilter}
                onSelectionChange={(val) => setCategoryFilter(String(val))}
                size="sm"
                variant="pill"
              />
            </div>
          ) : activeSubTab !== "bir-xz" ? (
            <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{activeSubTab.replace("bir-", "").replace("-", " ")}</span>
            </div>
          ) : null}

          {/* Branch Filter for Admin */}
          {currentUser?.role === UserRole.ADMIN && (
            <div className="min-w-[160px]">
              <HeroDropdownSelect
                items={branchOptions}
                selectedKey={branchFilter}
                onSelectionChange={(val) => setBranchFilter(String(val))}
                size="sm"
                variant="pill"
              />
            </div>
          )}

          {/* Search Query Filter (for Detailed Table) */}
          {activeSubTab !== "bir-xz" && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, client, ID..."
                className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs text-foreground outline-none font-sans w-48 focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-default-400 hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Clear Date */}
          {reportDateFilter && (
            <button
              type="button"
              onClick={() => setReportDateFilter("")}
              className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-bold cursor-pointer transition-colors"
            >
              Clear Date
            </button>
          )}
        </div>

        {/* CSV Export Button for detailed table */}
        {activeSubTab !== "bir-xz" && (
          <HeroButton
            type="button"
            variant="flat"
            color="primary"
            size="sm"
            radius="full"
            startIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
            className="font-bold shrink-0"
          >
            Export Tax CSV
          </HeroButton>
        )}
      </div>

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
                    date: reportDateFilter ? new Date(reportDateFilter).toLocaleDateString() : new Date().toLocaleString(),
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
                <span className="font-bold font-mono text-foreground">
                  Z-FINAL-{(reportDateFilter || new Date().toISOString().slice(0, 10)).replace(/-/g, "")}
                </span>
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
        /* Detailed Table & Ledger for BIR Discount Books / Summary */
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl overflow-hidden shadow-elevation-soft">
            <div className="p-4 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                  {activeSubTab === "bir-summary"
                    ? (categoryFilter === "all" ? "BIR Summary Report" : CATEGORY_OPTIONS.find(c => c.key === categoryFilter)?.label || "Summary")
                    : `${activeSubTab.replace("bir-", "").replace("-", " ")} Ledger Book`}
                </h4>
                <span className="text-[11px] text-default-500 font-medium">
                  {filteredReportSales.length} records registered
                  {reportDateFilter ? ` for ${reportDateFilter}` : ""}
                </span>
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
                        No transaction records match this BIR report filter criteria.
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
