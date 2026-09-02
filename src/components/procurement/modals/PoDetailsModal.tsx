import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { Branch, PurchaseOrder, PurchaseOrderItem, Supplier } from "../../../types/db";
import { FileText, Printer, Building2, MapPin } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

export interface PoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePo: PurchaseOrder | null;
  suppliers: Supplier[];
  branches: Branch[];
  poItems: PurchaseOrderItem[];
  onPrintPo: (po: PurchaseOrder) => void;
}

export const PoDetailsModal: React.FC<PoDetailsModalProps> = ({
  isOpen,
  onClose,
  activePo,
  suppliers,
  branches,
  poItems,
  onPrintPo,
}) => {
  if (!isOpen || !activePo || typeof document === "undefined") return null;

  const supplier = suppliers.find((s) => s.id === activePo.supplierId);
  const items = poItems.filter((i) => i.poId === activePo.id);
  const destBranch = branches.find((b) => b.id === activePo.branchId);

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">Purchase Order Details</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {activePo.status}
                </span>
              </div>
              <p className="text-[11px] text-default-500 font-medium mt-0.5">
                PO Reference: #{activePo.poNumber} • Created: {activePo.date ? new Date(activePo.date).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                <span>Vendor Supplier</span>
              </div>
              <div className="text-xs font-bold text-foreground">{supplier?.name || "Verified Vendor"}</div>
              <div className="text-[11px] text-default-500">Contact: {supplier?.contactPerson || "Key Account Manager"}</div>
            </div>

            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                <span>Destination Branch</span>
              </div>
              <div className="text-xs font-bold text-foreground">{destBranch?.name || "Main Warehouse"}</div>
              <div className="text-[11px] text-default-500">{destBranch?.address || "Central Distribution"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1">
              Line Items Requested ({items.length})
            </div>
            <div className="border border-zinc-200/60 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-divider/20 shadow-2xs">
              <div className="grid grid-cols-12 gap-2 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                <span className="col-span-6">Item Specification</span>
                <span className="col-span-2 text-right">Cost Price</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Line Total</span>
              </div>

              {items.map((item, idx) => {
                const cost = Number(item.costPrice) || 0;
                const qty = Number(item.quantityRequested) || 0;
                const total = cost * qty;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="col-span-6 space-y-0.5">
                      <div className="font-bold text-foreground">{item.productName}</div>
                      <div className="text-[10px] text-default-500 font-mono">ID: {item.productId}</div>
                    </div>
                    <div className="col-span-2 text-right font-mono text-default-500">
                      {formatCurrency(cost)}
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-foreground">
                      {qty} pcs
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-primary">
                      {formatCurrency(total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-default-500">Grand Total Valuation</span>
              <p className="text-[11px] text-default-500">Payment Terms: {activePo.paymentMode === "terms" ? `${activePo.termsLength || 30} Days Credit` : "Cash on Delivery (COD)"}</p>
            </div>
            <div className="text-xl font-bold text-primary font-mono">
              {formatCurrency(activePo.totalAmount || 0)}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-divider/20 pt-4 shrink-0">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
            startIcon={<Printer className="h-3.5 w-3.5" />}
            onClick={() => onPrintPo(activePo)}
            className="font-bold"
          >
            Print Official PO Document
          </HeroButton>
          <HeroButton
            type="button"
            variant="solid"
            color="primary"
            size="sm"
            radius="full"
            onClick={onClose}
            className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Done
          </HeroButton>
        </div>
      </div>
    </HeroModal>
  );
};
