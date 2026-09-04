import React from "react";
import { LockKeyhole } from "lucide-react";
import { Shift } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";

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
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex items-start gap-3 pb-3 border-b border-divider/20">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Close Cashier Drawer Shift
            </h3>
            <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
              Verify and count the physical cash in the register drawer to close shift.
            </p>
          </div>
        </div>

        <form onSubmit={onCloseShiftSubmit} className="space-y-4">
          <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 p-4 rounded-2xl space-y-2.5 text-xs shadow-2xs">
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
              <div className="flex justify-between text-[11px] text-default-500">
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
            <HeroInput
              label="Physical Cash Counted (PHP)"
              type="number"
              step="any"
              required
              size="lg"
              value={closeShiftCashInput}
              onValueChange={(val) => setCloseShiftCashInput(val)}
              placeholder="0.00"
              radius="lg"
              variant="flat"
              startContent={<span className="text-xl sm:text-2xl font-black text-default-400 font-mono select-none">₱</span>}
              classNames={{
                input: "text-xl sm:text-2xl font-black font-mono text-center tracking-tight",
                inputWrapper: "h-14 sm:h-16 shadow-inner border border-divider/40",
              }}
            />
          </div>

          {closeShiftCashInput !== "" && (
            <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl flex justify-between items-center shadow-2xs">
              <span className="text-xs text-default-500 font-bold uppercase tracking-wider">Variance:</span>
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

          <div className="flex justify-end gap-2 border-t border-divider/20 pt-4">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              radius="full"
              onClick={onClose}
            >
              Cancel
            </HeroButton>
            <HeroButton
              type="submit"
              color="danger"
              variant="solid"
              size="sm"
              radius="full"
              className="font-bold shadow-[0_2px_8px_rgba(243,18,96,0.25)]"
            >
              Close Out & End Shift
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
