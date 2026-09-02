import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { Product, Supplier } from "../../../types/db";
import { Building2, Phone, Mail, MapPin } from "lucide-react";
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
  onQuickOrderProduct: _onQuickOrderProduct,
}) => {
  if (!isOpen || !supplier || typeof document === "undefined") return null;

  const supplierProducts = products.filter((p) => !p.isDeleted && p.supplierId === supplier.id);

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">{supplier.name}</h3>
              <p className="text-[11px] text-default-500 font-medium">
                Verified vendor enterprise profile & linked catalog
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                <Phone className="h-3 w-3" />
                <span>Contact Details</span>
              </div>
              <div className="text-xs font-bold text-foreground">{supplier.contactPerson}</div>
              <div className="text-[10px] text-default-500 font-mono">{supplier.phone || "No phone registered"}</div>
            </div>

            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                <Mail className="h-3 w-3" />
                <span>Invoicing Email</span>
              </div>
              <div className="text-xs font-bold text-foreground truncate">{supplier.email || "N/A"}</div>
            </div>

            <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                <MapPin className="h-3 w-3" />
                <span>Depot Address</span>
              </div>
              <div className="text-xs font-bold text-foreground truncate">{supplier.address || "Main Plant"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center pl-1">
              <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider">
                Linked Product Catalog ({supplierProducts.length})
              </span>
            </div>

            {supplierProducts.length === 0 ? (
              <div className="py-8 text-center bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200/60 dark:border-white/5 text-default-500 text-xs font-medium">
                No catalog items currently mapped to this supplier.
              </div>
            ) : (
              <div className="border border-zinc-200/60 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-divider/20 max-h-[250px] overflow-y-auto shadow-2xs">
                {supplierProducts.map((p) => (
                  <div key={p.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground">{p.productName}</div>
                      <div className="text-[10px] text-default-500 font-mono">SKU: {p.sku} • Stock: {p.stockQuantity} pcs</div>
                    </div>
                    <div className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.costPrice || 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-divider/20 pt-4 shrink-0">
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
