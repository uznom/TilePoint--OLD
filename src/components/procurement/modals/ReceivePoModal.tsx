import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { Branch, PurchaseOrder, PurchaseOrderItem, Supplier, User } from "../../../types/db";
import { X, Check, Truck } from "lucide-react";

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
  currentUser,
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
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">Receiving Dock: PO #{activePo.poNumber}</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Physical Inbound Dock
                </span>
              </div>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider mt-0.5">
                Vendor: {supplier?.name || "Verified Supplier"} • Destination: {destBranch?.name || "Main Warehouse"}
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider block">
              Inbound Receiving Instructions
            </span>
            <p className="text-xs text-default-500 font-medium leading-relaxed">
              Verify physical pallet counts and carton conditions against the supplier delivery receipt (DR). Enter the actual counted pieces received below to update branch stock levels.
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-divider/30 rounded-2xl overflow-hidden divide-y divide-divider/20">
              <div className="grid grid-cols-12 gap-2 bg-content2 p-3 text-[9px] font-black text-default-500 uppercase tracking-wider">
                <span className="col-span-5">Product Details</span>
                <span className="col-span-2 text-right">Requested</span>
                <span className="col-span-2 text-right">Prior Received</span>
                <span className="col-span-3 text-right">Current Receipt</span>
              </div>

              {items.map((item) => {
                const currentVal = receivedQuantities[item.id] !== undefined ? receivedQuantities[item.id] : Math.max(0, (item.quantityRequested || 0) - (item.quantityReceived || 0));
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center text-xs">
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
                        className="w-24 bg-content1 border border-divider/60 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Receiving Notes / Discrepancy Remarks
            </label>
            <textarea
              rows={2}
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              placeholder="e.g. 2 boxes damaged on bottom pallet, noted on DR #10492..."
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-divider/20 pt-4 shrink-0">
          <div className="text-[10px] text-default-500 font-semibold">
            Receiving Agent: <strong className="text-foreground">{currentUser?.fullName || "Supervisor"}</strong>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-content2 hover:bg-content3 border border-divider/30 text-xs font-bold text-foreground rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isReceivingPO}
              onClick={onConfirmReceipt}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isReceivingPO ? "Processing Inbound..." : "Confirm & Ingest Stock"}</span>
            </button>
          </div>
        </div>
    </HeroModal>
  );
};
