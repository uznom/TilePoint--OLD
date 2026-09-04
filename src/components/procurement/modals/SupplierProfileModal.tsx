import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { Product, Supplier, Brand, User, UserRole } from "../../../types/db";
import { Building2, Phone, Mail, MapPin, Tag, CheckCircle2, AlertTriangle, Link2, Unlink, Package } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

export interface SupplierProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  products: Product[];
  brands?: Brand[];
  suppliers?: Supplier[];
  currentUser?: User | null;
  isAdmin?: boolean;
  onMapBrand?: (brandId: string, supplierId: string) => void;
  onUnmapBrand?: (brandId: string) => void;
  onViewBrandProducts?: (brand: Brand) => void;
  onQuickOrderProduct?: (product: Product) => void;
}

export const SupplierProfileModal: React.FC<SupplierProfileModalProps> = ({
  isOpen,
  onClose,
  supplier,
  products,
  brands = [],
  suppliers = [],
  currentUser,
  isAdmin: isAdminProp,
  onMapBrand,
  onUnmapBrand,
  onViewBrandProducts,
  onQuickOrderProduct: _onQuickOrderProduct,
}) => {
  if (!isOpen || !supplier || typeof document === "undefined") return null;

  const isAdmin = isAdminProp ?? (currentUser?.role === UserRole.ADMIN);
  const supplierProducts = products.filter((p) => !p.isDeleted && p.supplierId === supplier.id);

  // Active brands mapped to this specific supplier
  const mappedBrands = brands.filter((b) => !b.isDeleted && b.supplierId === supplier.id);

  // All brands currently unmapped across the catalog
  const unmappedBrands = brands.filter(
    (b) =>
      !b.isDeleted &&
      (!b.supplierId ||
        b.supplierId.trim() === "" ||
        b.supplierId === "unassigned" ||
        (suppliers.length > 0 && !suppliers.some((s) => s.id === b.supplierId && !s.isDeleted)))
  );

  const handleMapAll = () => {
    if (!onMapBrand) return;
    unmappedBrands.forEach((b) => onMapBrand(b.id, supplier.id));
  };

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

          {/* Brands Portfolio & Line Mapping Section */}
          <div className="space-y-3">
            {/* Header with quick stats */}
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider">
                  Associated Brands ({mappedBrands.length})
                </span>
              </div>
              {unmappedBrands.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {unmappedBrands.length} Unmapped in Catalog
                </span>
              )}
            </div>

            {/* Currently Mapped Brands */}
            {mappedBrands.length === 0 ? (
              <div className="p-3.5 text-center bg-zinc-100/40 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200/60 dark:border-white/5 text-default-500 text-xs">
                No brands currently mapped to this vendor.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mappedBrands.map((b) => {
                  const brandProductsCount = products.filter(
                    (p) => !p.isDeleted && p.brand?.toLowerCase() === b.name.toLowerCase()
                  ).length;
                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-2 shadow-2xs hover:border-primary/30 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                          <Tag className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{b.name}</span>
                        </div>
                        <div className="text-[10px] text-default-400 truncate mt-0.5">
                          {b.description || "Active catalog line"} • {brandProductsCount} product{brandProductsCount !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onViewBrandProducts && (
                          <button
                            type="button"
                            onClick={() => onViewBrandProducts(b)}
                            className="px-2 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                            title="View products under this brand"
                          >
                            <Package className="h-3 w-3" />
                            <span>Products</span>
                          </button>
                        )}
                        {isAdmin && onUnmapBrand && (
                          <button
                            type="button"
                            onClick={() => onUnmapBrand(b.id)}
                            className="p-1.5 rounded-xl hover:bg-danger/10 text-default-400 hover:text-danger transition-colors cursor-pointer active:scale-95"
                            title="Unlink brand from this supplier"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unmapped Brands Ready to Link Panel */}
            {unmappedBrands.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-300">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>Unmapped Brands Available</span>
                    </div>
                    <p className="text-[10px] text-default-500">
                      These catalog brands do not have an assigned vendor. Click to map to {supplier.name}:
                    </p>
                  </div>
                  {isAdmin && onMapBrand && unmappedBrands.length > 1 && (
                    <HeroButton
                      size="sm"
                      color="primary"
                      variant="solid"
                      radius="full"
                      onClick={handleMapAll}
                      className="font-bold shrink-0 shadow-xs text-xs"
                    >
                      Map All ({unmappedBrands.length})
                    </HeroButton>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {unmappedBrands.map((b) => {
                    const brandProductsCount = products.filter(
                      (p) => !p.isDeleted && p.brand?.toLowerCase() === b.name.toLowerCase()
                    ).length;
                    return (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-background border border-divider/30 flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-foreground truncate block">
                            {b.name}
                          </span>
                          <span className="text-[9px] text-default-400 font-mono block">
                            {brandProductsCount} product{brandProductsCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {isAdmin && onMapBrand && (
                          <HeroButton
                            size="sm"
                            color="primary"
                            variant="flat"
                            radius="full"
                            onClick={() => onMapBrand(b.id, supplier.id)}
                            startIcon={<Link2 className="h-2.5 w-2.5" />}
                            className="font-black text-[10px] shrink-0"
                          >
                            Map Brand
                          </HeroButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {unmappedBrands.length === 0 && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>All cataloged brands are fully mapped to vendors.</span>
              </div>
            )}
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
