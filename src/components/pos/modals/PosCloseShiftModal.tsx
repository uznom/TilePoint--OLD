import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { Shift } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";

export interface PosCloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: Shift | null;
  shiftStats: { cashSalesTotal: number; netTotal: number } | null;
  closeShiftCashInput: string;
  setCloseShiftCashInput: (val: string) => void;
  onCloseShiftSubmit: (e: React.FormEvent) => void;
}

export const PosCloseShiftModal: React.FC<PosCloseShiftModalProps> = ({
  isOpen,
  onClose,
  activeShift,
  shiftStats,
  closeShiftCashInput,
  setCloseShiftCashInput,
  onCloseShiftSubmit,
}) => {
  if (!activeShift) return null;

  const expectedCash = activeShift.startCash + (shiftStats?.cashSalesTotal || 0);
  const enteredCash = parseFloat(closeShiftCashInput) || 0;
  const variance = closeShiftCashInput === "" ? 0 : enteredCash - expectedCash;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 font-sans text-xs">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
          >
            <div className="flex items-start gap-3 mb-1">
              <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 shrink-0">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">
                  Close Cashier Drawer Shift
                </h3>
                <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
                  Verify and count the physical cash in the register drawer to close shift.
                </p>
              </div>
            </div>

            <form onSubmit={onCloseShiftSubmit} className="space-y-4">
              <div className="bg-content1 border border-divider/30 p-3.5 rounded-2xl space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-divider/15 pb-2">
                  <span className="text-default-500">Active Cashier:</span>
                  <span className="font-bold text-foreground">
                    {activeShift.cashierName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Starting Cash:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeShift.startCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Cash Sales Added:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(shiftStats?.cashSalesTotal || 0)}
                  </span>
                </div>
                {shiftStats && shiftStats.netTotal > shiftStats.cashSalesTotal && (
                  <div className="flex justify-between text-[11px] text-default-500/80">
                    <span>Non-Cash Payments:</span>
                    <span className="font-bold">
                      {formatCurrency(shiftStats.netTotal - shiftStats.cashSalesTotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-divider/25 pt-2 text-sm font-bold">
                  <span className="text-primary">Expected Drawer Cash:</span>
                  <span className="text-primary font-black">
                    {formatCurrency(expectedCash)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary block pl-1">
                  Physical Cash Counted (PHP)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={closeShiftCashInput}
                  onChange={(e) => setCloseShiftCashInput(e.target.value)}
                  placeholder="Enter counted physical cash..."
                  className="w-full bg-background border-b-2 border-divider px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors text-center font-black rounded-lg"
                />
              </div>

              {closeShiftCashInput !== "" && (
                <div className="p-3 bg-content1 border border-divider/30 rounded-2xl flex justify-between items-center">
                  <span className="text-xs text-default-500 font-bold uppercase">Variance:</span>
                  <span
                    className={`font-black text-sm ${
                      variance === 0
                        ? "text-default-500"
                        : variance > 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    {variance > 0 ? "+" : ""}
                    {formatCurrency(variance)}
                  </span>
                </div>
              )}

              <div className="flex gap-2 border-t border-divider/15 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-default-100 text-default-500 transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 text-xs font-black uppercase rounded-full shadow-sm cursor-pointer text-center transition-colors"
                >
                  Close Out & Close Shift
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
