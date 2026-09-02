import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroButton } from "../../common/ui/HeroButton";
import { Branch, Supplier } from "../../../types/db";
import { Sparkles, X } from "lucide-react";

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
  suppliers,
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
  if (!isOpen || typeof document === "undefined") return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="lg" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Generate Purchase Orders</h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">
                Multi-Vendor Procurement Batch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <HeroSelect
              label="Destination Delivery Warehouse"
              value={poDestinationBranch}
              onChange={(e) => setPoDestinationBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.address || "Main Site"})
                </option>
              ))}
            </HeroSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
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
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                    paymentTerm === days && !isCustomPayoutDate
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-content2 border-divider/30 text-default-600 hover:bg-content3"
                  }`}
                >
                  {days === 0 ? "COD" : `${days} Days`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Projected Due Date (Automated Calendar Sync)
            </label>
            <input
              type="date"
              value={payoutDueDate}
              onChange={(e) => {
                setPayoutDueDate(e.target.value);
                setIsCustomPayoutDate(true);
              }}
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="p-3.5 bg-content2/50 border border-divider/20 rounded-2xl space-y-1 text-xs">
            <span className="font-bold text-foreground block">
              PO Batch Generation Summary:
            </span>
            <p className="text-[11px] text-default-500 leading-relaxed">
              This will create <strong>{Object.keys(supplierGroups).length} separate purchase order(s)</strong> grouped by supplier and automatically register their payables into the Supplier Corporate Calendar.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
          <HeroButton
            variant="flat"
            color="default"
            size="sm"
            radius="full"
            onClick={onClose}
          >
            Cancel
          </HeroButton>
          <HeroButton
            variant="solid"
            color="primary"
            size="sm"
            radius="full"
            className="font-black uppercase tracking-wider shadow-lg"
            onClick={onConfirmGeneratePOs}
          >
            Create Purchase Orders
          </HeroButton>
        </div>
    </HeroModal>
  );
};
