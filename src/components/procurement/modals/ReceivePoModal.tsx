import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroTextarea } from "../../common/ui/HeroTextarea";
import { Branch, PurchaseOrder, PurchaseOrderItem, Supplier, User } from "../../../types/db";
import { Check, Truck } from "lucide-react";

export interface ReceivePoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePo: PurchaseOrder | null;
  suppliers: Supplier[];
  branches: Branch[];
  poItems: PurchaseOrderItem[];
  currentUser: User | null;
  receivedQuantities: Record<string, number>;
  setReceivedQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  receiveNotes: string;
  setReceiveNotes: (val: string) => void;
  onConfirmReceipt: () => void;
  isReceivingPO: boolean;
}

export const ReceivePoModal: React.FC<ReceivePoModalProps> = ({
  isOpen,
  onClose,
  activePo,
  suppliers,
  branches,
  poItems,
  currentUser: _currentUser,
  receivedQuantities,
  setReceivedQuantities,
  receiveNotes,
  setReceiveNotes,
  onConfirmReceipt,
  isReceivingPO,
}) => {
  if (!isOpen || !activePo || typeof document === "undefined") return null;

  const supplier = suppliers.find((s) => s.id === activePo.supplierId);
  const items = poItems.filter((i) => i.poId === activePo.id);
  const destBranch = branches.find((b) => b.id === activePo.branchId);

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">Receiving Dock: PO #{activePo.poNumber}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Physical Inbound Dock
                </span>
              </div>
              <p className="text-[11px] text-default-500 font-medium mt-0.5">
                Vendor: {supplier?.name || "Verified Supplier"} • Destination: {destBranch?.name || "Main Warehouse"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-4 space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
              Inbound Receiving Instructions
            </span>
            <p className="text-xs text-default-500 font-medium leading-relaxed">
              Verify physical pallet counts and carton conditions against the supplier delivery receipt (DR). Enter the actual counted pieces received below to update branch stock levels.
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-zinc-200/60 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-divider/20 shadow-2xs">
              <div className="grid grid-cols-12 gap-2 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                <span className="col-span-5">Product Details</span>
                <span className="col-span-2 text-right">Requested</span>
                <span className="col-span-2 text-right">Prior Received</span>
                <span className="col-span-3 text-right">Current Receipt</span>
              </div>

              {items.map((item) => {
                const currentVal = receivedQuantities[item.id] !== undefined ? receivedQuantities[item.id] : Math.max(0, (item.quantityRequested || 0) - (item.quantityReceived || 0));
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="col-span-5 space-y-0.5">
                      <div className="font-bold text-foreground">{item.productName}</div>
                      <div className="text-[10px] text-default-500 font-mono">ID: {item.productId}</div>
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-foreground">
                      {item.quantityRequested || 0} pcs
                    </div>
                    <div className="col-span-2 text-right font-mono font-semibold text-default-500">
                      {item.quantityReceived || 0} pcs
                    </div>
                    <div className="col-span-3 text-right">
                      <input
                        type="number"
                        min="0"
                        max={(item.quantityRequested || 0) * 2}
                        value={currentVal}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceivedQuantities((prev) => ({
                            ...prev,
                            [item.id]: val >= 0 ? val : 0,
                          }));
                        }}
                        className="w-24 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <HeroTextarea
            label="Receiving Notes / Discrepancy Remarks"
            rows={2}
            value={receiveNotes}
            onValueChange={(val) => setReceiveNotes(val)}
            placeholder="e.g. 2 boxes damaged on bottom pallet, noted on DR #10492..."
            radius="lg"
            variant="flat"
          />
        </div>

        <div className="flex items-center justify-between border-t border-divider/20 pt-4 shrink-0">
          <div className="text-[11px] text-default-500 font-medium">
            Receipt will automatically update current branch stock balances.
          </div>

          <div className="flex gap-2.5">
            <HeroButton
              variant="flat"
              size="sm"
              radius="full"
              onClick={onClose}
            >
              Cancel
            </HeroButton>
            <HeroButton
              variant="solid"
              color="success"
              size="sm"
              radius="full"
              isLoading={isReceivingPO}
              loadingText="Processing..."
              startIcon={<Check className="h-4 w-4" />}
              onClick={onConfirmReceipt}
              className="font-bold text-white shadow-[0_2px_8px_rgba(23,201,100,0.25)]"
            >
              Confirm Goods Receipt
            </HeroButton>
          </div>
        </div>
      </div>
    </HeroModal>
  );
};
