/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { Shift, UserRole } from '../types/db';
import {
  Lock,
  Unlock,
  Coins,
  Printer,
  ShieldCheck,
  TrendingUp,
  XCircle,
  FileCheck
} from 'lucide-react';

interface ShiftModuleProps {
  darkMode: boolean;
}

export const ShiftModule: React.FC<ShiftModuleProps> = ({ darkMode }) => {
  const {
    shifts,
    activeShift,
    openShift,
    closeShift,
    getShiftReportStats,
    currentUser,
    addAuditLog
  } = useDb();

  const [startCashInput, setStartCashInput] = useState('3000');
  const [closingCashInput, setClosingCashInput] = useState('');

  // Report overlays
  const [showXReport, setShowXReport] = useState(false);
  const [showZReport, setShowZReport] = useState(false);

  // Success notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Stats computed
  const shiftStats = activeShift ? getShiftReportStats(activeShift) : null;
  const expectedEndCash = activeShift && shiftStats ? activeShift.startCash + shiftStats.netTotal : 0;

  const handleOpenLocalShift = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="space-y-6 animate-fade-in text-m3-on-surface">
      {/* Shift Overview panel */}
      {activeShift ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active stats layout (Columns 7) */}
          <div className="m3-card shadow-sm lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-m3-outline-variant/15 pb-3">
              <div className="space-y-1">
                <span className="text-[9px] bg-m3-tertiary-container text-m3-on-tertiary-container px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border border-m3-outline-variant/20">
                  Shift Active (Registered)
                </span>
                <h3 className="text-sm font-extrabold text-m3-on-surface mt-1">Cashier: {activeShift.cashierName}</h3>
              </div>

              <div className="text-right font-mono font-bold text-[10.5px] text-m3-on-surface-variant">
                Opened: {new Date(activeShift.openedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Shift Sales details layout */}
            {shiftStats && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-m3-surface border border-m3-outline-variant/35 rounded-2xl text-center space-y-1">
                    <span className="text-[9px] text-m3-on-surface-variant font-bold uppercase tracking-widest">Invoices</span>
                    <h5 className="text-base font-extrabold font-mono text-m3-primary">{shiftStats.salesCount} lines</h5>
                  </div>

                  <div className="p-3.5 bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-tertiary/20 rounded-2xl text-center space-y-1" title="Net grand totals checked out">
                    <span className="text-[9px] text-m3-on-tertiary-container-variant/80 font-bold uppercase tracking-widest">Net Revenue</span>
                    <h5 className="text-base font-extrabold font-mono text-m3-tertiary">₱{shiftStats.netTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</h5>
                  </div>

                  <div className="p-3.5 bg-m3-primary-container text-m3-on-primary-container border border-m3-primary/20 rounded-2xl text-center space-y-1">
                    <span className="text-[9px] text-m3-on-primary-container-variant/80 font-bold uppercase tracking-widest">Start Cash</span>
                    <h5 className="text-base font-extrabold font-mono text-m3-primary">₱{activeShift.startCash}</h5>
                  </div>
                </div>

                {/* Ledger Breakdown details */}
                <div className="space-y-2 border-t border-m3-outline-variant/15 pt-3 text-xs leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-m3-on-surface-variant/85 font-medium">Gross Sales Subtotal:</span>
                    <span className="font-mono font-bold">₱{shiftStats.salesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-m3-on-surface-variant/85 font-medium">Calculated VAT Tax (12%):</span>
                    <span className="font-mono font-bold">₱{shiftStats.vatTotal.toFixed(2)}</span>
                  </div>
                  {shiftStats.discountTotal > 0 && (
                    <div className="flex justify-between text-m3-tertiary font-bold">
                      <span>Applied Discounts:</span>
                      <span className="font-mono">-₱{shiftStats.discountTotal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-dashed border-m3-outline-variant/20 pt-2.5 font-black text-sm">
                    <span>Expected Terminal Cash Total:</span>
                    <span className="font-mono text-m3-primary">₱{expectedEndCash.toFixed(2)}</span>
                  </div>
                </div>

                {/* Audit Actions trigger buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowXReport(true)}
                    className="p-2.5 text-xs font-bold bg-m3-primary/10 text-m3-primary hover:bg-m3-primary/15 border border-m3-outline-variant/20 rounded-full cursor-pointer text-center transition-all duration-200"
                  >
                    X Report (Mid-Shift Audit)
                  </button>

                  <button
                    onClick={() => setShowZReport(true)}
                    className="m3-btn-tertiary p-2.5 text-xs font-bold rounded-full cursor-pointer text-center transition-all duration-200"
                  >
                    Z Report (End-Of-Day Closing)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close shift verification panel (Columns 5) */}
          <div className="m3-card shadow-sm lg:col-span-5 h-fit">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-m3-outline-variant/15 pb-2.5 text-m3-primary">
              <Unlock className="h-5 w-5 text-m3-tertiary" /> Close Drawer Shift
            </h3>

            <form onSubmit={handleCloseLocalShift} className="space-y-4 pt-3 text-xs text-left">
              <div>
                <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest block mb-1.5 pl-1">
                  Actual Counted Drawer Cash (PHP)
                </label>
                <input
                  type="number"
                  required
                  value={closingCashInput}
                  onChange={e => setClosingCashInput(e.target.value)}
                  placeholder="3000"
                  className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary px-3 py-2 text-sm text-center font-mono font-bold text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
                />
              </div>

              {/* Informative summary calculation preview */}
              {closingCashInput && (
                <div className="p-3 bg-m3-surface-container/40 border border-m3-outline-variant/30 rounded-2xl space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-m3-on-surface-variant">
                    <span>Expected drawer:</span>
                    <span>₱{expectedEndCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-m3-on-surface">
                    <span>Counted drawer:</span>
                    <span className="font-bold">₱{parseFloat(closingCashInput).toFixed(2)}</span>
                  </div>

                  {/* Variance computed */}
                  {(() => {
                    const variance = (parseFloat(closingCashInput) || 0) - expectedEndCash;
                    return (
                      <div className={`flex justify-between border-t border-dashed border-m3-outline-variant/20 pt-1.5 font-black text-[12px] ${
                        variance === 0
                          ? 'text-m3-tertiary'
                          : variance > 0
                          ? 'text-m3-primary'
                          : 'text-red-500'
                      }`}>
                        <span>Variance / Deviation:</span>
                        <span>{variance >= 0 ? '+' : ''}₱{variance.toFixed(2)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-m3-primary text-m3-on-primary font-extrabold text-xs uppercase tracking-widest rounded-full cursor-pointer transition shadow hover:bg-m3-primary/95 text-center"
              >
                Close Out Safe and Close Shift
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* If shift is CLOSED */
        <div className="m3-card shadow-sm border border-m3-outline-variant/30 text-center max-w-sm mx-auto p-6 space-y-4">
          <div className="p-3.5 bg-m3-primary/10 text-m3-primary border border-m3-outline-variant/15 rounded-full w-fit mx-auto cursor-pointer animate-pulse">
            <Lock className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider">Register Shift is Lock / CLOSED</h3>
            <p className="text-xs text-m3-on-surface-variant mt-1.5 leading-relaxed">
              Active registers must have an initial starting cashier drawer fund declared before processing checkouts.
            </p>
          </div>

          <form onSubmit={handleOpenLocalShift} className="space-y-4 text-xs text-left">
            <div>
              <label className="text-[10px] font-bold text-m3-primary uppercase tracking-widest block mb-1.5 pl-1">
                Declared Starting cash (PHP)
              </label>
              <input
                type="number"
                required
                value={startCashInput}
                onChange={e => setStartCashInput(e.target.value)}
                className="w-full bg-m3-surface border-b-2 border-m3-outline-variant focus:border-m3-primary px-3 py-2 text-sm text-center font-mono font-bold text-m3-on-surface focus:outline-none transition-colors rounded-t-md"
              />
            </div>

            <button
              type="submit"
              className="m3-btn-primary w-full py-2.5 font-bold rounded-full shadow-sm cursor-pointer transition-colors text-center"
            >
              Start Shift Register
            </button>
          </form>
        </div>
      )}

      {/* Historic registers lists underneath */}
      <div className="m3-card shadow-sm">
        <h4 className="text-xs font-bold text-m3-primary uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono">
          <Coins className="h-4.5 w-4.5" /> Historic Shift Audit Ledgers ({shifts.length})
        </h4>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-m3-outline-variant/20 pb-2 text-[10px] uppercase font-bold text-m3-on-surface-variant tracking-wider">
                <th className="py-2.5 px-3">Shift ID</th>
                <th className="py-2.5 px-3">Cashier Assignee</th>
                <th className="py-2.5 px-3 text-right">Start Fund</th>
                <th className="py-2.5 px-3 text-right">Expected Drawer</th>
                <th className="py-2.5 px-3 text-right">Counted Drawer</th>
                <th className="py-2.5 px-3 text-right">Discrepancy (Variance)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-m3-outline-variant/10 text-m3-on-surface/90">
              {shifts.map((s, idx) => (
                <tr key={idx} className="hover:bg-m3-surface-low/50">
                  <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-m3-primary">{s.id}</td>
                  <td className="py-2.5 px-3">{s.cashierName}</td>
                  <td className="py-2.5 px-3 text-right font-mono">₱{s.startCash.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">₱{(s.endCash || s.startCash + s.shiftSalesTotal + s.shiftVatTotal).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">₱{(s.cashCount || s.startCash + s.shiftSalesTotal + s.shiftVatTotal).toFixed(2)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                    s.variance === 0
                      ? 'text-m3-tertiary'
                      : s.variance > 0
                      ? 'text-m3-primary'
                      : 'text-red-550'
                  }`}>
                    ₱{s.variance.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                      s.status === 'OPEN'
                        ? 'bg-m3-tertiary-container text-m3-on-tertiary-container border-m3-tertiary/20 animate-pulse'
                        : 'bg-m3-outline-variant/20 text-m3-on-surface-variant border-transparent'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* X Report dialog OVERLAY */}
      {showXReport && activeShift && shiftStats && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowXReport(false)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl space-y-4 text-xs font-mono select-none bg-m3-surface-low text-m3-on-surface">
            <div className="text-center pb-2.5 border-b border-dashed border-m3-outline-variant/30">
              <h4 className="font-extrabold text-sm uppercase tracking-widest text-m3-primary">X Report (Terminal Audit Only)</h4>
              <p className="text-[10px] text-m3-on-surface-variant mt-0.5 font-semibold">Mid-Shift Cash Drawer Snapshot</p>
            </div>

            <div className="space-y-1.5 leading-relaxed text-m3-on-surface-variant">
              <div className="flex justify-between">
                <span>Active Shift ID:</span>
                <span className="font-bold text-m3-on-surface">{activeShift.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier assigned:</span>
                <span className="font-bold text-m3-on-surface">{activeShift.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Stamp:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between font-bold text-m3-on-surface border-t border-dashed border-m3-outline-variant/30 pt-1.5">
                <span>Sales processed:</span>
                <span>{shiftStats.salesCount} invoices</span>
              </div>
            </div>

            <div className="space-y-1.5 text-m3-on-surface-variant border-t border-dashed border-m3-outline-variant/30 pt-2 font-mono">
              <div className="flex justify-between">
                <span>Float Starting base:</span>
                <span>₱{activeShift.startCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross sales Subtotal:</span>
                <span>₱{shiftStats.salesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax / VAT (12%):</span>
                <span>₱{shiftStats.vatTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Deducted Surcharges / Disc:</span>
                <span className="text-m3-primary font-bold">-₱{shiftStats.discountTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-black text-m3-on-surface border-t border-dashed border-m3-outline-variant/35 pt-2 text-sm leading-normal">
                <span>Expected Drawer Liquid:</span>
                <span className="text-m3-primary">₱{expectedEndCash.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-dashed border-m3-outline-variant/30">
              <button
                onClick={() => {
                  window.print();
                  addAuditLog('X_REPORT_PRINT', `Printed cashier X-Report for active shift ${activeShift.id}`, 'Shifts', activeShift.id);
                }}
                className="flex-1 py-2 px-3 text-[10px] rounded-full border border-m3-outline-variant/30 font-bold cursor-pointer flex justify-center gap-1.5 items-center hover:bg-m3-outline-variant/15 text-m3-primary transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Print Ticket
              </button>

              <button
                onClick={() => setShowXReport(false)}
                className="flex-1 py-2 font-black uppercase bg-m3-primary text-m3-on-primary rounded-full cursor-pointer text-center text-[10px]"
              >
                Dismiss X
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z Report dialog OVERLAY */}
      {showZReport && activeShift && shiftStats && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="absolute inset-0 bg-gray-950/65 backdrop-blur-sm" onClick={() => setShowZReport(false)} />
          <div className="relative w-full max-w-sm rounded-[28px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl space-y-4 text-xs font-mono select-none bg-m3-surface-low text-m3-on-surface">
            <div className="text-center pb-2.5 border-b border-dashed border-m3-outline-variant/30">
              <h4 className="font-extrabold text-sm uppercase tracking-widest text-m3-tertiary">Z Report (Terminal Seal)</h4>
              <p className="text-[10px] text-m3-on-surface-variant mt-0.5 font-bold">Closes Active Drawer & Shifts Records</p>
            </div>

            <div className="space-y-1.5 leading-relaxed text-m3-on-surface-variant">
              <div className="flex justify-between">
                <span>Final Shift ID:</span>
                <span className="font-bold text-m3-on-surface">{activeShift.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Closing cashier assigned:</span>
                <span className="font-bold text-m3-on-surface">{activeShift.cashierName}</span>
              </div>
              <div className="flex justify-between font-bold text-m3-on-surface border-t border-dashed border-m3-outline-variant/30 pt-1.5">
                <span>Calculated transaction items:</span>
                <span>{shiftStats.salesCount} invoices</span>
              </div>
            </div>

            <div className="space-y-1.5 text-m3-on-surface-variant border-t border-dashed border-m3-outline-variant/30 pt-2 font-mono">
              <div className="flex justify-between font-bold">
                <span>Net Shift Revenue:</span>
                <span className="text-m3-tertiary font-black">₱{shiftStats.netTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total VAT Collected:</span>
                <span>₱{shiftStats.vatTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Applied Discounts:</span>
                <span className="text-m3-primary font-bold">-₱{shiftStats.discountTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-black text-m3-on-surface border-t border-dashed border-m3-outline-variant/35 pt-2 text-sm leading-normal">
                <span>Final expected cash drawer:</span>
                <span className="text-m3-primary">₱{expectedEndCash.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-dashed border-m3-outline-variant/30">
              <button
                onClick={() => {
                  window.print();
                  closeShift(expectedEndCash); // auto closes shift at precision
                  setShowZReport(false);
                }}
                className="w-full py-2.5 bg-m3-tertiary text-m3-on-tertiary font-extrabold text-xs uppercase tracking-widest rounded-full cursor-pointer transition shadow text-center hover:bg-m3-tertiary/90"
              >
                Accept and Seal Z-Report Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-m3-on-surface text-m3-surface text-xs font-bold py-3 px-5 rounded-[16px] shadow-xl z-50 border border-m3-outline-variant/30 flex items-center gap-2 animate-bounce max-w-[280px]">
          <ShieldCheck className="h-4.5 w-4.5 text-m3-tertiary shrink-0" />
          <span className="leading-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
