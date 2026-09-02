import React from "react";
import { Lock } from "lucide-react";
import { Shift } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroButton } from "../../common/ui/HeroButton";

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
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="p-5 sm:p-6 space-y-4 font-sans text-xs text-foreground text-left">
        <div className="flex items-start gap-3 pb-3 border-b border-divider/20">
          <div className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Cashier Terminal Shift Required
            </h3>
            <p className="text-xs text-default-500 mt-0.5 font-medium leading-relaxed">
              Please register an active cashier starting drawer fund to accept POS payments.
            </p>
          </div>
        </div>

        <form onSubmit={onOpenShiftSubmit} className="space-y-4">
          {previouslyClosedShift && (
            <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-2 text-[11px] leading-normal shadow-2xs">
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-500 font-bold">
                <span>Previous Close Balance:</span>
                <span className="font-black text-xs text-foreground">
                  {formatCurrency(Number(previouslyClosedShift?.cashCount) || 0)}
                </span>
              </div>
              <p className="text-[10px] text-default-500">
                Closed by <strong className="text-default-700 dark:text-default-300 font-semibold">{previouslyClosedShift.cashierName}</strong> on{" "}
                {new Date(previouslyClosedShift.closedAt || "").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}.
              </p>
              <HeroButton
                type="button"
                variant="flat"
                size="sm"
                radius="lg"
                onClick={() => {
                  setStartCashInput((Number(previouslyClosedShift?.cashCount) || 0).toString());
                  showToast(`Loaded previous shift balance of ${formatCurrency(Number(previouslyClosedShift?.cashCount) || 0)}`);
                }}
                className="w-full font-bold text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              >
                Use Previous Shift Balance
              </HeroButton>
            </div>
          )}

          <div className="space-y-2">
            <HeroInput
              label="Opening Change Float (PHP)"
              type="number"
              step="any"
              required
              placeholder="e.g. 1000.00"
              value={startCashInput}
              onValueChange={(val) => setStartCashInput(val)}
              radius="lg"
              variant="flat"
              className="text-center font-black text-base"
            />
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[500, 1000, 2000, 3000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStartCashInput(amt.toString())}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer font-sans active:scale-95 ${
                    startCashInput === amt.toString()
                      ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(0,111,238,0.25)]'
                      : 'bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-200/50 dark:border-white/5 text-foreground'
                  }`}
                >
                  ₱{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

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
              color="primary"
              variant="solid"
              size="sm"
              radius="full"
              className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Open Terminal Shift
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
