import React from "react";
import { createPortal } from "react-dom";
import { Branch, PurchaseOrder, PurchaseOrderItem, Supplier } from "../../../types/db";
import { FileText, X, Printer, Building2, MapPin } from "lucide-react";
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-content1 border border-divider/40 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl z-10 text-left space-y-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">Purchase Order Details</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {activePo.status}
                </span>
              </div>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider mt-0.5">
                PO Reference: #{activePo.poNumber} • Created: {activePo.date ? new Date(activePo.date).toLocaleDateString() : "N/A"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-wider">
                <Building2 className="h-3.5 w-3.5" />
                <span>Vendor Supplier</span>
              </div>
              <div className="text-xs font-bold text-foreground">{supplier?.name || "Verified Vendor"}</div>
              <div className="text-[10px] text-default-500">Contact: {supplier?.contactPerson || "Key Account Manager"}</div>
            </div>

            <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                <span>Destination Branch</span>
              </div>
              <div className="text-xs font-bold text-foreground">{destBranch?.name || "Main Warehouse"}</div>
              <div className="text-[10px] text-default-500">{destBranch?.address || "Central Distribution"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Line Items Requested ({items.length})
            </div>
            <div className="border border-divider/30 rounded-2xl overflow-hidden divide-y divide-divider/20">
              <div className="grid grid-cols-12 gap-2 bg-content2 p-3 text-[9px] font-black text-default-500 uppercase tracking-wider">
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
                  <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center text-xs">
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
                    <div className="col-span-2 text-right font-mono font-black text-primary">
                      {formatCurrency(total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-content2/30 border border-divider/20 rounded-2xl p-4 flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-default-500">Grand Total Valuation</span>
              <p className="text-[10px] text-default-500">Payment Terms: {activePo.paymentMode === "terms" ? `${activePo.termsLength || 30} Days Credit` : "Cash on Delivery (COD)"}</p>
            </div>
            <div className="text-xl font-black text-primary font-mono">
              {formatCurrency(activePo.totalAmount || 0)}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-divider/20 pt-4 shrink-0">
          <button
            type="button"
            onClick={() => onPrintPo(activePo)}
            className="px-4 py-2 bg-content2 hover:bg-content3 border border-divider/40 text-xs font-bold text-foreground rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Official PO Document</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
