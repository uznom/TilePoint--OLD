import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroAutocomplete, HeroAutocompleteItem } from "../../common/ui/HeroAutocomplete";
import { Brand, Supplier } from "../../../types/db";
import { Package } from "lucide-react";

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
  const brandItems: HeroAutocompleteItem[] = React.useMemo(() => {
    return [
      { key: "Generic", label: "Generic / Unbranded", description: "Standard unbranded SKU" },
      ...brands.map((b) => ({
        key: b.name,
        label: b.name,
        description: b.description || "Registered catalog brand",
        textValue: `${b.name} ${b.description || ""}`,
      })),
    ];
  }, [brands]);

  const supplierItems: HeroAutocompleteItem[] = React.useMemo(() => {
    return suppliers
      .filter((s) => !s.isDeleted)
      .map((s) => ({
        key: s.id,
        label: s.name,
        description: [s.contactPerson, s.phone].filter(Boolean).join(" • ") || s.address || undefined,
        textValue: `${s.name} ${s.contactPerson || ""} ${s.phone || ""} ${s.email || ""}`,
      }));
  }, [suppliers]);

  const handleBrandChange = (key: string | number | null) => {
    const val = key ? String(key) : "";
    setQuickProductBrand(val);
    const matchedBrand = brands.find((b) => b.name.toLowerCase() === val.toLowerCase());
    if (matchedBrand && matchedBrand.supplierId) {
      setQuickProductSupplierId(matchedBrand.supplierId);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6 sm:p-7 space-y-6 text-left font-sans text-xs">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Catalog Quick-Registration</h3>
              <p className="text-[11px] text-default-500 font-medium">
                Create &amp; map new sourced tile SKU
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <HeroInput
            label="Product Description / Name"
            required
            value={quickProductName ?? ''}
            onValueChange={(val) => setQuickProductName(val)}
            placeholder="e.g. 60x60 Carrara White Glazed Porcelain"
            radius="lg"
            variant="flat"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HeroInput
              label="Stock Keeping Unit (SKU)"
              required
              value={quickProductSku ?? ''}
              onValueChange={(val) => setQuickProductSku(val)}
              placeholder="CW-6060-GLZ"
              radius="lg"
              variant="flat"
            />
            <HeroInput
              label="Barcode (EAN-13)"
              value={quickProductBarcode ?? ''}
              onValueChange={(val) => setQuickProductBarcode(val)}
              placeholder="Auto-generated or scanner..."
              radius="lg"
              variant="flat"
              endContent={
                <button
                  type="button"
                  onClick={onGenerateBarcode}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Generate EAN-13
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HeroInput
              label="Cost Price (PHP)"
              type="number"
              required
              min="0"
              step="0.01"
              value={quickProductCost === "" ? "" : String(quickProductCost)}
              onValueChange={(val) => setQuickProductCost(val === "" ? "" : Number(val))}
              placeholder="0.00"
              radius="lg"
              variant="flat"
            />
            <HeroInput
              label="Suggested Selling Price (PHP)"
              type="number"
              required
              min="0"
              step="0.01"
              value={quickProductPrice === "" ? "" : String(quickProductPrice)}
              onValueChange={(val) => setQuickProductPrice(val === "" ? "" : Number(val))}
              placeholder="0.00"
              radius="lg"
              variant="flat"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <HeroAutocomplete
                label="Product Brand"
                placeholder="Search or pick brand..."
                items={brandItems}
                selectedKey={quickProductBrand || null}
                onSelectionChange={handleBrandChange}
                radius="lg"
                variant="flat"
              />
            </div>
            <div className="space-y-1.5">
              <HeroSelect
                label="Category"
                value={quickProductCategory ?? ''}
                onChange={(e) => setQuickProductCategory(e.target.value)}
              >
                <option value="Tiles">Floor &amp; Wall Tiles</option>
                <option value="Adhesives">Adhesives &amp; Grouts</option>
                <option value="Sanitary">Sanitary Ware</option>
                <option value="Accessories">Trims &amp; Accessories</option>
              </HeroSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <HeroAutocomplete
              label="Primary Supplier Vendor"
              isRequired
              placeholder="Search or select supplying vendor..."
              items={supplierItems}
              selectedKey={quickProductSupplierId || null}
              onSelectionChange={(key) => setQuickProductSupplierId(key ? String(key) : "")}
              radius="lg"
              variant="flat"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
            <HeroButton
              variant="flat"
              size="sm"
              radius="full"
              onClick={onClose}
            >
              Cancel
            </HeroButton>
            <HeroButton
              type="submit"
              variant="solid"
              color="primary"
              size="sm"
              radius="full"
              className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
            >
              Register &amp; Add to PO
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
