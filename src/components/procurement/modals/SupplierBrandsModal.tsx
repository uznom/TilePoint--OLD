import React, { useState, useMemo } from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { Supplier, Brand, Product } from "../../../types/db";
import { Building2, Tag, Plus, Package, Link2, Unlink, Search, CheckCircle2, AlertTriangle, Eye } from "lucide-react";

export interface SupplierBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  brands: Brand[];
  products: Product[];
  isAdmin?: boolean;
  onMapBrand?: (brandId: string, supplierId: string) => void;
  onUnmapBrand?: (brandId: string) => void;
  onViewBrandProducts?: (brand: Brand) => void;
  onOpenAddBrand?: () => void;
}

export const SupplierBrandsModal: React.FC<SupplierBrandsModalProps> = ({
  isOpen,
  onClose,
  supplier,
  brands,
  products,
  isAdmin = false,
  onMapBrand,
  onUnmapBrand,
  onViewBrandProducts,
  onOpenAddBrand,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"mapped" | "unmapped">("mapped");

  const mappedBrands = useMemo(() => {
    if (!supplier) return [];
    return brands.filter((b) => !b.isDeleted && b.supplierId === supplier.id);
  }, [brands, supplier]);

  const unmappedBrands = useMemo(() => {
    return brands.filter(
      (b) => !b.isDeleted && (!b.supplierId || b.supplierId.trim() === "" || b.supplierId === "unassigned")
    );
  }, [brands]);

  const filteredMappedBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return mappedBrands;
    return mappedBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [mappedBrands, searchQuery]);

  const filteredUnmappedBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unmappedBrands;
    return unmappedBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [unmappedBrands, searchQuery]);

  const handleMapAll = () => {
    if (!onMapBrand || !supplier) return;
    unmappedBrands.forEach((b) => onMapBrand(b.id, supplier.id));
  };

  if (!isOpen || !supplier) return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-6 sm:p-7 space-y-5 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">{supplier.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase">
                  Brands Portfolio
                </span>
              </div>
              <p className="text-[11px] text-default-500 font-medium mt-0.5">
                Representative: {supplier.contactPerson} • {supplier.phone || "No direct phone"}
              </p>
            </div>
          </div>

          {isAdmin && onOpenAddBrand && (
            <HeroButton
              size="sm"
              color="primary"
              variant="solid"
              radius="full"
              onClick={onOpenAddBrand}
              startIcon={<Plus className="h-3.5 w-3.5" />}
              className="font-black text-xs uppercase tracking-wider shrink-0"
            >
              Register Brand
            </HeroButton>
          )}
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Brands Supplied
              </span>
              <div className="text-base font-black text-primary mt-0.5">
                {mappedBrands.length} Lines
              </div>
            </div>
          </div>

          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Items in Stock
              </span>
              <div className="text-base font-black text-emerald-500 mt-0.5">
                {
                  products.filter(
                    (p) =>
                      !p.isDeleted &&
                      mappedBrands.some(
                        (b) => b.name.trim().toLowerCase() === p.brand?.trim().toLowerCase()
                      )
                  ).length
                } Products
              </div>
            </div>
          </div>

          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                unmappedBrands.length > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Unmapped Brands
              </span>
              <div
                className={`text-base font-black mt-0.5 ${
                  unmappedBrands.length > 0 ? "text-amber-500" : "text-emerald-500"
                }`}
              >
                {unmappedBrands.length > 0 ? `${unmappedBrands.length} Ready` : "None"}
              </div>
            </div>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-content1 border border-divider/30 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("mapped")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === "mapped"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-default-500 hover:text-foreground"
              }`}
            >
              Mapped Brands ({mappedBrands.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unmapped")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "unmapped"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-default-500 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <span>Available to Map</span>
              {unmappedBrands.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === "unmapped"
                      ? "bg-white/30 text-white"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {unmappedBrands.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brand name..."
              className="w-full bg-content1 border border-divider/40 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Search className="h-3.5 w-3.5 text-default-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2.5">
          {activeTab === "mapped" ? (
            filteredMappedBrands.length === 0 ? (
              <div className="py-12 text-center bg-content1 rounded-2xl border border-dashed border-divider/30 text-default-500 text-xs">
                {mappedBrands.length === 0 ? (
                  <div className="space-y-2">
                    <p className="font-bold text-foreground">No brands currently linked to {supplier.name}.</p>
                    <p className="text-[11px] text-default-400">
                      Switch to "Available to Map" above to link existing catalog brands, or register a new brand.
                    </p>
                  </div>
                ) : (
                  "No mapped brands match your search query."
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredMappedBrands.map((b) => {
                  const brandProductsCount = products.filter(
                    (p) => !p.isDeleted && p.brand?.trim().toLowerCase() === b.name.trim().toLowerCase()
                  ).length;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-content1 border border-divider/30 flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{b.name}</span>
                          {b.id.startsWith("INV-BND-") && (
                            <span className="px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase">
                              Inventory
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-default-400 truncate mt-0.5">
                          {b.description || "Active brand line"}
                        </div>
                        <div className="text-[10px] text-default-500 font-mono mt-1 flex items-center gap-1">
                          <Package className="h-3 w-3 inline text-default-400" />
                          <span>{brandProductsCount} product{brandProductsCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onViewBrandProducts && (
                          <HeroButton
                            size="sm"
                            variant="flat"
                            color="primary"
                            radius="full"
                            onClick={() => onViewBrandProducts(b)}
                            startIcon={<Eye className="h-3 w-3" />}
                            className="font-bold text-xs"
                          >
                            View Products
                          </HeroButton>
                        )}
                        {isAdmin && onUnmapBrand && (
                          <button
                            type="button"
                            onClick={() => onUnmapBrand(b.id)}
                            className="p-1.5 rounded-xl hover:bg-danger/10 text-default-400 hover:text-danger transition-colors cursor-pointer active:scale-95"
                            title="Unlink brand from vendor"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {unmappedBrands.length > 1 && isAdmin && onMapBrand && (
                <div className="flex justify-between items-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    Bulk Map: Link all {unmappedBrands.length} unassigned brands to {supplier.name}
                  </span>
                  <HeroButton
                    size="sm"
                    color="primary"
                    variant="solid"
                    radius="full"
                    onClick={handleMapAll}
                    className="font-bold text-xs"
                  >
                    Map All ({unmappedBrands.length})
                  </HeroButton>
                </div>
              )}

              {filteredUnmappedBrands.length === 0 ? (
                <div className="py-8 text-center bg-content1 rounded-2xl border border-divider/30 text-default-500 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <span className="font-bold text-foreground">
                    All catalog & inventory brands are already mapped to a supplier!
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredUnmappedBrands.map((b) => {
                    const brandProductsCount = products.filter(
                      (p) => !p.isDeleted && p.brand?.trim().toLowerCase() === b.name.trim().toLowerCase()
                    ).length;

                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl bg-content1 border border-divider/30 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-500/40 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                            <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{b.name}</span>
                          </div>
                          <div className="text-[10px] text-default-400 truncate mt-0.5">
                            {brandProductsCount} product{brandProductsCount !== 1 ? "s" : ""} in catalog
                          </div>
                        </div>

                        {isAdmin && onMapBrand && (
                          <HeroButton
                            size="sm"
                            color="primary"
                            variant="flat"
                            radius="full"
                            onClick={() => onMapBrand(b.id, supplier.id)}
                            startIcon={<Link2 className="h-3 w-3" />}
                            className="font-black text-xs shrink-0"
                          >
                            Map Brand
                          </HeroButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-divider/20 pt-3 shrink-0">
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
