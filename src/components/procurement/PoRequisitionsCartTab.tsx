import React from "react";
import { Product, Supplier, Branch } from "../../types/db";
import { Trash2, Sparkles, Building2, Search, ShoppingCart } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { HeroButton } from "../common/ui/HeroButton";

export interface PoCartItem {
  productId: string;
  quantity: number;
  notes?: string;
  requestedByBranchId?: string;
}

export interface PoRequisitionsCartTabProps {
  poCart: PoCartItem[];
  syncPoCart: (cart: PoCartItem[]) => void;
  products: Product[];
  suppliers: Supplier[];
  branches: Branch[];
  procurementProductSearch: string;
  setProcurementProductSearch: (val: string) => void;
  showProcurementProductDropdown: boolean;
  setShowProcurementProductDropdown: (val: boolean) => void;
  onOpenCreateDraftPoWithSupplier?: (supplierId: string, items: any[]) => void;
  onOpenConsolidationModal: () => void;
}

export const PoRequisitionsCartTab: React.FC<PoRequisitionsCartTabProps> = ({
  poCart,
  syncPoCart,
  products,
  suppliers,
  branches,
  procurementProductSearch,
  setProcurementProductSearch,
  showProcurementProductDropdown,
  setShowProcurementProductDropdown,
  onOpenCreateDraftPoWithSupplier,
  onOpenConsolidationModal,
}) => {
  // Group cart items by supplier
  const supplierGroups: Record<string, PoCartItem[]> = {};
  poCart.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const supId = prod?.supplierId || "UNASSIGNED";
    if (!supplierGroups[supId]) {
      supplierGroups[supId] = [];
    }
    supplierGroups[supId].push(item);
  });

  const matchingProducts = products
    .filter((p) => !p.isDeleted)
    .filter((p) => {
      const q = procurementProductSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  const handleAddItemToCart = (prod: Product) => {
    const existingIdx = poCart.findIndex((c) => c.productId === prod.id);
    if (existingIdx >= 0) {
      const updated = [...poCart];
      updated[existingIdx].quantity += 20;
      syncPoCart(updated);
    } else {
      syncPoCart([...poCart, { productId: prod.id, quantity: 20 }]);
    }
    setProcurementProductSearch("");
    setShowProcurementProductDropdown(false);
  };

  const handleRemoveCartItem = (idx: number) => {
    const updated = poCart.filter((_, i) => i !== idx);
    syncPoCart(updated);
  };

  const handleUpdateQuantity = (idx: number, qty: number) => {
    const updated = [...poCart];
    updated[idx].quantity = Math.max(1, qty);
    syncPoCart(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Quick Search & Add Catalog Item */}
      <div className="bg-content1 p-4 sm:p-5 rounded-3xl border border-divider/25 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-primary">
              Floor & Inventory Restock Requisition Desk
            </h3>
            <p className="text-[10px] text-default-500 font-medium mt-0.5">
              Items staged from low-stock alerts or manual restock allocations. Grouped automatically by supplying vendor.
            </p>
          </div>
          {poCart.length > 0 && (
            <HeroButton
              size="sm"
              color="primary"
              radius="full"
              onClick={onOpenConsolidationModal}
              startIcon={<Sparkles className="h-3.5 w-3.5" />}
              className="font-black text-xs uppercase tracking-wider"
            >
              Generate Supplier POs ({Object.keys(supplierGroups).length})
            </HeroButton>
          )}
        </div>

        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={procurementProductSearch}
                onFocus={() => setShowProcurementProductDropdown(true)}
                onChange={(e) => {
                  setProcurementProductSearch(e.target.value);
                  setShowProcurementProductDropdown(true);
                }}
                placeholder="Type tile SKU, brand or description to quick-add restock item..."
                className="w-full bg-content2 border border-divider/40 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <Search className="h-4 w-4 text-default-400 absolute left-3 top-3" />
            </div>
            {poCart.length > 0 && (
              <button
                type="button"
                onClick={() => syncPoCart([])}
                className="px-3 py-2 bg-danger-50 dark:bg-danger-500/10 hover:bg-danger-100 text-danger text-xs font-bold rounded-2xl border border-danger-200 dark:border-danger-500/20 transition-colors cursor-pointer active:scale-[0.98]"
              >
                Clear Cart
              </button>
            )}
          </div>

          {showProcurementProductDropdown && procurementProductSearch.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-content1 border border-divider/40 rounded-2xl shadow-2xl z-40 overflow-hidden divide-y divide-divider/20 max-h-60 overflow-y-auto">
              {matchingProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-default-500 font-medium">
                  No matching products in catalog.
                </div>
              ) : (
                matchingProducts.map((p) => {
                  const supplier = suppliers.find((s) => s.id === p.supplierId);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddItemToCart(p)}
                      className="p-3 hover:bg-primary/10 cursor-pointer flex justify-between items-center transition-colors active:scale-[0.98]"
                    >
                      <div className="space-y-0.5 text-left">
                        <div className="font-bold text-xs text-foreground">{p.productName}</div>
                        <div className="text-[10px] text-default-500">
                          SKU: {p.sku} • Brand: {p.brand || "N/A"} • Vendor: {supplier?.name || "Unlinked"}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-xs text-primary">
                        {formatCurrency(p.costPrice || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart Items by Vendor Group */}
      {poCart.length === 0 ? (
        <div className="py-16 text-center bg-content1 rounded-3xl border border-dashed border-divider/40 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-content2 flex items-center justify-center text-default-400">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-foreground">Requisitions Cart Empty</h4>
            <p className="text-xs text-default-500 font-medium max-w-sm mx-auto">
              Add low-stock items from inventory alerts or search the catalog above to build multi-vendor PO batches.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(supplierGroups).map(([supId, items]) => {
            const supplier = suppliers.find((s) => s.id === supId);
            const groupTotal = items.reduce((sum, item) => {
              const prod = products.find((p) => p.id === item.productId);
              return sum + (prod?.costPrice || 0) * item.quantity;
            }, 0);

            return (
              <div key={supId} className="bg-content1 rounded-3xl border border-divider/30 overflow-hidden shadow-xs space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-foreground">
                        {supplier?.name || (supId === "UNASSIGNED" ? "Direct / Unassigned Vendor" : "Verified Supplier")}
                      </h4>
                      <p className="text-[10px] text-default-500 font-semibold">
                        {items.length} requisition line items • Estimated Cost: <strong className="text-primary font-mono">{formatCurrency(groupTotal)}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-divider/25 rounded-2xl overflow-hidden divide-y divide-divider/15">
                  <div className="grid grid-cols-12 gap-2 bg-content2 p-3 text-[9px] font-black text-default-500 uppercase tracking-wider">
                    <span className="col-span-5">Product Specification</span>
                    <span className="col-span-2 text-right">Unit Cost</span>
                    <span className="col-span-2 text-right">Quantity</span>
                    <span className="col-span-2 text-right">Subtotal</span>
                    <span className="col-span-1 text-right">Action</span>
                  </div>

                  {items.map((cartItem) => {
                    const globalIdx = poCart.findIndex((c) => c.productId === cartItem.productId);
                    const prod = products.find((p) => p.id === cartItem.productId);
                    const cost = prod?.costPrice || 0;
                    const subtotal = cost * cartItem.quantity;
                    const branch = branches.find((b) => b.id === cartItem.requestedByBranchId);

                    return (
                      <div key={cartItem.productId} className="grid grid-cols-12 gap-2 p-3 items-center text-xs">
                        <div className="col-span-5 space-y-0.5">
                          <div className="font-bold text-foreground">{prod?.productName || "Custom Sourced Item"}</div>
                          <div className="text-[10px] text-default-500 font-mono">
                            SKU: {prod?.sku || "N/A"} {branch ? `• Req: ${branch.name}` : ""}
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-mono text-default-500">
                          {formatCurrency(cost)}
                        </div>
                        <div className="col-span-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={cartItem.quantity}
                            onChange={(e) => handleUpdateQuantity(globalIdx, Number(e.target.value))}
                            className="w-20 bg-content2 border border-divider/40 rounded-xl px-2 py-1 text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2 text-right font-mono font-black text-foreground">
                          {formatCurrency(subtotal)}
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(globalIdx)}
                            className="p-1 rounded-lg text-default-400 hover:text-danger hover:bg-content2 transition-colors cursor-pointer active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
