import React from "react";
import { createPortal } from "react-dom";
import { Product, Supplier } from "../../../types/db";
import { Building2, X, Phone, Mail, MapPin } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

export interface SupplierProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  products: Product[];
  onQuickOrderProduct?: (product: Product) => void;
}

export const SupplierProfileModal: React.FC<SupplierProfileModalProps> = ({
  isOpen,
  onClose,
  supplier,
  products,
  onQuickOrderProduct,
}) => {
  if (!isOpen || !supplier || typeof document === "undefined") return null;

  const supplierProducts = products.filter((p) => !p.isDeleted && p.supplierId === supplier.id);

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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">{supplier.name}</h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider mt-0.5">
                Verified Vendor Enterprise Profile & Linked Catalog
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-wider">
                <Phone className="h-3 w-3" />
                <span>Contact Details</span>
              </div>
              <div className="text-xs font-bold text-foreground">{supplier.contactPerson}</div>
              <div className="text-[10px] text-default-500 font-mono">{supplier.phone || "No phone registered"}</div>
            </div>

            <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-wider">
                <Mail className="h-3 w-3" />
                <span>Invoicing Email</span>
              </div>
              <div className="text-xs font-bold text-foreground truncate">{supplier.email || "N/A"}</div>
            </div>

            <div className="bg-content2/50 border border-divider/30 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-wider">
                <MapPin className="h-3 w-3" />
                <span>Depot Address</span>
              </div>
              <div className="text-xs font-bold text-foreground truncate">{supplier.address || "Main Plant"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center pl-1">
              <span className="text-[10px] font-black text-default-500 uppercase tracking-wider">
                Linked Product Catalog ({supplierProducts.length})
              </span>
            </div>

            {supplierProducts.length === 0 ? (
              <div className="py-8 text-center bg-content2/30 rounded-2xl border border-dashed border-divider/30 text-default-500 text-xs font-medium">
                No catalog items currently mapped to this supplier.
              </div>
            ) : (
              <div className="border border-divider/30 rounded-2xl overflow-hidden divide-y divide-divider/20 max-h-[250px] overflow-y-auto">
                {supplierProducts.map((p) => (
                  <div key={p.id} className="p-3 flex justify-between items-center hover:bg-content2/40 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground">{p.productName}</div>
                      <div className="text-[10px] text-default-500 font-mono">SKU: {p.sku} • Stock: {p.stockQuantity} pcs</div>
                    </div>
                    <div className="text-right font-mono font-black text-xs text-emerald-500">
                      {formatCurrency(p.costPrice || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-divider/20 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
