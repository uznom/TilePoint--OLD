import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroTextarea } from "../../common/ui/HeroTextarea";
import { Supplier } from "../../../types/db";
import { Tag } from "lucide-react";

export interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingBrand: boolean;
  brandName: string;
  setBrandName: (val: string) => void;
  brandSupplierId: string;
  setBrandSupplierId: (val: string) => void;
  brandDescription: string;
  setBrandDescription: (val: string) => void;
  brandError: string;
  suppliers: Supplier[];
  onSave: (e: React.FormEvent) => void;
}

export const BrandModal: React.FC<BrandModalProps> = ({
  isOpen,
  onClose,
  isEditingBrand,
  brandName,
  setBrandName,
  brandSupplierId,
  setBrandSupplierId,
  brandDescription,
  setBrandDescription,
  brandError,
  suppliers,
  onSave,
}) => {
  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 sm:p-7 space-y-5 text-left font-sans text-xs">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {isEditingBrand ? "Modify Brand Specification" : "Register Verified Brand"}
              </h3>
              <p className="text-[11px] text-default-500 font-medium">
                Product line & manufacturer association
              </p>
            </div>
          </div>
        </div>

        {brandError && (
          <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-bold rounded-xl">
            {brandError}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <HeroInput
            label="Brand / Manufacturer Name"
            required
            value={brandName ?? ''}
            onValueChange={(val) => setBrandName(val)}
            placeholder="e.g. Mariwasa, EuroTiles, Guocera"
            radius="lg"
            variant="flat"
          />

          <div className="space-y-1.5">
            <HeroSelect
              label="Associated Supplier Vendor"
              isRequired
              value={brandSupplierId ?? ''}
              onChange={(e) => setBrandSupplierId(e.target.value)}
              placeholder="-- Choose Supplying Vendor --"
            >
              <option value="">-- Choose Supplying Vendor --</option>
              {suppliers
                .filter((s) => !s.isDeleted)
                .map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
            </HeroSelect>
          </div>

          <HeroTextarea
            label="Product Category / Specifications Notes"
            rows={2}
            value={brandDescription ?? ''}
            onValueChange={(val) => setBrandDescription(val)}
            placeholder="e.g. Specialized in vitrified porcelain and rustic bathroom tiles..."
            radius="lg"
            variant="flat"
          />

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
              {isEditingBrand ? "Save Brand Details" : "Register Brand"}
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
