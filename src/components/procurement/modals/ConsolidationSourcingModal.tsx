import React from "react";
import { HeroModal, HeroButton, HeroDatePicker, HeroAutocomplete, HeroAutocompleteItem } from "../../common/ui";
import { Branch, Supplier } from "../../../types/db";
import { Sparkles } from "lucide-react";

export interface ConsolidationSourcingModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierGroups: Record<string, any[]>;
  suppliers: Supplier[];
  branches: Branch[];
  poDestinationBranch: string;
  setPoDestinationBranch: (val: string) => void;
  paymentTerm: number | "CUSTOM";
  setPaymentTerm: (val: number | "CUSTOM") => void;
  payoutDueDate: string;
  setPayoutDueDate: (val: string) => void;
  isCustomPayoutDate: boolean;
  setIsCustomPayoutDate: (val: boolean) => void;
  onConfirmGeneratePOs: () => void;
}

export const ConsolidationSourcingModal: React.FC<ConsolidationSourcingModalProps> = ({
  isOpen,
  onClose,
  supplierGroups,
  suppliers: _suppliers,
  branches,
  poDestinationBranch,
  setPoDestinationBranch,
  paymentTerm,
  setPaymentTerm,
  payoutDueDate,
  setPayoutDueDate,
  isCustomPayoutDate,
  setIsCustomPayoutDate,
  onConfirmGeneratePOs,
}) => {
  const branchItems: HeroAutocompleteItem[] = React.useMemo(() => {
    return branches
      .filter((b) => !b.isDeleted)
      .map((b) => ({
        key: b.id,
        label: b.name,
        description: b.address || (b.branchCode ? `Branch Code: ${b.branchCode}` : undefined),
        textValue: `${b.name} ${b.branchCode || ""} ${b.address || ""}`,
      }));
  }, [branches]);

  if (!isOpen || typeof document === "undefined") return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Generate Purchase Orders</h3>
              <p className="text-[11px] text-default-500 font-medium">
                Multi-Vendor Procurement Batch
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <HeroAutocomplete
              label="Destination Delivery Warehouse"
              isRequired
              placeholder="Search receiving site..."
              items={branchItems}
              selectedKey={poDestinationBranch || null}
              onSelectionChange={(key) => setPoDestinationBranch(key ? String(key) : "")}
              radius="lg"
              variant="flat"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1">
              Supplier Credit Terms
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 15, 30, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setPaymentTerm(days);
                    setIsCustomPayoutDate(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer font-sans active:scale-95 ${
                    paymentTerm === days && !isCustomPayoutDate
                      ? "bg-primary text-white border-primary shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
                      : "bg-zinc-100/90 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-white/5 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {days === 0 ? "COD" : `${days} Days`}
                </button>
              ))}
            </div>
          </div>

          <HeroDatePicker
            label="Projected Due Date (Automated Calendar Sync)"
            value={payoutDueDate}
            onChange={(val) => {
              setPayoutDueDate(val);
              setIsCustomPayoutDate(true);
            }}
            radius="lg"
            variant="flat"
          />

          <div className="p-4 bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl space-y-1 text-xs shadow-2xs">
            <span className="font-bold text-foreground block">
              PO Batch Generation Summary:
            </span>
            <p className="text-[11px] text-default-500 leading-relaxed font-medium">
              This will create <strong>{Object.keys(supplierGroups).length} separate purchase order(s)</strong> grouped by supplier and automatically register their payables into the Supplier Corporate Calendar.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
          <HeroButton
            variant="flat"
            size="sm"
            radius="full"
            onClick={onClose}
          >
            Cancel
          </HeroButton>
          <HeroButton
            color="primary"
            variant="solid"
            size="sm"
            radius="full"
            startIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => {
              onConfirmGeneratePOs();
              onClose();
            }}
            className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Confirm &amp; Generate POs
          </HeroButton>
        </div>
      </div>
    </HeroModal>
  );
};
