import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroTextarea } from "../../common/ui/HeroTextarea";
import { Branch, Product, Supplier } from "../../../types/db";
import { FileText, Plus, Trash2 } from "lucide-react";
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
  poTemplates: _poTemplates,
  setPoTemplates: _setPoTemplates,
  showToast,
  triggerConfirmation: _triggerConfirmation,
  isRowClearingBlocked: _isRowClearingBlocked,
  getRowClearingBlockedReason: _getRowClearingBlockedReason,
  onOpenQuickProductModal,
  onSavePo,
  isSubmittingPo,
}) => {
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
    <HeroModal isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Purchase Requisition Builder</h3>
              <p className="text-[11px] text-default-500 font-medium">
                Compile &amp; dispatch purchase order to vendor
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {/* Supplier & Destination Select */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <HeroSelect
                label="Vendor Supplier"
                isRequired
                value={selectedSupplierId ?? ''}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                placeholder="-- Choose Vendor --"
              >
                <option value="">-- Choose Vendor --</option>
                {suppliers.filter((s) => !s.isDeleted).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </HeroSelect>
            </div>

            <div className="space-y-1.5">
              <HeroSelect
                label="Destination Warehouse / Branch"
                isRequired
                value={selectedBranchId ?? ''}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                placeholder="-- Select Receiving Site --"
              >
                <option value="">-- Select Receiving Site --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.address || "Main Site"})</option>
                ))}
              </HeroSelect>
            </div>
          </div>

          {/* Add Item Row */}
          <div className="bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Add Sourced Catalog Item
              </span>
              <button
                type="button"
                onClick={onOpenQuickProductModal}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                + Register New SKU
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-6">
                <HeroSelect
                  value={selectedProductId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    const prod = products.find((p) => p.id === id);
                    if (prod) setItemCost(prod.costPrice || 0);
                  }}
                  placeholder="-- Choose Catalog Product --"
                  size="sm"
                >
                  <option value="">-- Choose Catalog Product --</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku}) - {formatCurrency(p.costPrice || 0)}
                    </option>
                  ))}
                </HeroSelect>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <HeroInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemCost ? String(itemCost) : ""}
                  onValueChange={(val) => setItemCost(Number(val) || 0)}
                  placeholder="Cost Price"
                  radius="lg"
                  variant="flat"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <HeroInput
                  type="number"
                  min="1"
                  value={String(itemQuantity)}
                  onValueChange={(val) => setItemQuantity(Math.max(1, Number(val) || 1))}
                  placeholder="Qty"
                  radius="lg"
                  variant="flat"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                <HeroButton
                  isIconOnly
                  size="md"
                  variant="solid"
                  color="primary"
                  radius="lg"
                  onClick={handleAddItem}
                  className="shadow-2xs"
                >
                  <Plus className="h-4 w-4" />
                </HeroButton>
              </div>
            </div>
          </div>

          {/* Draft Items List */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-1">
              Requisition Line Items ({draftItems.length})
            </div>

            {draftItems.length === 0 ? (
              <div className="p-8 text-center bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200/60 dark:border-white/5 text-default-500 text-xs font-medium">
                No items added yet. Select a product above or load a saved PO template.
              </div>
            ) : (
              <div className="border border-zinc-200/60 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-divider/20 shadow-2xs">
                <div className="grid grid-cols-12 gap-2 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 text-[10px] font-bold text-default-500 uppercase tracking-wider">
                  <span className="col-span-6">Product</span>
                  <span className="col-span-2 text-right">Unit Cost</span>
                  <span className="col-span-2 text-right">Quantity</span>
                  <span className="col-span-2 text-right">Subtotal</span>
                </div>

                {draftItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
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
                        className="w-16 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-white/5 rounded-xl px-2 py-1 text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-primary flex items-center justify-end gap-2">
                      <span>{formatCurrency(item.costPrice * item.quantity)}</span>
                      <button
                        type="button"
                        onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))}
                        className="p-1 rounded-lg text-default-400 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <HeroTextarea
            label="Purchase Order Remarks / Special Terms"
            rows={2}
            value={poNotes}
            onValueChange={(val) => setPoNotes(val)}
            placeholder="e.g. Free freight on orders over 100 boxes, deliver by Friday..."
            radius="lg"
            variant="flat"
          />
        </div>

        <div className="flex items-center justify-between border-t border-divider/20 pt-4 shrink-0">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider block">Estimated PO Total</span>
            <div className="text-lg font-bold text-primary font-mono">{formatCurrency(grandTotal)}</div>
          </div>

          <div className="flex gap-2.5">
            <HeroButton
              variant="flat"
              size="sm"
              radius="full"
              onClick={onClose}
            >
              Cancel
            </HeroButton>
            <HeroButton
              variant="solid"
              color="primary"
              size="sm"
              radius="full"
              isDisabled={isSubmittingPo || draftItems.length === 0}
              isLoading={isSubmittingPo}
              loadingText="Creating PO..."
              onClick={onSavePo}
              className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Issue Purchase Order
            </HeroButton>
          </div>
        </div>
      </div>
    </HeroModal>
  );
};
