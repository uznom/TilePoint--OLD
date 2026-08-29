/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useReceiptFontSize } from './ReceiptFontSizeControl';
import { useDb } from '../context/DbContext';
import { formatCurrency } from '../utils/formatters';
import { useResponsivePageSize, TablePagination } from './TablePagination';
import { ToastNotification } from './ToastNotification';
import { HeroTable } from './common/ui/HeroTable';
import { useMultiSort } from '../hooks/useMultiSort';
import { MultiSortBadgeBar } from './common/ui/MultiSortBadgeBar';
import { Shift } from '../types/db';
import {
 Lock,
 Unlock,
 Coins,
 Printer,
} from 'lucide-react';

interface ShiftModuleProps {
 darkMode?: boolean;
}

export const ShiftModule: React.FC<ShiftModuleProps> = ({ darkMode: _darkMode }) => {
 const { fontClass: receiptFontClass } = useReceiptFontSize();
 const {
 shifts,
 activeShift,
 openShift,
 closeShift,
 getShiftReportStats,
 currentUser,
 addAuditLog
 } = useDb();

 // Find the last closed shift at this branch to pre-fill starting cash
 const previouslyClosedShift = React.useMemo(() => {
 if (!shifts || shifts.length === 0 || !currentUser) return null;
 return [...shifts]
 .filter(s => s.status === 'CLOSED' && s.branchId === currentUser?.branchAssignmentId)
 .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())[0] || null;
 }, [shifts, currentUser?.branchAssignmentId]);

 const [startCashInput, setStartCashInput] = useState('5000');
 const [closingCashInput, setClosingCashInput] = useState('');

 // Prefill starting cash if a previously closed shift exists
 React.useEffect(() => {
 if (previouslyClosedShift) {
 setStartCashInput(previouslyClosedShift.cashCount.toString());
 } else {
 setStartCashInput('5000');
 }
 }, [previouslyClosedShift]);

 // Report overlays
 const [showXReport, setShowXReport] = useState(false);
 const [showZReport, setShowZReport] = useState(false);

 // Success notifications
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const [shiftPage, setShiftPage] = useState(1);
 const shiftPageSize = useResponsivePageSize(48, 480, 10);

  // Multi-column sorting for historic shifts audit
  const {
    sortDescriptors: shiftSortDescriptors,
    handleSort: handleShiftSort,
    getSortDirection: getShiftSortDir,
    getSortRank: getShiftSortRank,
    removeSort: removeShiftSort,
    clearSort: clearShiftSort,
    sortData: sortShiftData
  } = useMultiSort<Shift>({
    customGetters: {
      id: (s) => s.id || '',
      cashierName: (s) => s.cashierName || '',
      startCash: (s) => s.startCash || 0,
      expectedEndCash: (s) => (s.endCash !== undefined && s.endCash !== null ? s.endCash : (s.startCash + (s.shiftSalesTotal || 0))),
      countedDrawer: (s) => (s.cashCount !== undefined && s.cashCount !== null ? s.cashCount : 0),
      variance: (s) => s.variance ?? 0,
      status: (s) => s.status || '',
    }
  });

  const sortedShifts = React.useMemo(() => {
    if (shiftSortDescriptors.length > 0) {
      return sortShiftData(shifts);
    }
    return shifts;
  }, [shifts, shiftSortDescriptors, sortShiftData]);

 const showToast = (msg: string) => {
 setToastMessage(msg);
 setTimeout(() => setToastMessage(null), 4000);
 };

 // Stats computed
 const shiftStats = activeShift ? getShiftReportStats(activeShift) : null;
  const expectedEndCash = activeShift && shiftStats ? shiftStats.expectedEndCash : 0;

 const handleOpenLocalShift = (e: React.FormEvent) => {
 e.preventDefault();
 if (activeShift) {
 showToast(`An active shift drawer is already open for your account (${activeShift.id}). Please close your active shift before opening a new one.`);
 return;
 }
 const stVal = parseFloat(startCashInput) || 0;
 openShift(stVal);
 showToast(`Shift drawer opened successfully. Starting cash: ₱${stVal.toFixed(2)}`);
 };

 const handleCloseLocalShift = (e: React.FormEvent) => {
 e.preventDefault();
 const endingVal = parseFloat(closingCashInput) || 0;
 closeShift(endingVal);
 setClosingCashInput('');
 showToast(`Shift closed successfully. Financial logs synchronized.`);
 };

 return (
 <div className="space-y-6 animate-fade-in text-foreground">
 {/* Shift Overview panel */}
 {activeShift ? (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Active stats layout (Columns 7) */}
 <div className="bg-content1 border border-divider rounded-2xl shadow-sm text-foreground lg:col-span-7 p-5 sm:p-6 space-y-4">
 <div className="flex items-center justify-between border-b border-divider/15 pb-3">
 <div className="space-y-1">
 <span className="text-[9px] bg-secondary-50 text-secondary-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border border-divider/20">
 Shift Active (Registered)
 </span>
 <h3 className="text-sm font-extrabold text-foreground mt-1">Cashier: {activeShift.cashierName}</h3>
 </div>

 <div className="text-right font-bold text-[10.5px] text-default-500">
 Opened: {new Date(activeShift.openedAt).toLocaleTimeString()}
 </div>
 </div>

 {/* Shift Sales details layout */}
 {shiftStats && (
 <div className="space-y-4 pt-1">
 <div className="grid grid-cols-3 gap-3">
 <div className="p-3.5 bg-background border border-divider/35 rounded-2xl text-center space-y-1">
 <span className="text-[9px] text-default-500 font-bold uppercase tracking-widest">Invoices</span>
 <h5 className="text-base font-extrabold text-primary">{shiftStats.salesCount} lines</h5>
 </div>

 <div className="p-3.5 bg-secondary-50 text-secondary-700 border border-secondary/20 rounded-2xl text-center space-y-1" title="Net grand totals checked out">
 <span className="text-[9px] text-secondary-700/80 font-bold uppercase tracking-widest">Net Revenue</span>
 <h5 className="text-base font-extrabold text-secondary">{formatCurrency(shiftStats.netTotal)}</h5>
 </div>

 <div className="p-3.5 bg-primary-50 text-primary-700 border border-primary/20 rounded-2xl text-center space-y-1">
 <span className="text-[9px] text-primary-700/80 font-bold uppercase tracking-widest">Start Cash</span>
 <h5 className="text-base font-extrabold text-primary">{formatCurrency(activeShift.startCash)}</h5>
 </div>
 </div>

 {/* Ledger Breakdown details */}
 <div className="space-y-2 border-t border-divider/15 pt-3 text-xs leading-relaxed">
 <div className="flex justify-between">
 <span className="text-default-500/85 font-medium">Gross Sales Subtotal:</span>
 <span className=" font-bold">{formatCurrency(shiftStats.salesTotal)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-default-500/85 font-medium">Calculated VAT Tax (12%):</span>
 <span className=" font-bold">{formatCurrency(shiftStats.vatTotal)}</span>
 </div>
 {shiftStats.discountTotal > 0 && (
 <div className="flex justify-between text-secondary font-bold">
 <span>Applied Discounts:</span>
 <span className="">-{formatCurrency(shiftStats.discountTotal)}</span>
 </div>
 )}

 <div className="flex justify-between border-t border-dashed border-divider/20 pt-2.5 font-black text-sm">
 <span>Expected Terminal Cash Total:</span>
 <span className=" text-primary">{formatCurrency(expectedEndCash)}</span>
 </div>
 </div>

 {/* Audit Actions trigger buttons */}
 <div className="grid grid-cols-2 gap-3 pt-2">
 <button
 onClick={() => setShowXReport(true)}
 className="p-2.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15 border border-divider/20 rounded-full cursor-pointer text-center transition-all duration-200"
 >
 X Report (Mid-Shift Audit)
 </button>

 <button
 onClick={() => setShowZReport(true)}
 className="bg-secondary text-secondary-foreground font-bold shadow-md shadow-secondary/20 rounded-medium p-2.5 text-xs font-bold rounded-full cursor-pointer text-center transition-all duration-200"
 >
 Z Report (End-Of-Day Closing)
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Close shift verification panel (Columns 5) */}
 <div className="bg-content1 border border-divider rounded-2xl shadow-sm text-foreground lg:col-span-5 p-5 sm:p-6 h-fit space-y-4">
 <h3 className="text-sm font-bold flex items-center gap-2 border-b border-divider/15 pb-2.5 text-primary">
 <Unlock className="h-5 w-5 text-secondary" /> Close Drawer Shift
 </h3>

 <form onSubmit={handleCloseLocalShift} className="space-y-4 pt-3 text-xs text-left">
 <div>
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1.5 pl-1">
 Actual Counted Drawer Cash (PHP)
 </label>
 <input
 type="number"
 required
 value={closingCashInput ?? ''}
 onChange={e => setClosingCashInput(e.target.value)}
 placeholder="3000"
 className="w-full bg-background border border-divider focus:border-primary px-3 py-2 text-sm text-center font-bold text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 {/* Informative summary calculation preview */}
 {closingCashInput && (
 <div className="p-3 bg-content2/40 border border-divider/30 rounded-2xl space-y-1.5 text-[11px]">
 <div className="flex justify-between text-default-500">
 <span>Expected drawer:</span>
 <span>{formatCurrency(expectedEndCash)}</span>
 </div>
 <div className="flex justify-between text-foreground">
 <span>Counted drawer:</span>
 <span className="font-bold">{formatCurrency(closingCashInput)}</span>
 </div>

 {/* Variance computed */}
 {(() => {
 const variance = (parseFloat(closingCashInput) || 0) - expectedEndCash;
 return (
 <div className={`flex justify-between border-t border-dashed border-divider/20 pt-1.5 font-black text-[12px] ${
 variance === 0
 ? 'text-secondary'
 : variance > 0
 ? 'text-primary'
 : 'text-red-500'
 }`}>
 <span>Variance / Deviation:</span>
 <span>{variance >= 0 ? '+' : ''}{formatCurrency(variance)}</span>
 </div>
 );
 })()}
 </div>
 )}

 <button
 type="submit"
 className="w-full py-2.5 bg-primary text-primary-foreground font-extrabold text-xs uppercase tracking-widest rounded-full cursor-pointer transition shadow hover:bg-primary/95 text-center"
 >
 Close Out Safe and Close Shift
 </button>
 </form>
 </div>
 </div>
 ) : (
 /* If shift is CLOSED */
 <div className="bg-content1 border border-divider rounded-2xl shadow-sm text-foreground text-center max-w-md mx-auto p-6 sm:p-8 space-y-5">
 <div className="p-3.5 bg-primary/10 text-primary border border-divider/15 rounded-full w-fit mx-auto cursor-pointer animate-pulse">
 <Lock className="h-6 w-6" />
 </div>

 <div>
 <h3 className="text-sm font-black text-primary uppercase tracking-wider">Register Shift is Lock / CLOSED</h3>
 <p className="text-xs text-default-500 mt-1.5 leading-relaxed">
 Active registers must have an initial starting cashier drawer fund declared before processing checkouts.
 </p>
 </div>

 <form onSubmit={handleOpenLocalShift} className="space-y-4 text-xs text-left">
 {previouslyClosedShift && (
 <div className="p-3 bg-content1 border border-divider/30 rounded-2xl space-y-1.5 text-[11px] leading-normal">
 <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-bold">
 <span>Previous Close Balance:</span>
 <span className=" font-black text-xs text-foreground">₱{previouslyClosedShift.cashCount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
 </div>
 <p className="text-[9.5px] text-default-500/80">
 Closed by <strong className="text-default-500 font-semibold">{previouslyClosedShift.cashierName}</strong> on {previouslyClosedShift.closedAt && !isNaN(new Date(previouslyClosedShift.closedAt).getTime()) ? new Date(previouslyClosedShift.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}.
 </p>
 <button
 type="button"
 onClick={() => {
 setStartCashInput(previouslyClosedShift.cashCount.toString());
 showToast(`Loaded previous shift balance of ₱${previouslyClosedShift.cashCount.toFixed(2)}`);
 }}
 className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold transition-all text-center text-[10px]"
 >
 Use Previous Shift Balance
 </button>
 </div>
 )}

 <div>
 <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1.5 pl-1">
 Declared Starting cash (PHP)
 </label>
 <input
 type="number"
 step="any"
 required
 value={startCashInput ?? ''}
 onChange={e => setStartCashInput(e.target.value)}
 className="w-full bg-background border border-divider focus:border-primary px-3 py-2 text-sm text-center font-bold text-foreground focus:outline-none transition-colors rounded-lg"
 />
 </div>

 <button
 type="submit"
 className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-medium w-full py-2.5 font-bold rounded-full shadow-sm cursor-pointer transition-colors text-center"
 >
 Start Shift Register
 </button>
 </form>
 </div>
 )}

  {/* Historic registers lists underneath */}
  <div className="bg-content1 border border-divider rounded-2xl shadow-sm text-foreground p-5 sm:p-6 space-y-4">
  <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5 ">
  <Coins className="h-4.5 w-4.5" /> Historic Shift Audit Ledgers ({shifts.length})
  </h4>

  <MultiSortBadgeBar
    sortDescriptors={shiftSortDescriptors}
    onRemoveSort={removeShiftSort}
    onClearSort={clearShiftSort}
    columnLabels={{
      id: 'Shift ID',
      cashierName: 'Cashier Assignee',
      startCash: 'Start Fund',
      expectedEndCash: 'Expected Drawer',
      countedDrawer: 'Counted Drawer',
      variance: 'Discrepancy',
      status: 'Status',
    }}
    className="mb-2"
  />

  <div className="overflow-x-auto text-xs">
  <HeroTable isStriped className="min-w-full">
  <HeroTable.Header>
  <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider">
  <HeroTable.Column
    allowsSorting
    sortDirection={getShiftSortDir('id')}
    sortRank={getShiftSortRank('id')}
    onSort={(e) => handleShiftSort('id', e)}
    className="py-2.5 px-3"
  >
    Shift ID
  </HeroTable.Column>
  <HeroTable.Column
    allowsSorting
    sortDirection={getShiftSortDir('cashierName')}
    sortRank={getShiftSortRank('cashierName')}
    onSort={(e) => handleShiftSort('cashierName', e)}
    className="py-2.5 px-3"
  >
    Cashier Assignee
  </HeroTable.Column>
  <HeroTable.Column
    align="end"
    allowsSorting
    sortDirection={getShiftSortDir('startCash')}
    sortRank={getShiftSortRank('startCash')}
    onSort={(e) => handleShiftSort('startCash', e)}
    className="py-2.5 px-3 text-right"
  >
    Start Fund
  </HeroTable.Column>
  <HeroTable.Column
    align="end"
    allowsSorting
    sortDirection={getShiftSortDir('expectedEndCash')}
    sortRank={getShiftSortRank('expectedEndCash')}
    onSort={(e) => handleShiftSort('expectedEndCash', e)}
    className="py-2.5 px-3 text-right"
  >
    Expected Drawer
  </HeroTable.Column>
  <HeroTable.Column
    align="end"
    allowsSorting
    sortDirection={getShiftSortDir('countedDrawer')}
    sortRank={getShiftSortRank('countedDrawer')}
    onSort={(e) => handleShiftSort('countedDrawer', e)}
    className="py-2.5 px-3 text-right"
  >
    Counted Drawer
  </HeroTable.Column>
  <HeroTable.Column
    align="end"
    allowsSorting
    sortDirection={getShiftSortDir('variance')}
    sortRank={getShiftSortRank('variance')}
    onSort={(e) => handleShiftSort('variance', e)}
    className="py-2.5 px-3 text-right"
  >
    Discrepancy (Variance)
  </HeroTable.Column>
  <HeroTable.Column
    align="center"
    allowsSorting
    sortDirection={getShiftSortDir('status')}
    sortRank={getShiftSortRank('status')}
    onSort={(e) => handleShiftSort('status', e)}
    className="py-2.5 px-3 text-center"
  >
    Status
  </HeroTable.Column>
  </tr>
  </HeroTable.Header>
  <HeroTable.Body>
  {sortedShifts
  .slice((shiftPage - 1) * shiftPageSize, shiftPage * shiftPageSize)
  .map((s, idx) => (
  <tr key={idx} className="hover:bg-content1/50">
  <td className="py-2.5 px-3 text-[11px] font-bold text-primary">{s.id}</td>
  <td className="py-2.5 px-3">{s.cashierName}</td>
  <td className="py-2.5 px-3 text-right ">{formatCurrency(s.startCash)}</td>
  <td className="py-2.5 px-3 text-right ">{formatCurrency(s.endCash !== undefined && s.endCash !== null ? s.endCash : (s.startCash + (s.shiftSalesTotal || 0)))}</td>
  <td className="py-2.5 px-3 text-right ">{formatCurrency(s.cashCount !== undefined && s.cashCount !== null ? s.cashCount : 0)}</td>
  <td className={`py-2.5 px-3 text-right font-bold ${
  (s.variance ?? 0) === 0
  ? 'text-secondary'
  : (s.variance ?? 0) > 0
  ? 'text-primary'
  : 'text-red-550'
  }`}>
  {formatCurrency(s.variance ?? 0)}
  </td>
  <td className="py-2.5 px-3 text-center">
  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
  s.status === 'OPEN'
  ? 'bg-secondary-50 text-secondary-700 border-secondary/20 animate-pulse'
  : 'bg-default-100 text-default-500 border-transparent'
  }`}>
  {s.status}
  </span>
  </td>
  </tr>
  ))}
  </HeroTable.Body>
  </HeroTable>
  </div>

 <div className="mt-3">
 <TablePagination
 currentPage={shiftPage}
 totalItems={shifts.length}
 pageSize={shiftPageSize}
 onPageChange={setShiftPage}
 itemName="shifts"
 />
 </div>
 </div>

 {/* X Report dialog OVERLAY */}
 {showXReport && activeShift && shiftStats && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowXReport(false)} />
 <div className={`relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 text-xs select-none bg-content1 text-foreground bir-receipt-container ${receiptFontClass}`}>
  <div className="text-center pb-2.5 border-b border-dashed border-divider/30">
 <h4 className="font-extrabold text-sm uppercase tracking-widest text-primary">X Report (Terminal Audit Only)</h4>
 
 </div>

 <div className="space-y-1.5 leading-relaxed text-default-500">
 <div className="flex justify-between">
 <span>Active Shift ID:</span>
 <span className="font-bold text-foreground">{activeShift.id}</span>
 </div>
 <div className="flex justify-between">
 <span>Cashier assigned:</span>
 <span className="font-bold text-foreground">{activeShift.cashierName}</span>
 </div>
 <div className="flex justify-between">
 <span>Time Stamp:</span>
 <span>{new Date().toLocaleTimeString()}</span>
 </div>
 <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/30 pt-1.5">
 <span>Sales processed:</span>
 <span>{shiftStats.salesCount} invoices</span>
 </div>
 </div>

 <div className="space-y-1.5 text-default-500 border-t border-dashed border-divider/30 pt-2 font-mono">
 <div className="flex justify-between">
 <span>Float Starting base:</span>
 <span>{formatCurrency(activeShift.startCash)}</span>
 </div>
 <div className="flex justify-between">
 <span>Gross sales Subtotal:</span>
 <span>{formatCurrency(shiftStats.salesTotal)}</span>
 </div>
 <div className="flex justify-between">
 <span>Sales Tax / VAT (12%):</span>
 <span>{formatCurrency(shiftStats.vatTotal)}</span>
 </div>
 <div className="flex justify-between">
 <span>Deducted Surcharges / Disc:</span>
 <span className="text-primary font-bold">-{formatCurrency(shiftStats.discountTotal)}</span>
 </div>

 <div className="flex justify-between font-black text-foreground border-t border-dashed border-divider/35 pt-2 text-sm leading-normal">
 <span>Expected Drawer Liquid:</span>
 <span className="text-primary">{formatCurrency(expectedEndCash)}</span>
 </div>
 </div>

 <div className="flex gap-2 pt-2 border-t border-dashed border-divider/30 bir-report-no-print">
 <button
 onClick={() => {
 window.print();
 addAuditLog('X_REPORT_PRINT', `Printed cashier X-Report for active shift ${activeShift.id}`, 'Shifts', activeShift.id);
 }}
 className="flex-1 py-2 px-3 text-[10px] rounded-full border border-divider/30 font-bold cursor-pointer flex justify-center gap-1.5 items-center hover:bg-default-100 text-primary transition-colors"
 >
 <Printer className="h-3.5 w-3.5" /> Print Ticket
 </button>

 <button
 onClick={() => setShowXReport(false)}
 className="flex-1 py-2 font-black uppercase bg-primary text-primary-foreground rounded-full cursor-pointer text-center text-[10px]"
 >
 Dismiss X
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* Z Report dialog OVERLAY */}
 {showZReport && activeShift && shiftStats && typeof document !== 'undefined' && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
 <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowZReport(false)} />
 <div className={`relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 text-xs font-mono select-none bg-content1 text-foreground bir-receipt-container ${receiptFontClass}`}>
  <div className="text-center pb-2.5 border-b border-dashed border-divider/30">
 <h4 className="font-extrabold text-sm uppercase tracking-widest text-secondary">Z Report (Terminal Seal)</h4>
 
 </div>

 <div className="space-y-1.5 leading-relaxed text-default-500">
 <div className="flex justify-between">
 <span>Final Shift ID:</span>
 <span className="font-bold text-foreground">{activeShift.id}</span>
 </div>
 <div className="flex justify-between">
 <span>Closing cashier assigned:</span>
 <span className="font-bold text-foreground">{activeShift.cashierName}</span>
 </div>
 <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/30 pt-1.5">
 <span>Calculated transaction items:</span>
 <span>{shiftStats.salesCount} invoices</span>
 </div>
 </div>

 <div className="space-y-1.5 text-default-500 border-t border-dashed border-divider/30 pt-2 font-mono">
 <div className="flex justify-between font-bold">
 <span>Net Shift Revenue:</span>
 <span className="text-secondary font-black">{formatCurrency(shiftStats.netTotal)}</span>
 </div>
 <div className="flex justify-between">
 <span>Total VAT Collected:</span>
 <span>{formatCurrency(shiftStats.vatTotal)}</span>
 </div>
 <div className="flex justify-between">
 <span>Applied Discounts:</span>
 <span className="text-primary font-bold">-{formatCurrency(shiftStats.discountTotal)}</span>
 </div>

 <div className="flex justify-between font-black text-foreground border-t border-dashed border-divider/35 pt-2 text-sm leading-normal">
 <span>Final expected cash drawer:</span>
 <span className="text-primary">{formatCurrency(expectedEndCash)}</span>
 </div>
 </div>

 <div className="flex gap-2 pt-2 border-t border-dashed border-divider/30 bir-report-no-print">
 <button
 onClick={() => {
 window.print();
 closeShift(expectedEndCash); // auto closes shift at precision
 setShowZReport(false);
 }}
 className="w-full py-2.5 bg-secondary text-secondary-foreground font-extrabold text-xs uppercase tracking-widest rounded-full cursor-pointer transition shadow text-center hover:bg-secondary/90"
 >
 Accept and Seal Z-Report Close
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}

 {/* Success notification popup */}
 <ToastNotification
 message={toastMessage}
 onClose={() => setToastMessage(null)}
 />
 </div>
 );
};
