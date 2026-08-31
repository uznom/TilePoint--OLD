import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { Shift } from "../../../types/db";

export interface PosShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  previouslyClosedShift: Shift | null;
  startCashInput: string;
  setStartCashInput: (val: string) => void;
  onOpenShiftSubmit: (e: React.FormEvent) => void;
  showToast: (msg: string) => void;
}

export const PosShiftModal: React.FC<PosShiftModalProps> = ({
  isOpen,
  onClose,
  previouslyClosedShift,
  startCashInput,
  setStartCashInput,
  onOpenShiftSubmit,
  showToast,
}) => {
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
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4"
          >
            <div className="flex items-start gap-3 mb-1">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-primary">
                  Cashier Terminal Shift Required
                </h3>
                <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
                  Please register an active cashier starting drawer fund to accept POS payments.
                </p>
              </div>
            </div>

            <form onSubmit={onOpenShiftSubmit} className="space-y-4 text-left">
              {previouslyClosedShift && (
                <div className="p-3 bg-content1 border border-divider/30 rounded-2xl space-y-1.5 text-[11px] leading-normal">
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-bold">
                    <span>Previous Close Balance:</span>
                    <span className="font-black text-xs text-foreground">
                      ₱{(Number(previouslyClosedShift?.cashCount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-default-500/80">
                    Closed by <strong className="text-default-500 font-semibold">{previouslyClosedShift.cashierName}</strong> on{" "}
                    {new Date(previouslyClosedShift.closedAt || "").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStartCashInput((Number(previouslyClosedShift?.cashCount) || 0).toString());
                      showToast(`Loaded previous shift balance of ₱${(Number(previouslyClosedShift?.cashCount) || 0).toFixed(2)}`);
                    }}
                    className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl font-bold transition-all text-center text-[10px] cursor-pointer"
                  >
                    Use Previous Shift Balance
                  </button>
                </div>
              )}

              <div className="space-y-2 relative pr-0 pl-0">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary block">
                    Opening Change Float (PHP)
                  </label>
                  <span className="text-[9px] text-default-500 font-medium">Standard Retail Float</span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1000.00"
                  value={startCashInput}
                  onChange={(e) => setStartCashInput(e.target.value)}
                  className="w-full bg-background border-b-2 border-divider px-3 py-2.5 text-base text-foreground focus:outline-none focus:border-primary transition-colors text-center font-black rounded-lg"
                />
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[500, 1000, 2000, 3000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStartCashInput(amt.toString())}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        startCashInput === amt.toString()
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-content2 hover:bg-content3 border-divider/40 text-foreground'
                      }`}
                    >
                      ₱{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

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
                  className="flex-1 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-xl px-4 py-2 text-xs cursor-pointer text-center hover:bg-primary/90 transition-colors"
                >
                  Open Terminal Shift
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
