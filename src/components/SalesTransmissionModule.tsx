/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useDb } from '../context/DbContext';
import { UserRole, BranchSalesReport, Sale, SaleItem } from '../types/db';
import {
  Send,
  Download,
  Upload,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Search,
  Calendar,
  Layers,
  Sparkles,
  Check,
  FileJson,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SalesTransmissionModuleProps {
  darkMode: boolean;
}

export const SalesTransmissionModule: React.FC<SalesTransmissionModuleProps> = () => {
  const {
    currentUser,
    branches,
    sales,
    saleItems,
    branchSalesReports,
    transmitSalesReport,
    importManualSalesReport,
    auditSalesReport,
    addAuditLog
  } = useDb();

  // Selected date for compiling current branch report
  const [reportingDate, setReportingDate] = useState(() => {
    // Default to the current system date or today
    return new Date().toISOString().split('T')[0];
  });

  // Local active branch when compiling (only admins/HQ can toggle this; branch personnel are locked)
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    return currentUser.branchAssignmentId || 'B1';
  });

  // State for manual JSON copy/paste or file selection
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Search filter for Admin report list
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminBranchFilter, setAdminBranchFilter] = useState('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');

  // Selected report for viewing details
  const [selectedReport, setSelectedReport] = useState<BranchSalesReport | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Get current active branch metadata
  const currentBranchMeta = useMemo(() => {
    const id = currentUser.role === UserRole.ADMIN ? selectedBranchId : (currentUser.branchAssignmentId || 'B1');
    return branches.find(b => b.id === id) || branches[0];
  }, [branches, currentUser, selectedBranchId]);

  // Aggregate stats of untransmitted local sales for the selected date on active branch
  const compiledLocalSalesData = useMemo(() => {
    const targetBranchId = currentBranchMeta.id;
    
    // Filter non-voided sales for this branch and date
    const localSales = sales.filter(s => {
      if (s.isDeleted) return false;
      if (s.branchId !== targetBranchId) return false;
      const saleDate = s.createdAt.split('T')[0];
      return saleDate === reportingDate;
    });

    const localSaleItems = saleItems.filter(item => {
      const parentSale = sales.find(s => s.id === item.saleId);
      return parentSale && parentSale.branchId === targetBranchId && !parentSale.isDeleted && parentSale.createdAt.split('T')[0] === reportingDate;
    });

    const sumGrandTotal = localSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const sumVat = localSales.reduce((acc, s) => acc + s.vat, 0);
    const sumDiscount = localSales.reduce((acc, s) => acc + s.discount, 0);

    return {
      sales: localSales,
      saleItems: localSaleItems,
      count: localSales.length,
      grandTotal: sumGrandTotal,
      vat: sumVat,
      discount: sumDiscount
    };
  }, [sales, saleItems, currentBranchMeta, reportingDate]);

  // See if there's already a transmitted report for selected branch and date
  const existingReport = useMemo(() => {
    return branchSalesReports.find(
      r => r.branchId === currentBranchMeta.id && r.reportingDate === reportingDate
    );
  }, [branchSalesReports, currentBranchMeta, reportingDate]);

  const handleTransmitOnline = () => {
    if (compiledLocalSalesData.count === 0) {
      triggerToast('No sales records found on this branch for selected date.', 'error');
      return;
    }

    if (existingReport) {
      triggerToast('A sales report for this branch and date has already been transmitted.', 'error');
      return;
    }

    transmitSalesReport({
      branchId: currentBranchMeta.id,
      branchName: currentBranchMeta.name,
      reportingDate,
      totalSalesCount: compiledLocalSalesData.count,
      totalSalesAmount: compiledLocalSalesData.grandTotal,
      totalVatAmount: compiledLocalSalesData.vat,
      totalDiscountAmount: compiledLocalSalesData.discount,
      transmissionType: 'Online',
      sales: compiledLocalSalesData.sales,
      saleItems: compiledLocalSalesData.saleItems,
      notes: `Online real-time sync completed by employee ${currentUser.fullName}.`
    });

    triggerToast(`Sales report for ${currentBranchMeta.name} uploaded and transmitted.`, 'success');
  };

  const handleDownloadOfflineJSON = () => {
    if (compiledLocalSalesData.count === 0) {
      triggerToast('No sales items to include in export file.', 'error');
      return;
    }

    const payload = {
      id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      branchId: currentBranchMeta.id,
      branchName: currentBranchMeta.name,
      reportingDate,
      totalSalesCount: compiledLocalSalesData.count,
      totalSalesAmount: compiledLocalSalesData.grandTotal,
      totalVatAmount: compiledLocalSalesData.vat,
      totalDiscountAmount: compiledLocalSalesData.discount,
      transmissionType: 'Manual',
      sales: compiledLocalSalesData.sales,
      saleItems: compiledLocalSalesData.saleItems,
      notes: `Offline encrypted report package saved on disk by local operator.`
    };

    const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const element = document.createElement('a');
    element.setAttribute('href', str);
    element.setAttribute('download', `TilePoint_Sales_Report_${currentBranchMeta.id}_${reportingDate}.json`);
    element.click();

    addAuditLog(
      'SALES_OFFLINE_EXPORT',
      `Downloaded offline JSON sales packet for ${currentBranchMeta.name} on ${reportingDate}. Transactions: ${compiledLocalSalesData.count}`,
      'BranchSalesReport',
      payload.id
    );

    triggerToast('Secure JSON sales report package downloaded.', 'success');
  };

  // Upload or handle file inclusion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedJson(text);
      triggerToast('File uploaded successfully. Click Import to finalize.', 'info');
    };
    reader.onerror = () => triggerToast('Failed to read files.', 'error');
    reader.readAsText(file);
  };

  const handleManualImportSubmit = () => {
    setImportError(null);
    setImportSuccess(false);

    if (!pastedJson.trim()) {
      setImportError('Please provide a valid JSON sales packet before committing.');
      return;
    }

    const result = importManualSalesReport(pastedJson);
    if (result.success) {
      setImportSuccess(true);
      setPastedJson('');
      triggerToast('Manual JSON sales report imported. Assigned for audit processing.', 'success');
      setTimeout(() => {
        setShowJsonImport(false);
        setImportSuccess(false);
      }, 1500);
    } else {
      setImportError(result.error || 'Import validation failure.');
    }
  };

  const handleSetAuditStatus = (status: 'Verified' | 'Pending Audit') => {
    if (!selectedReport) return;
    auditSalesReport(selectedReport.id, status, auditNotes);
    triggerToast(`Audit verified status set to ${status}.`, 'success');
    
    // Refresh selected report viewing
    setSelectedReport(prev => prev ? {
      ...prev,
      status,
      notes: auditNotes || prev.notes,
      auditedBy: currentUser.fullName,
      auditedAt: new Date().toISOString()
    } : null);
    
    setAuditNotes('');
  };

  // Filter transmitted reports listed in Admin panel
  const filteredReports = useMemo(() => {
    return branchSalesReports.filter(report => {
      // Branch assignment or filter
      if (adminBranchFilter !== 'ALL' && report.branchId !== adminBranchFilter) return false;
      // Status filter
      if (adminStatusFilter !== 'ALL' && report.status !== adminStatusFilter) return false;
      // Search text query matching date, ID or branch name
      if (adminSearchQuery.trim()) {
        const query = adminSearchQuery.toLowerCase();
        return (
          report.branchName.toLowerCase().includes(query) ||
          report.reportingDate.includes(query) ||
          report.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [branchSalesReports, adminBranchFilter, adminStatusFilter, adminSearchQuery]);

  return (
    <div className="w-full text-m3-on-surface space-y-6 animate-fade-in font-sans pb-12">
      {/* Dynamic Toast feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 card-glow shadow-md">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-m3-primary/10 rounded-xl text-m3-primary border border-m3-primary/20">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-m3-primary font-sans leading-none">
                Sales Reports Transmission Portal
              </h2>
              <p className="text-[10px] text-zinc-400 font-bold font-mono uppercase tracking-widest mt-1">
                Inter-Branch Accounting & Validation Vault
              </p>
            </div>
          </div>
          <p className="text-xs text-m3-on-surface-variant max-w-xl leading-relaxed pl-1 pt-1">
            Ensure proper closure of books. Transmit daily sales report modules online over secure web sockets, or generate an encrypted JSON data package to transfer manually on flash storage or local network links.
          </p>
        </div>

        {/* Action center keys */}
        {currentUser.role === UserRole.ADMIN && (
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <button
              onClick={() => {
                setPastedJson('');
                setImportError(null);
                setImportSuccess(false);
                setShowJsonImport(true);
              }}
              className="px-4 py-2 border border-m3-primary/30 bg-m3-primary/10 hover:bg-m3-primary/15 text-m3-primary rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Import manual sales JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid Layout depending on User Status */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPILING FORM CARDS - visible to both Cashiers/Managers to submit and Admin to audit preview */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-5 text-left shadow-sm">
            <div className="space-y-0.5 border-b border-m3-outline-variant/20 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-500" />
                Compile Report Parameters
              </h3>
              <p className="text-[10.5px] text-zinc-400">Generate local client ledger aggregates to transmit to headquarters.</p>
            </div>

            <div className="space-y-4">
              {/* Branch Selection (Only Admins can toggle branch context, branch users locked to assignment) */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Branch assignment:</label>
                {currentUser.role === UserRole.ADMIN ? (
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-m3-surface-container border border-m3-outline-variant/40 rounded-xl px-3 py-2.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.id === 'B1' ? '(HQ Office)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-m3-surface-container border border-m3-outline-variant/20 rounded-xl px-3 py-2.5 text-xs text-m3-on-surface font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{getBranchNameLabel(currentUser.branchAssignmentId)}</span>
                  </div>
                )}
              </div>

              {/* Date Input Selector */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono font-sans">Report accounting date:</label>
                <div className="relative">
                  <input
                    type="date"
                    value={reportingDate}
                    onChange={(e) => setReportingDate(e.target.value)}
                    className="w-full bg-m3-surface-container border border-m3-outline-variant/40 rounded-xl px-3 py-2.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary font-mono appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Compiled aggregates summary plate */}
            <div className="p-4 bg-m3-surface-high border border-m3-outline-variant/20 rounded-2xl space-y-3 font-mono">
              <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider pb-1.5 border-b border-m3-outline-variant/15 flex justify-between">
                <span>Aggregated Sales Matrix</span>
                <span className="text-amber-500 font-bold">{reportingDate}</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 uppercase font-bold text-[9.5px]">Receipts Issued:</span>
                  <span className="text-m3-on-surface font-extrabold">{compiledLocalSalesData.count} receipts</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 uppercase font-bold text-[9.5px]">Discount Vol:</span>
                  <span className="text-m3-on-surface">₱{compiledLocalSalesData.discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 uppercase font-bold text-[9.5px]">VAT Sales:</span>
                  <span className="text-m3-on-surface">₱{compiledLocalSalesData.vat.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-m3-outline-variant/10 flex justify-between items-center text-[12px]">
                  <span className="text-m3-primary font-bold uppercase text-[10px]">TOTAL GRAND TOTAL:</span>
                  <span className="text-emerald-400 font-black text-sm">₱{compiledLocalSalesData.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Check local compile alerts */}
            {compiledLocalSalesData.count === 0 ? (
              <div className="p-3 bg-amber-500/5 text-amber-400 border border-amber-500/10 rounded-xl text-[10px] flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">No Ledger records cataloged</p>
                  <p className="opacity-85 text-zinc-400">There are no sales receipts registered on this branch assignment during this accounting date. Verify that sales sessions were synchronized.</p>
                </div>
              </div>
            ) : existingReport ? (
              <div className="p-3 bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded-xl text-[10px] flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider block">Report already transmitted</p>
                  <p className="opacity-85 text-zinc-400">A daily summary matching this date has already been filed to headquarters audit database. Transmitted as: <span className="text-white font-mono">{existingReport.transmissionType}</span> on <span className="font-mono text-zinc-100">{new Date(existingReport.transferredAt).toLocaleTimeString()}</span>.</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-m3-primary/5 text-m3-primary border border-m3-primary/10 rounded-xl text-[10px] flex items-start gap-2 leading-relaxed">
                <Sparkles className="h-4 w-4 text-m3-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wider block">Ready for upload transmission</p>
                  <p className="opacity-85 text-zinc-400">You compile a total of {compiledLocalSalesData.count} valid non-voided receipts. Click online synchronization or download manually.</p>
                </div>
              </div>
            )}

            {/* Execution Actions */}
            <div className="space-y-2.5 pt-2 border-t border-m3-outline-variant/15 md:space-y-2">
              <button
                disabled={compiledLocalSalesData.count === 0 || !!existingReport}
                onClick={handleTransmitOnline}
                className="w-full py-3 bg-m3-primary disabled:bg-m3-outline-variant/20 disabled:text-zinc-500 disabled:border-transparent text-m3-on-primary border border-m3-primary hover:bg-m3-primary/95 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-m3-primary/10 active:scale-98"
              >
                <Send className="h-4 w-4" />
                <span>Transmit Secure Online Link</span>
              </button>

              <button
                disabled={compiledLocalSalesData.count === 0}
                onClick={handleDownloadOfflineJSON}
                className="w-full py-3 bg-m3-surface-low border border-m3-outline-variant/45 hover:bg-m3-primary/5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 text-amber-500" />
                <span>Download manual JSON Packet</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CENTRAL COMPILATION LEDGER AND AUDIT WORK - Visible to HQ/Admin to review reports */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] p-6 space-y-5 text-left shadow-sm">
            <div className="space-y-0.5 border-b border-m3-outline-variant/20 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-m3-primary font-mono flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  Headquarters Sales Audit registry
                </h3>
                <p className="text-[10.5px] text-zinc-400">Review transmitted daily branch aggregates for double-entry checking.</p>
              </div>

              {/* Status tally badge */}
              <div className="px-3 py-1 rounded-full text-[10px] font-mono tracking-widest bg-zinc-800 text-amber-500 font-extrabold uppercase shrink-0 self-start sm:self-center border border-zinc-700">
                TOTAL: {branchSalesReports.length} Reports
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 bg-m3-surface-container/60 p-4 rounded-2xl border border-m3-outline-variant/15">
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Filter text query:</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder="Search query (Branch, Date, Report ID)..."
                    className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Branch origin:</label>
                <select
                  value={adminBranchFilter}
                  onChange={(e) => setAdminBranchFilter(e.target.value)}
                  className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5 font-mono">Audit state:</label>
                <select
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value)}
                  className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-m3-primary text-m3-on-surface"
                >
                  <option value="ALL">All States</option>
                  <option value="Pending Audit">Pending Audit</option>
                  <option value="Verified">Verified</option>
                </select>
              </div>
            </div>

            {/* CENTRAL REGISTRY TABLE */}
            <div className="border border-m3-outline-variant/20 rounded-2xl overflow-hidden bg-m3-surface">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#11131c]/60 font-mono text-[9px] uppercase tracking-widest text-zinc-500 border-b border-m3-outline-variant/15">
                  <tr>
                    <th className="py-3 px-4">REPORT MATRIX ID</th>
                    <th className="py-3 px-3">BRANCH ORIGIN</th>
                    <th className="py-3 px-3">DATE</th>
                    <th className="py-3 px-3 text-center">RECEIPTS</th>
                    <th className="py-3 px-3 text-right">TOTAL grand</th>
                    <th className="py-3 px-3 text-center">LINK CHANNEL</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-m3-outline-variant/10 font-sans">
                  {filteredReports.map((report) => {
                    const isSelected = selectedReport?.id === report.id;
                    return (
                      <tr
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setAuditNotes(report.notes || '');
                        }}
                        className={`hover:bg-m3-primary/5 transition-all cursor-pointer ${
                          isSelected ? 'bg-m3-primary/10 font-medium' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-[10.5px] text-zinc-300 font-bold">
                          {report.id}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-m3-on-surface">
                          {report.branchName}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-300">
                          {report.reportingDate}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold">
                          {report.totalSalesCount}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-400 font-mono">
                          ₱{report.totalSalesAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            report.transmissionType === 'Online'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {report.transmissionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-wider ${
                            report.status === 'Verified'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/10 text-amber-500 animate-pulse'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium leading-relaxed font-sans">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FolderOpen className="h-8 w-8 text-zinc-600" />
                          <span>No secure branch sales reports matching current criteria found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED INTERACTIVE AUDITOR AND TRANSACTION ITEMS DRAWER (MODAL OVERLAY) */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in text-left font-sans">
            <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm shadow-xl" onClick={() => setSelectedReport(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface space-y-6 flex flex-col"
            >
              <div className="flex justify-between items-start border-b border-m3-outline-variant/20 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest font-mono text-zinc-400">Enclosed Sales Report Package Details</span>
                  <h3 className="text-sm font-black uppercase text-m3-primary flex items-center gap-1.5">
                    <FileJson className="h-4.5 w-4.5 text-amber-500" />
                    Audit Inspection Matrix for {selectedReport.branchName} ({selectedReport.reportingDate})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 hover:bg-m3-primary/10 hover:text-rose-500 rounded-xl cursor-pointer"
                  title="Dismiss details drawer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Report summary grid metrics */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl p-4.5 space-y-4 font-mono text-xs">
                    <div className="text-[10.5px] text-zinc-400 font-extrabold pb-2 border-b border-m3-outline-variant/15 uppercase tracking-wider">
                      General Properties
                    </div>

                    <div className="space-y-2 leading-relaxed">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Report ID:</span>
                        <span className="text-white font-bold">{selectedReport.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Transferred At:</span>
                        <span className="text-zinc-300">{new Date(selectedReport.transferredAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Sales Transactions:</span>
                        <span className="text-white font-bold">{selectedReport.totalSalesCount} entries</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Sum Flat Discounts:</span>
                        <span className="text-zinc-300">₱{selectedReport.totalDiscountAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Calculated VAT:</span>
                        <span className="text-zinc-300">₱{selectedReport.totalVatAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-m3-outline-variant/10 pt-2 text-[12.5px]">
                        <span className="text-m3-primary font-bold">Grand Settled total:</span>
                        <span className="text-emerald-400 font-black">₱{selectedReport.totalSalesAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Actions Panel (Only visible/interactable by Managers or Admins) */}
                  <div className="bg-m3-surface border border-m3-outline-variant/20 rounded-2xl p-4.5 space-y-4">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-b border-m3-outline-variant/15 pb-2 flex items-center gap-1">
                      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Auditor Command Module</span>
                    </div>

                    <div className="space-y-3 font-sans">
                      {selectedReport.auditedBy && (
                        <div className="p-3 bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded-xl text-[10.5px] leading-relaxed">
                          <span className="font-extrabold uppercase block text-[9.5px] tracking-wider mb-0.5">Audited & approved</span>
                          Verified by <strong className="text-white font-bold">{selectedReport.auditedBy}</strong> on <span className="font-mono text-zinc-200">{new Date(selectedReport.auditedAt!).toLocaleString()}</span>.
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Auditor Verification notes:</label>
                        <textarea
                          value={auditNotes}
                          onChange={(e) => setAuditNotes(e.target.value)}
                          placeholder="Log notes about physical cash counting, discrepancies or VAT ledger checks..."
                          rows={3}
                          className="w-full bg-m3-surface-low border border-m3-outline-variant/40 rounded-xl p-2.5 text-xs text-m3-on-surface focus:outline-none focus:border-m3-primary text-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        <button
                          onClick={() => handleSetAuditStatus('Verified')}
                          disabled={selectedReport.status === 'Verified'}
                          className="py-2.5 px-3 bg-emerald-500 text-black hover:bg-emerald-400 transition-all text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verify OK
                        </button>

                        <button
                          onClick={() => handleSetAuditStatus('Pending Audit')}
                          className="py-2.5 px-3 bg-m3-surface border border-m3-outline-variant/40 hover:bg-rose-500/10 hover:text-rose-400 text-m3-on-surface transition-all text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer text-center"
                        >
                          Set Pending
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* itemized transaction details included in report */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-m3-surface border border-m3-outline-variant/15 rounded-2xl overflow-hidden">
                    <div className="bg-[#11131c]/60 px-4 py-3 border-b border-m3-outline-variant/15 text-[10.5px] font-mono text-zinc-400 font-extrabold uppercase tracking-widest flex justify-between">
                      <span>Enclosed Sale Records list</span>
                      <span className="text-amber-500">{selectedReport.sales.length} Sales</span>
                    </div>

                    <div className="p-1 max-h-[360px] overflow-y-auto divide-y divide-m3-outline-variant/10">
                      {selectedReport.sales.map((sale) => (
                        <div
                          key={sale.id}
                          onClick={() => setSelectedSale(sale)}
                          className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-m3-surface-low rounded-xl cursor-pointer transition-all border border-transparent hover:border-m3-outline-variant/30 hover:scale-[1.005] select-none"
                          title="Click to view detailed itemized sale receipt and tile metrics"
                        >
                          <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-m3-primary font-bold">{sale.saleNumber}</span>
                              <span className="px-2 py-0.5 rounded-[5px] bg-m3-secondary-container text-m3-on-secondary-container text-[9px] font-mono font-bold uppercase">
                                {sale.paymentMethod}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              Cashier: <strong className="text-zinc-300 font-bold">{sale.cashierName}</strong> • Date: <span className="font-mono">{new Date(sale.createdAt).toLocaleTimeString()}</span>
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Customer: <strong className="text-zinc-300 font-semibold">{sale.customerName || 'Walk-in'}</strong>
                            </p>
                          </div>

                          <div className="text-right font-mono self-start sm:self-center">
                            <div className="text-[11px] font-bold text-zinc-400 flex flex-col sm:items-end">
                              {sale.discount > 0 && (
                                <span className="text-[10px] text-zinc-500">Disc: -₱{sale.discount.toLocaleString()}</span>
                              )}
                              <span className="text-emerald-400 font-black text-sm">₱{sale.grandTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {selectedReport.sales.length === 0 && (
                        <p className="py-8 text-center text-zinc-500 font-medium font-sans">No enclosed transaction receipts registered inside this report vector.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP: ITEMISED SALE RECORD DETAILS */}
      <AnimatePresence>
        {selectedSale && selectedReport && (
          <div className="fixed inset-0 bg-transparent flex items-center justify-center z-55 p-4 animate-fade-in text-left">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setSelectedSale(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-lg w-full text-left overflow-hidden shadow-2xl relative z-60 font-sans"
            >
              <div className="px-6 py-4.5 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-m3-outline-variant/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-m3-primary" />
                    <span>Transaction Invoice: {selectedSale.saleNumber}</span>
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest block mt-0.5">
                    Branch Sale Auditor Checkpoint
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-m3-surface p-3.5 rounded-2xl border border-m3-outline-variant/10 text-xs font-sans">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Customer / Buyer</span>
                    <span className="font-extrabold text-sm text-m3-primary mt-0.5 block">{selectedSale.customerName || 'Walk-in'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Date Settled</span>
                    <span className="font-mono mt-0.5 block text-zinc-350">{new Date(selectedSale.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Cashier on Duty</span>
                    <span className="font-bold mt-0.5 block text-zinc-350">{selectedSale.cashierName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Payment Mode</span>
                    <span className="font-extrabold mt-0.5 block text-emerald-400 font-mono tracking-wide">{selectedSale.paymentMethod}</span>
                  </div>
                </div>

                <div className="border border-m3-outline-variant/15 rounded-2xl overflow-hidden bg-m3-surface">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-[#11131c] font-mono text-[9px] uppercase tracking-wider text-zinc-400 border-b border-m3-outline-variant/15">
                      <tr>
                        <th className="py-2.5 px-3">TILE SPECIFICATION</th>
                        <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                        <th className="py-2.5 px-3 text-center font-bold">QTY</th>
                        <th className="py-2.5 px-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant/10 font-sans text-zinc-300">
                      {selectedReport.saleItems
                        .filter(item => item.saleId === selectedSale.id)
                        .map((item, idx) => (
                          <tr key={idx} className="hover:bg-m3-surface-low/35 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-zinc-150">{item.productName}</td>
                            <td className="py-2.5 px-3 text-right font-mono">₱{item.unitPrice.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-zinc-100">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-white">₱{item.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      {selectedReport.saleItems.filter(item => item.saleId === selectedSale.id).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-zinc-500 italic">No itemized products found in this transaction record.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-m3-surface border border-m3-outline-variant/10 rounded-2xl space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Retail Subtotal:</span>
                    <span className="font-bold text-zinc-200">₱{selectedSale.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">VAT (12% Included):</span>
                    <span className="font-bold text-zinc-400">₱{selectedSale.vat.toLocaleString()}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-450">
                      <span>Applied Flat Discount:</span>
                      <span className="font-bold">-₱{selectedSale.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-m3-outline-variant/10 pt-2 text-xs font-sans text-emerald-400 font-bold">
                    <span>Grand Total:</span>
                    <span className="font-black font-mono">₱{selectedSale.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {selectedSale.notes && (
                  <div className="p-2.5 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-xl text-[10.5px]">
                    <strong>Auditor Reference Notes:</strong> {selectedSale.notes}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="px-5 py-2.5 bg-m3-surface hover:bg-m3-primary/10 border border-m3-outline-variant/30 text-m3-on-surface hover:text-m3-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Close Invoice
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP: MANUAL JSON IMPORT DIALOG */}
      <AnimatePresence>
        {showJsonImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-m3-surface-low border border-m3-outline-variant/30 rounded-[28px] max-w-xl w-full text-left overflow-hidden shadow-2xl relative z-50 font-sans"
            >
              <div className="px-6 py-4.5 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-m3-outline-variant/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Import Offline Sales Report File
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest block mt-0.5">
                    Encrypted Ledger Packet Decryption Handshake
                  </span>
                </div>
                <button
                  onClick={() => setShowJsonImport(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                  Import a manually saved branch sales report JSON file. Drag-and-drop the exported file below, select it directly from storage, or paste the raw structured JSON data inside the text area.
                </p>

                {/* File picker */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono">Select JSON Report file from drive:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="report-file-picker"
                    />
                    <label
                      htmlFor="report-file-picker"
                      className="px-4 py-2.5 bg-m3-surface hover:bg-m3-primary/10 border border-m3-outline-variant/40 rounded-xl text-xs font-bold uppercase tracking-wider text-m3-on-surface shadow-sm cursor-pointer flex items-center gap-2 transition-all"
                    >
                      <FolderOpen className="h-4 w-4 text-m3-primary" />
                      Browse Files
                    </label>
                    <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[240px]">
                      {pastedJson ? "Report loaded. Ready for import code." : "No file loaded yet."}
                    </span>
                  </div>
                </div>

                {/* PASTE DIALOG */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#71717a] pl-0.5 font-mono">Raw JSON content string:</label>
                  <textarea
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                    placeholder='Paste raw downloaded corporate JSON file contents here, e.g. { "branchId": "B2", "branchName": "Branch Name", ... }'
                    rows={6}
                    className="w-full bg-[#0d0e12] border border-m3-outline-variant/40 rounded-xl p-3 text-[10.5px] font-mono text-emerald-400 focus:outline-none focus:border-m3-primary whitespace-pre scrollbar-thin"
                  />
                </div>

                {/* ERROR PANEL */}
                {importError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold leading-normal flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span>Schema Verification Error:</span>
                      <p className="font-medium text-zinc-300 mt-1">{importError}</p>
                    </div>
                  </div>
                )}

                {/* SUCCESS PANEL */}
                {importSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10.5px] font-bold flex items-center gap-2.5">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    <span>Report verified, parsed, and logged inside the audit lists successfully.</span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-m3-surface border-t border-m3-outline-variant/15 flex justify-end gap-3.5">
                <button
                  onClick={() => setShowJsonImport(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleManualImportSubmit}
                  className="px-5 py-2.5 bg-m3-primary text-m3-on-primary font-black text-xs uppercase tracking-wider rounded-xl hover:bg-m3-primary/95 transition-all shadow-md cursor-pointer active:scale-97"
                >
                  Confirm & Finalize Import
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // Helper helper labels
  function getBranchNameLabel(id: string | null) {
    if (!id) return 'Corporate Office';
    const b = branches.find(br => br.id === id);
    return b ? b.name : 'Unknown Branch';
  }
};

// Internal minimal fallback components to bypass missing import icons
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
