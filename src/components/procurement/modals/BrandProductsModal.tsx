import React, { useState, useMemo } from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroTable } from "../../common/ui/HeroTable";
import { Product, Brand, Supplier } from "../../../types/db";
import { formatCurrency } from "../../../utils/formatters";
import { Tag, Package, Search, Building2, Boxes, DollarSign } from "lucide-react";

export interface BrandProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  supplier?: Supplier | null;
  products: Product[];
}

export const BrandProductsModal: React.FC<BrandProductsModalProps> = ({
  isOpen,
  onClose,
  brand,
  supplier,
  products,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const brandProducts = useMemo(() => {
    if (!brand) return [];
    return products.filter(
      (p) => !p.isDeleted && p.brand?.trim().toLowerCase() === brand.name.trim().toLowerCase()
    );
  }, [brand, products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return brandProducts;
    return brandProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [brandProducts, searchQuery]);

  // Metric summaries
  const totalUnits = useMemo(() => {
    return brandProducts.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0);
  }, [brandProducts]);

  const totalValuation = useMemo(() => {
    return brandProducts.reduce(
      (acc, p) => acc + (Number(p.stockQuantity) || 0) * (Number(p.costPrice) || 0),
      0
    );
  }, [brandProducts]);

  if (!isOpen || !brand) return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-6 sm:p-7 space-y-5 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">{brand.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase">
                  Brand Catalog
                </span>
              </div>
              <p className="text-[11px] text-default-500 font-medium flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3 w-3 text-default-400 inline" />
                <span>Vendor: <strong className="text-foreground">{supplier?.name || "Direct / Unlinked"}</strong></span>
                {brand.description && <span>• {brand.description}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Total Products
              </span>
              <div className="text-base font-black text-primary mt-0.5">
                {brandProducts.length} Items
              </div>
            </div>
          </div>

          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Stock in Inventory
              </span>
              <div className="text-base font-black text-emerald-500 mt-0.5">
                {totalUnits} Units
              </div>
            </div>
          </div>

          <div className="bg-content1 p-3.5 rounded-2xl border border-divider/20 shadow-2xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">
                Estimated Value
              </span>
              <div className="text-base font-black text-sky-500 mt-0.5">
                {formatCurrency(totalValuation)}
              </div>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or category..."
            className="w-full bg-content1 border border-divider/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <Search className="h-4 w-4 text-default-400 absolute left-3 top-2.5" />
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin border border-divider/20 rounded-2xl">
          <HeroTable isStriped className="min-w-full">
            <HeroTable.Header>
              <HeroTable.Column>Product & SKU</HeroTable.Column>
              <HeroTable.Column>Category</HeroTable.Column>
              <HeroTable.Column align="end">Stock On Hand</HeroTable.Column>
              <HeroTable.Column align="end">Cost Price</HeroTable.Column>
              <HeroTable.Column align="end">Selling Price</HeroTable.Column>
            </HeroTable.Header>
            <HeroTable.Body>
              {filteredProducts.length === 0 ? (
                <HeroTable.Row isHoverable={false}>
                  <HeroTable.Cell colSpan={5} className="p-8 text-center text-default-500 font-medium">
                    {brandProducts.length === 0
                      ? "No products currently linked to this brand in the inventory."
                      : "No products match your search query."}
                  </HeroTable.Cell>
                </HeroTable.Row>
              ) : (
                filteredProducts.map((p) => {
                  const stockQty = Number(p.stockQuantity) || 0;
                  const isLowStock = p.lowStockThreshold && stockQty <= p.lowStockThreshold;

                  return (
                    <HeroTable.Row key={p.id}>
                      <HeroTable.Cell>
                        <div>
                          <span className="font-bold text-xs text-foreground block">{p.productName}</span>
                          <span className="text-[10px] text-default-400 font-mono">SKU: {p.sku}</span>
                        </div>
                      </HeroTable.Cell>
                      <HeroTable.Cell>
                        <span className="px-2 py-0.5 rounded-lg bg-content2 text-default-600 font-semibold text-[10px]">
                          {p.category || "General"}
                        </span>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="end">
                        <span className={`font-mono font-bold text-xs ${isLowStock ? "text-danger" : "text-foreground"}`}>
                          {stockQty} {p.unit || "Pcs"}
                        </span>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="end">
                        <span className="font-mono text-default-500 text-xs">
                          {formatCurrency(p.costPrice || 0)}
                        </span>
                      </HeroTable.Cell>
                      <HeroTable.Cell align="end">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(p.sellingPrice || 0)}
                        </span>
                      </HeroTable.Cell>
                    </HeroTable.Row>
                  );
                })
              )}
            </HeroTable.Body>
          </HeroTable>
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
