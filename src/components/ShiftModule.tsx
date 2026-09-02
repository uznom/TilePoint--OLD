import { HeroModal } from './common/ui/HeroModal';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useReceiptFontSize } from './ReceiptFontSizeControl';
import { useDb } from '../context/DbContext';
import { formatCurrency } from '../utils/formatters';
import { useResponsivePageSize, TablePagination } from './TablePagination';
import { ToastNotification } from './ToastNotification';
import { HeroTable } from './common/ui/HeroTable';
import { HeroButton } from './common/ui/HeroButton';
import { useMultiSort } from '../hooks/useMultiSort';
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
  }, [shifts, currentUser]);

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
    <div className="space-y-6 animate-fade-in text-foreground font-sans">
      {/* Shift Overview panel */}
      {activeShift ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Active stats layout (Columns 7) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl shadow-elevation-soft text-foreground lg:col-span-7 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-divider/15 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20 font-mono">
                  Shift Active (Registered)
                </span>
                <h3 className="text-sm font-bold text-foreground mt-1">Cashier: {activeShift.cashierName}</h3>
              </div>

              <div className="text-right font-bold text-xs text-default-500 font-mono">
                Opened: {new Date(activeShift.openedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Shift Sales details layout */}
            {shiftStats && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider font-mono">Invoices</span>
                    <h5 className="text-lg font-bold text-primary font-mono">{shiftStats.salesCount} lines</h5>
                  </div>

                  <div className="p-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-2xl text-center space-y-1" title="Net grand totals checked out">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Net Revenue</span>
                    <h5 className="text-lg font-bold font-mono">{formatCurrency(shiftStats.netTotal)}</h5>
                  </div>

                  <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Start Cash</span>
                    <h5 className="text-lg font-bold font-mono">{formatCurrency(activeShift.startCash)}</h5>
                  </div>
                </div>

                {/* Ledger Breakdown details */}
                <div className="space-y-2 border-t border-divider/15 pt-3 text-xs leading-relaxed font-mono">
                  <div className="flex justify-between">
                    <span className="text-default-500 font-sans">Gross Sales Subtotal:</span>
                    <span className="font-bold">{formatCurrency(shiftStats.salesTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500 font-sans">Calculated VAT Tax (12%):</span>
                    <span className="font-bold">{formatCurrency(shiftStats.vatTotal)}</span>
                  </div>
                  {shiftStats.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-500 font-bold">
                      <span className="font-sans">Applied Discounts:</span>
                      <span>-{formatCurrency(shiftStats.discountTotal)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-dashed border-divider/20 pt-2.5 font-bold text-sm">
                    <span className="font-sans">Expected Terminal Cash Total:</span>
                    <span className="text-primary">{formatCurrency(expectedEndCash)}</span>
                  </div>
                </div>

                {/* Audit Actions trigger buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <HeroButton
                    onClick={() => setShowXReport(true)}
                    variant="flat"
                    color="primary"
                    size="sm"
                    radius="full"
                    className="font-bold text-xs"
                  >
                    X Report (Mid-Shift Audit)
                  </HeroButton>

                  <HeroButton
                    onClick={() => setShowZReport(true)}
                    variant="solid"
                    color="primary"
                    size="sm"
                    radius="full"
                    className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
                  >
                    Z Report (End-Of-Day Closing)
                  </HeroButton>
                </div>
              </div>
            )}
          </div>

          {/* Close shift verification panel (Columns 5) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl shadow-elevation-soft text-foreground lg:col-span-5 p-5 sm:p-6 h-fit space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-divider/20 pb-2.5 text-foreground font-mono">
              <Unlock className="h-4 w-4 text-primary" /> Close Drawer Shift
            </h3>

            <form onSubmit={handleCloseLocalShift} className="space-y-4 pt-1 text-xs text-left">
              <div>
                <label className="text-xs font-bold text-foreground tracking-tight block mb-1.5 pl-0.5">
                  Actual Counted Drawer Cash (PHP)
                </label>
                <input
                  type="number"
                  required
                  value={closingCashInput ?? ''}
                  onChange={e => setClosingCashInput(e.target.value)}
                  placeholder="3000"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 focus:ring-2 focus:ring-primary/30 px-4 py-2 text-sm text-center font-bold tracking-tight text-foreground focus:outline-none transition-all rounded-full font-mono"
                />
              </div>

              {/* Informative summary calculation preview */}
              {closingCashInput && (
                <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 rounded-2xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-default-500 font-sans">
                    <span>Expected drawer:</span>
                    <span className="font-bold font-mono text-foreground">{formatCurrency(expectedEndCash)}</span>
                  </div>
                  <div className="flex justify-between text-foreground font-sans">
                    <span>Counted drawer:</span>
                    <span className="font-bold font-mono">{formatCurrency(closingCashInput)}</span>
                  </div>

                  {/* Variance computed */}
                  {(() => {
                    const variance = (parseFloat(closingCashInput) || 0) - expectedEndCash;
                    return (
                      <div className={`flex justify-between border-t border-dashed border-divider/30 pt-1.5 font-bold text-xs ${
                        variance === 0
                          ? 'text-emerald-500'
                          : variance > 0
                          ? 'text-primary'
                          : 'text-rose-500'
                      }`}>
                        <span className="font-sans">Variance / Deviation:</span>
                        <span>{formatCurrency(variance, { signDisplay: 'exceptZero' })}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <HeroButton
                type="submit"
                color="primary"
                variant="solid"
                size="sm"
                radius="full"
                className="w-full font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
              >
                Close Out Safe and Close Shift
              </HeroButton>
            </form>
          </div>
        </div>
      ) : (
        /* If shift is CLOSED */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-3xl shadow-elevation-soft text-foreground text-center max-w-md mx-auto p-6 sm:p-8 space-y-5">
          <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-full w-fit mx-auto">
            <Lock className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Cash Register Closed</h3>
            <p className="text-xs text-default-400 mt-1 leading-relaxed font-medium">
              Declare an initial starting drawer fund before processing checkouts.
            </p>
          </div>

          <form onSubmit={handleOpenLocalShift} className="space-y-4 text-xs text-left">
            {previouslyClosedShift && (
              <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 rounded-2xl space-y-1.5 text-xs leading-normal">
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold font-mono">
                  <span>Previous Close Balance:</span>
                  <span className="text-xs text-foreground">₱{previouslyClosedShift.cashCount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <p className="text-[11px] text-default-400">
                  Closed by <strong className="text-foreground font-medium">{previouslyClosedShift.cashierName}</strong> on {previouslyClosedShift.closedAt && !isNaN(new Date(previouslyClosedShift.closedAt).getTime()) ? new Date(previouslyClosedShift.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}.
                </p>
                <HeroButton
                  type="button"
                  variant="flat"
                  size="sm"
                  radius="full"
                  onClick={() => {
                    setStartCashInput(previouslyClosedShift.cashCount.toString());
                    showToast(`Loaded previous shift balance of ₱${previouslyClosedShift.cashCount.toFixed(2)}`);
                  }}
                  className="w-full text-xs font-bold text-amber-600 dark:text-amber-400"
                >
                  Use Previous Shift Balance
                </HeroButton>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-0.5">
                <label className="text-xs font-bold text-foreground tracking-tight block">
                  Opening Change Float (PHP)
                </label>
                <span className="text-[11px] text-default-400 font-mono">Standard Retail Float</span>
              </div>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 1000.00"
                value={startCashInput ?? ''}
                onChange={e => setStartCashInput(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 focus:ring-2 focus:ring-primary/30 px-4 py-2 text-base text-center font-bold tracking-tight text-foreground focus:outline-none transition-all rounded-full font-mono"
              />
              <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono">
                {[500, 1000, 2000, 3000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStartCashInput(amt.toString())}
                    className={`py-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer active:scale-95 ${
                      startCashInput === amt.toString()
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-200/50 dark:border-white/5 text-foreground'
                    }`}
                  >
                    ₱{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <HeroButton
              type="submit"
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              className="w-full font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Start Shift Register
            </HeroButton>
          </form>
        </div>
      )}

      {/* Historic registers lists underneath */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10 rounded-2xl shadow-elevation-soft text-foreground p-5 sm:p-6 space-y-4 text-left">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
          <Coins className="h-4.5 w-4.5 text-primary" /> Historic Shift Audit Ledgers ({shifts.length})
        </h4>

        <div className="overflow-x-auto text-xs">
          <HeroTable isStriped className="min-w-full">
            <HeroTable.Header>
              <tr className="border-b border-divider/20 pb-2 text-[10px] uppercase font-bold text-default-500 tracking-wider font-mono">
                <HeroTable.Column
                  allowsSorting
                  sortDirection={getShiftSortDir('id')}
                  sortRank={getShiftSortRank('id')}
                  onSort={(e) => handleShiftSort('id', e)}
                  className="py-3 px-3.5"
                >
                  Shift ID
                </HeroTable.Column>
                <HeroTable.Column
                  allowsSorting
                  sortDirection={getShiftSortDir('cashierName')}
                  sortRank={getShiftSortRank('cashierName')}
                  onSort={(e) => handleShiftSort('cashierName', e)}
                  className="py-3 px-3.5"
                >
                  Cashier Assignee
                </HeroTable.Column>
                <HeroTable.Column
                  align="end"
                  allowsSorting
                  sortDirection={getShiftSortDir('startCash')}
                  sortRank={getShiftSortRank('startCash')}
                  onSort={(e) => handleShiftSort('startCash', e)}
                  className="py-3 px-3.5 text-right"
                >
                  Start Fund
                </HeroTable.Column>
                <HeroTable.Column
                  align="end"
                  allowsSorting
                  sortDirection={getShiftSortDir('expectedEndCash')}
                  sortRank={getShiftSortRank('expectedEndCash')}
                  onSort={(e) => handleShiftSort('expectedEndCash', e)}
                  className="py-3 px-3.5 text-right"
                >
                  Expected Drawer
                </HeroTable.Column>
                <HeroTable.Column
                  align="end"
                  allowsSorting
                  sortDirection={getShiftSortDir('countedDrawer')}
                  sortRank={getShiftSortRank('countedDrawer')}
                  onSort={(e) => handleShiftSort('countedDrawer', e)}
                  className="py-3 px-3.5 text-right"
                >
                  Counted Drawer
                </HeroTable.Column>
                <HeroTable.Column
                  align="end"
                  allowsSorting
                  sortDirection={getShiftSortDir('variance')}
                  sortRank={getShiftSortRank('variance')}
                  onSort={(e) => handleShiftSort('variance', e)}
                  className="py-3 px-3.5 text-right"
                >
                  Discrepancy (Variance)
                </HeroTable.Column>
                <HeroTable.Column
                  align="center"
                  allowsSorting
                  sortDirection={getShiftSortDir('status')}
                  sortRank={getShiftSortRank('status')}
                  onSort={(e) => handleShiftSort('status', e)}
                  className="py-3 px-3.5 text-center"
                >
                  Status
                </HeroTable.Column>
              </tr>
            </HeroTable.Header>
            <HeroTable.Body>
              {sortedShifts
                .slice((shiftPage - 1) * shiftPageSize, shiftPage * shiftPageSize)
                .map((s, idx) => (
                  <tr key={idx} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition font-medium">
                    <td className="py-3 px-3.5 font-bold text-primary font-mono text-[11px]">{s.id}</td>
                    <td className="py-3 px-3.5">{s.cashierName}</td>
                    <td className="py-3 px-3.5 text-right font-mono">{formatCurrency(s.startCash)}</td>
                    <td className="py-3 px-3.5 text-right font-mono">{formatCurrency(s.endCash !== undefined && s.endCash !== null ? s.endCash : (s.startCash + (s.shiftSalesTotal || 0)))}</td>
                    <td className="py-3 px-3.5 text-right font-mono">{formatCurrency(s.cashCount !== undefined && s.cashCount !== null ? s.cashCount : 0)}</td>
                    <td className={`py-3 px-3.5 text-right font-bold font-mono ${
                      (s.variance ?? 0) === 0
                        ? 'text-emerald-500'
                        : (s.variance ?? 0) > 0
                        ? 'text-primary'
                        : 'text-rose-500'
                    }`}>
                      {formatCurrency(s.variance ?? 0)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border font-mono ${
                        s.status === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-default-500 border-zinc-200/50 dark:border-white/5'
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
      {showXReport && activeShift && shiftStats && (
        <HeroModal
          isOpen={showXReport}
          onClose={() => setShowXReport(false)}
          size="sm"
          className={`p-6 border border-divider/30 space-y-4 text-xs select-none bg-white dark:bg-zinc-900 text-foreground bir-receipt-container ${receiptFontClass}`}
        >
          <div className="text-center pb-2.5 border-b border-dashed border-divider/30">
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary font-mono">X Report (Terminal Audit Only)</h4>
          </div>

          <div className="space-y-1.5 leading-relaxed text-default-500 font-mono">
            <div className="flex justify-between">
              <span className="font-sans">Active Shift ID:</span>
              <span className="font-bold text-foreground">{activeShift.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Cashier assigned:</span>
              <span className="font-bold text-foreground">{activeShift.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Time Stamp:</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/30 pt-1.5 font-sans">
              <span>Sales processed:</span>
              <span className="font-mono">{shiftStats.salesCount} invoices</span>
            </div>
          </div>

          <div className="space-y-1.5 text-default-500 border-t border-dashed border-divider/30 pt-2 font-mono">
            <div className="flex justify-between">
              <span className="font-sans">Float Starting base:</span>
              <span>{formatCurrency(activeShift.startCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Gross sales Subtotal:</span>
              <span>{formatCurrency(shiftStats.salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Sales Tax / VAT (12%):</span>
              <span>{formatCurrency(shiftStats.vatTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Deducted Surcharges / Disc:</span>
              <span className="text-primary font-bold">-{formatCurrency(shiftStats.discountTotal)}</span>
            </div>

            <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/35 pt-2 text-sm leading-normal">
              <span className="font-sans">Expected Drawer Liquid:</span>
              <span className="text-primary">{formatCurrency(expectedEndCash)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-dashed border-divider/30 bir-report-no-print">
            <HeroButton
              onClick={() => {
                window.print();
                addAuditLog('X_REPORT_PRINT', `Printed cashier X-Report for active shift ${activeShift.id}`, 'Shifts', activeShift.id);
              }}
              variant="flat"
              size="sm"
              radius="full"
              className="flex-1 font-bold text-xs"
              startIcon={<Printer className="h-3.5 w-3.5" />}
            >
              Print Ticket
            </HeroButton>

            <HeroButton
              onClick={() => setShowXReport(false)}
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              className="flex-1 font-bold text-xs"
            >
              Dismiss X
            </HeroButton>
          </div>
        </HeroModal>
      )}

      {/* Z Report dialog OVERLAY */}
      {showZReport && activeShift && shiftStats && (
        <HeroModal
          isOpen={showZReport}
          onClose={() => setShowZReport(false)}
          size="sm"
          className={`p-6 border border-divider/30 space-y-4 text-xs font-mono select-none bg-white dark:bg-zinc-900 text-foreground bir-receipt-container ${receiptFontClass}`}
        >
          <div className="text-center pb-2.5 border-b border-dashed border-divider/30">
            <h4 className="font-bold text-sm uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">Z Report (Terminal Seal)</h4>
          </div>

          <div className="space-y-1.5 leading-relaxed text-default-500 font-mono">
            <div className="flex justify-between">
              <span className="font-sans">Final Shift ID:</span>
              <span className="font-bold text-foreground">{activeShift.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Closing cashier assigned:</span>
              <span className="font-bold text-foreground">{activeShift.cashierName}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/30 pt-1.5 font-sans">
              <span>Calculated transaction items:</span>
              <span className="font-mono">{shiftStats.salesCount} invoices</span>
            </div>
          </div>

          <div className="space-y-1.5 text-default-500 border-t border-dashed border-divider/30 pt-2 font-mono">
            <div className="flex justify-between font-bold">
              <span className="font-sans">Net Shift Revenue:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{formatCurrency(shiftStats.netTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Total VAT Collected:</span>
              <span>{formatCurrency(shiftStats.vatTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Applied Discounts:</span>
              <span className="text-primary font-bold">-{formatCurrency(shiftStats.discountTotal)}</span>
            </div>

            <div className="flex justify-between font-bold text-foreground border-t border-dashed border-divider/35 pt-2 text-sm leading-normal">
              <span className="font-sans">Final expected cash drawer:</span>
              <span className="text-primary">{formatCurrency(expectedEndCash)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-dashed border-divider/30 bir-report-no-print">
            <HeroButton
              onClick={() => {
                window.print();
                closeShift(expectedEndCash); // auto closes shift at precision
                setShowZReport(false);
              }}
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              className="w-full font-bold text-xs uppercase tracking-wider shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Accept and Seal Z-Report Close
            </HeroButton>
          </div>
        </HeroModal>
      )}

      {/* Success notification popup */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
