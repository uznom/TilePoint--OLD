import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { Branch, Product, Supplier } from "../../../types/db";
import { FileText, X, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

export interface DraftPoItem {
  productId: string;
  productName: string;
  sku: string;
  costPrice: number;
  quantity: number;
}

export interface PoTemplateItem {
  id: string;
  name: string;
  supplierId: string;
  branchId: string;
  items: DraftPoItem[];
  notes?: string;
}

export interface CreateEditPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  selectedSupplierId: string;
  setSelectedSupplierId: (val: string) => void;
  selectedBranchId: string;
  setSelectedBranchId: (val: string) => void;
  draftItems: DraftPoItem[];
  setDraftItems: React.Dispatch<React.SetStateAction<DraftPoItem[]>>;
  poNotes: string;
  setPoNotes: (val: string) => void;
  poTemplates: PoTemplateItem[];
  setPoTemplates: React.Dispatch<React.SetStateAction<PoTemplateItem[]>>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  triggerConfirmation: (title: string, msg: string, onConfirm: () => void, isDangerous?: boolean, confirmText?: string, cancelText?: string) => void;
  isRowClearingBlocked: () => boolean;
  getRowClearingBlockedReason: () => string;
  onOpenQuickProductModal: () => void;
  onSavePo: () => void;
  isSubmittingPo: boolean;
}

export const CreateEditPoModal: React.FC<CreateEditPoModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  branches,
  products,
  selectedSupplierId,
  setSelectedSupplierId,
  selectedBranchId,
  setSelectedBranchId,
  draftItems,
  setDraftItems,
  poNotes,
  setPoNotes,
  poTemplates,
  setPoTemplates,
  showToast,
  triggerConfirmation,
  isRowClearingBlocked,
  getRowClearingBlockedReason,
  onOpenQuickProductModal,
  onSavePo,
  isSubmittingPo,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  const [productSearch, setProductSearch] = React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [itemQuantity, setItemQuantity] = React.useState<number>(10);
  const [itemCost, setItemCost] = React.useState<number>(0);

  const filteredProducts = products.filter((p) => {
    if (selectedSupplierId && p.supplierId && p.supplierId !== selectedSupplierId) {
      return false;
    }
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const handleAddItem = () => {
    if (!selectedProductId) {
      showToast("Please choose a product to add.", "error");
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIdx = draftItems.findIndex((item) => item.productId === prod.id);
    if (existingIdx >= 0) {
      const updated = [...draftItems];
      updated[existingIdx].quantity += itemQuantity;
      if (itemCost > 0) updated[existingIdx].costPrice = itemCost;
      setDraftItems(updated);
    } else {
      setDraftItems([
        ...draftItems,
        {
          productId: prod.id,
          productName: prod.productName,
          sku: prod.sku,
          costPrice: itemCost > 0 ? itemCost : prod.costPrice || 0,
          quantity: itemQuantity,
        },
      ]);
    }
    setSelectedProductId("");
    setProductSearch("");
    setItemQuantity(10);
    setItemCost(0);
  };

  const grandTotal = draftItems.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="4xl" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Purchase Requisition Builder</h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider mt-0.5">
                Compile & Dispatch Purchase Order to Vendor
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
          {/* Supplier & Destination Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Vendor Supplier <span className="text-danger">*</span>
              </label>
              <select
                value={selectedSupplierId ?? ''}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Choose Vendor --</option>
                {suppliers.filter((s) => !s.isDeleted).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Destination Warehouse / Branch <span className="text-danger">*</span>
              </label>
              <select
                value={selectedBranchId ?? ''}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Select Receiving Site --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.address || "Main Site"})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Item Row */}
          <div className="bg-content2/50 border border-divider/30 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                Add Sourced Catalog Item
              </span>
              <button
                type="button"
                onClick={onOpenQuickProductModal}
                className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
              >
                + Register New SKU
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-6">
                <select
                  value={selectedProductId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    const prod = products.find((p) => p.id === id);
                    if (prod) setItemCost(prod.costPrice || 0);
                  }}
                  className="w-full bg-content1 border border-divider/40 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Choose Catalog Product --</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku}) - {formatCurrency(p.costPrice || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemCost || ""}
                  onChange={(e) => setItemCost(Number(e.target.value))}
                  placeholder="Cost Price"
                  className="w-full bg-content1 border border-divider/40 rounded-xl px-3 py-2 text-xs font-bold font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                  placeholder="Qty"
                  className="w-full bg-content1 border border-divider/40 rounded-xl px-3 py-2 text-xs font-bold font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full h-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center font-black cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Draft Items List */}
          <div className="space-y-2">
            <div className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Requisition Line Items ({draftItems.length})
            </div>

            {draftItems.length === 0 ? (
              <div className="p-8 text-center bg-content2/30 rounded-2xl border border-dashed border-divider/30 text-default-500 text-xs font-medium">
                No items added yet. Select a product above or load a saved PO template.
              </div>
            ) : (
              <div className="border border-divider/30 rounded-2xl overflow-hidden divide-y divide-divider/20">
                <div className="grid grid-cols-12 gap-2 bg-content2 p-3 text-[9px] font-black text-default-500 uppercase tracking-wider">
                  <span className="col-span-6">Product</span>
                  <span className="col-span-2 text-right">Unit Cost</span>
                  <span className="col-span-2 text-right">Quantity</span>
                  <span className="col-span-2 text-right">Subtotal</span>
                </div>

                {draftItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center text-xs">
                    <div className="col-span-6 space-y-0.5">
                      <div className="font-bold text-foreground">{item.productName}</div>
                      <div className="text-[10px] text-default-500 font-mono">SKU: {item.sku}</div>
                    </div>
                    <div className="col-span-2 text-right font-mono text-default-500">
                      {formatCurrency(item.costPrice)}
                    </div>
                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...draftItems];
                          updated[idx].quantity = Math.max(1, Number(e.target.value));
                          setDraftItems(updated);
                        }}
                        className="w-16 bg-content2 border border-divider/40 rounded-lg px-2 py-0.5 text-right font-mono font-bold text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono font-black text-primary flex items-center justify-end gap-2">
                      <span>{formatCurrency(item.costPrice * item.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}
                        className="p-1 rounded text-default-400 hover:text-danger cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Purchase Order Remarks / Special Terms
            </label>
            <textarea
              rows={2}
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="e.g. Free freight on orders over 100 boxes, deliver by Friday..."
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-divider/20 pt-4 shrink-0">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-default-500 uppercase tracking-wider block">Estimated PO Total</span>
            <div className="text-lg font-black text-primary font-mono">{formatCurrency(grandTotal)}</div>
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
              disabled={isSubmittingPo || draftItems.length === 0}
              onClick={onSavePo}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPo ? "Creating PO..." : "Issue Purchase Order"}
            </button>
          </div>
        </div>
    </HeroModal>
  );
};
