import React from "react";
import { createPortal } from "react-dom";
import { Brand, Supplier } from "../../../types/db";
import { Package, X } from "lucide-react";

export interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickProductName: string;
  setQuickProductName: (val: string) => void;
  quickProductSku: string;
  setQuickProductSku: (val: string) => void;
  quickProductBarcode: string;
  setQuickProductBarcode: (val: string) => void;
  quickProductBrand: string;
  setQuickProductBrand: (val: string) => void;
  quickProductCategory: string;
  setQuickProductCategory: (val: string) => void;
  quickProductCost: number | "";
  setQuickProductCost: (val: number | "") => void;
  quickProductPrice: number | "";
  setQuickProductPrice: (val: number | "") => void;
  quickProductSupplierId: string;
  setQuickProductSupplierId: (val: string) => void;
  brands: Brand[];
  suppliers: Supplier[];
  onSave: (e: React.FormEvent) => void;
  onGenerateBarcode: () => void;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  isOpen,
  onClose,
  quickProductName,
  setQuickProductName,
  quickProductSku,
  setQuickProductSku,
  quickProductBarcode,
  setQuickProductBarcode,
  quickProductBrand,
  setQuickProductBrand,
  quickProductCategory,
  setQuickProductCategory,
  quickProductCost,
  setQuickProductCost,
  quickProductPrice,
  setQuickProductPrice,
  quickProductSupplierId,
  setQuickProductSupplierId,
  brands,
  suppliers,
  onSave,
  onGenerateBarcode,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-content1 border border-divider/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 text-left space-y-6">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Catalog Quick-Registration</h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">
                Create & Map New Sourced Tile SKU
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

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Product Description / Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={quickProductName ?? ''}
              onChange={(e) => setQuickProductName(e.target.value)}
              placeholder="e.g. 60x60 Carrara White Glazed Porcelain"
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Stock Keeping Unit (SKU) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={quickProductSku ?? ''}
                onChange={(e) => setQuickProductSku(e.target.value)}
                placeholder="CW-6060-GLZ"
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1">
                <label className="text-[10px] font-black text-default-500 uppercase tracking-wider">
                  Barcode (EAN-13)
                </label>
                <button
                  type="button"
                  onClick={onGenerateBarcode}
                  className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Generate EAN-13
                </button>
              </div>
              <input
                type="text"
                value={quickProductBarcode ?? ''}
                onChange={(e) => setQuickProductBarcode(e.target.value)}
                placeholder="Auto-generated or scanner..."
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Cost Price (PHP) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={quickProductCost}
                onChange={(e) => setQuickProductCost(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="250.00"
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Selling Price (PHP) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={quickProductPrice}
                onChange={(e) => setQuickProductPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="380.00"
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Brand Line
              </label>
              <select
                value={quickProductBrand ?? ''}
                onChange={(e) => setQuickProductBrand(e.target.value)}
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Generic / None --</option>
                {brands.filter((b) => !b.isDeleted).map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Supplying Vendor
              </label>
              <select
                value={quickProductSupplierId ?? ''}
                onChange={(e) => setQuickProductSupplierId(e.target.value)}
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">-- Unassigned --</option>
                {suppliers.filter((s) => !s.isDeleted).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-content2 hover:bg-content3 border border-divider/30 text-xs font-bold text-foreground rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer"
            >
              Register & Add to Draft PO
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
