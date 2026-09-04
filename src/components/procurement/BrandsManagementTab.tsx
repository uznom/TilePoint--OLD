import React, { useState } from "react";
import { Brand, Supplier, Product, User, UserRole } from "../../types/db";
import { Tag, Plus, Edit2, Trash2, Search, Building2, AlertTriangle, Package, RefreshCw } from "lucide-react";
import { HeroButton } from "../common/ui/HeroButton";
import { HeroTable } from "../common/ui/HeroTable";
import { BrandProductsModal } from "./modals/BrandProductsModal";

export interface BrandsManagementTabProps {
  brands: Brand[];
  suppliers: Supplier[];
  products?: Product[];
  currentUser: User | null;
  hasUnsyncedInventoryBrands?: boolean;
  onOpenAddBrand: () => void;
  onOpenEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onQuickMapSupplier?: (brandId: string, supplierId: string) => void;
  onSyncInventoryBrands?: () => void;
  onViewBrandProducts?: (brand: Brand) => void;
}

export const BrandsManagementTab: React.FC<BrandsManagementTabProps> = ({
  brands,
  suppliers,
  products = [],
  currentUser,
  hasUnsyncedInventoryBrands = false,
  onOpenAddBrand,
  onOpenEditBrand,
  onDeleteBrand,
  onQuickMapSupplier,
  onSyncInventoryBrands,
  onViewBrandProducts,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unmapped" | "mapped">("all");
  const [viewingBrandProducts, setViewingBrandProducts] = useState<Brand | null>(null);

  const activeBrands = brands.filter((b) => !b.isDeleted);
  const activeSuppliers = suppliers.filter((s) => !s.isDeleted);

  const unmappedBrands = activeBrands.filter(
    (b) =>
      !b.supplierId ||
      b.supplierId.trim() === "" ||
      b.supplierId === "unassigned" ||
      !activeSuppliers.some((s) => s.id === b.supplierId)
  );
  const mappedBrands = activeBrands.filter(
    (b) => b.supplierId && activeSuppliers.some((s) => s.id === b.supplierId)
  );

  const filteredBrands = activeBrands.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    const isUnmapped =
      !b.supplierId ||
      b.supplierId.trim() === "" ||
      b.supplierId === "unassigned" ||
      !activeSuppliers.some((s) => s.id === b.supplierId);

    if (filterMode === "unmapped") return isUnmapped;
    if (filterMode === "mapped") return !isUnmapped;
    return true;
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Active Brands</span>
            <div className="text-xl font-black mt-1 text-primary">
              {activeBrands.length} Cataloged
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Suppliers Mapped</span>
            <div className="text-xl font-black mt-1 text-emerald-500">
              {new Set(mappedBrands.map((b) => b.supplierId)).size} Vendors
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              unmappedBrands.length > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Unmapped Brands</span>
            <div
              className={`text-xl font-black mt-1 ${
                unmappedBrands.length > 0 ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              {unmappedBrands.length > 0 ? `${unmappedBrands.length} Awaiting Vendor` : "All Mapped"}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Discovered Inventory Brands Banner */}
      {hasUnsyncedInventoryBrands && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="font-black text-xs text-foreground">
                Discovered Brands in Inventory Products
              </span>
              <p className="text-[11px] text-default-500 mt-0.5">
                All distinct brand names from active inventory items are loaded below and ready for vendor mapping.
              </p>
            </div>
          </div>
          {isAdmin && onSyncInventoryBrands && (
            <HeroButton
              size="sm"
              color="primary"
              variant="solid"
              radius="full"
              onClick={onSyncInventoryBrands}
              startIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="font-bold shrink-0 text-xs shadow-xs"
            >
              Sync to Verified Brands
            </HeroButton>
          )}
        </div>
      )}

      {/* Header, Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brand name, description..."
              className="w-full bg-content1 border border-divider/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Search className="h-4 w-4 text-default-400 absolute left-3 top-2.5" />
          </div>

          {/* Quick Filter Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-content1 border border-divider/30 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                filterMode === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-default-500 hover:text-foreground"
              }`}
            >
              All ({activeBrands.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("unmapped")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === "unmapped"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-default-500 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <span>Unmapped</span>
              {unmappedBrands.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    filterMode === "unmapped"
                      ? "bg-white/30 text-white"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {unmappedBrands.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("mapped")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                filterMode === "mapped"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-default-500 hover:text-foreground"
              }`}
            >
              Mapped ({mappedBrands.length})
            </button>
          </div>
        </div>

        {isAdmin && (
          <HeroButton
            size="sm"
            color="primary"
            radius="full"
            onClick={onOpenAddBrand}
            startIcon={<Plus className="h-3.5 w-3.5" />}
            className="font-black text-xs uppercase tracking-wider shrink-0"
          >
            Register Brand
          </HeroButton>
        )}
      </div>

      {/* Brands Table */}
      <HeroTable isStriped className="min-w-full">
        <HeroTable.Header>
          <HeroTable.Column>Brand / Manufacturer</HeroTable.Column>
          <HeroTable.Column>Supplying Vendor</HeroTable.Column>
          <HeroTable.Column>Specifications & Details</HeroTable.Column>
          <HeroTable.Column align="end">Actions</HeroTable.Column>
        </HeroTable.Header>
        <HeroTable.Body>
          {filteredBrands.length === 0 ? (
            <HeroTable.Row isHoverable={false}>
              <HeroTable.Cell colSpan={4} className="p-8 text-center text-default-500 font-medium">
                {filterMode === "unmapped"
                  ? "All brands are currently mapped to a vendor! Great job."
                  : "No brands match your search criteria."}
              </HeroTable.Cell>
            </HeroTable.Row>
          ) : (
            filteredBrands.map((b) => {
              const supplier = activeSuppliers.find((s) => s.id === b.supplierId);
              const isUnmapped = !supplier;
              const isFromInventory = b.id.startsWith("INV-BND-");
              const prodCount = products.filter(
                (p) => !p.isDeleted && p.brand?.trim().toLowerCase() === b.name.trim().toLowerCase()
              ).length;

              return (
                <HeroTable.Row key={b.id}>
                  <HeroTable.Cell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingBrandProducts(b);
                          onViewBrandProducts?.(b);
                        }}
                        className="font-black text-foreground hover:text-primary hover:underline cursor-pointer text-left"
                        title="Click to view products for this brand"
                      >
                        {b.name}
                      </button>
                      {isFromInventory && (
                        <span
                          className="px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-wider"
                          title="Brand detected in inventory catalog"
                        >
                          Inventory
                        </span>
                      )}
                      {isUnmapped && (
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase">
                          Unmapped
                        </span>
                      )}
                    </div>
                  </HeroTable.Cell>
                  <HeroTable.Cell>
                    {isUnmapped ? (
                      isAdmin && onQuickMapSupplier && activeSuppliers.length > 0 ? (
                        <select
                          aria-label={`Map brand ${b.name} to vendor`}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) onQuickMapSupplier(b.id, e.target.value);
                          }}
                          className="bg-content2 border border-divider/40 text-xs font-bold rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
                        >
                          <option value="" disabled>
                            + Quick Map to Vendor...
                          </option>
                          {activeSuppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">
                          Direct / Unlinked
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{supplier.name}</span>
                        {isAdmin && onQuickMapSupplier && activeSuppliers.length > 1 && (
                          <select
                            aria-label={`Change vendor for ${b.name}`}
                            value={supplier.id}
                            onChange={(e) => {
                              if (e.target.value) onQuickMapSupplier(b.id, e.target.value);
                            }}
                            className="bg-transparent border border-divider/20 text-[10px] font-bold rounded px-1.5 py-0.5 text-default-400 hover:text-foreground cursor-pointer"
                            title="Switch supplier vendor"
                          >
                            {activeSuppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </HeroTable.Cell>
                  <HeroTable.Cell>
                    <div className="space-y-0.5">
                      <div className="text-default-500 truncate max-w-[300px]">
                        {b.description || "General catalog line"}
                      </div>
                      {prodCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingBrandProducts(b);
                            onViewBrandProducts?.(b);
                          }}
                          className="text-[10px] text-primary hover:underline font-mono flex items-center gap-1 cursor-pointer"
                          title="Click to view all items under this brand"
                        >
                          <Package className="h-3 w-3 inline" />
                          <span>{prodCount} item{prodCount !== 1 ? "s" : ""} in inventory</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-default-400 font-mono">No inventory items</span>
                      )}
                    </div>
                  </HeroTable.Cell>
                  <HeroTable.Cell align="end">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingBrandProducts(b);
                          onViewBrandProducts?.(b);
                        }}
                        className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-primary transition-colors cursor-pointer active:scale-95"
                        title="View Products for this Brand"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenEditBrand(b)}
                            className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer active:scale-95"
                            title="Edit Brand"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBrand(b)}
                            className="p-1.5 rounded-xl hover:bg-danger/10 text-default-500 hover:text-danger transition-colors cursor-pointer active:scale-95"
                            title="Delete Brand"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </HeroTable.Cell>
                </HeroTable.Row>
              );
            })
          )}
        </HeroTable.Body>
      </HeroTable>

      {/* Brand Products Modal */}
      <BrandProductsModal
        isOpen={Boolean(viewingBrandProducts)}
        onClose={() => setViewingBrandProducts(null)}
        brand={viewingBrandProducts}
        supplier={activeSuppliers.find((s) => s.id === viewingBrandProducts?.supplierId)}
        products={products}
      />
    </div>
  );
};
