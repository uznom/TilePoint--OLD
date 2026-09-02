import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroSelect } from "../../common/ui/HeroSelect";
import { HeroButton } from "../../common/ui/HeroButton";
import { Supplier } from "../../../types/db";
import { Tag, X } from "lucide-react";

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
    <HeroModal isOpen={isOpen} onClose={onClose} size="md" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                {isEditingBrand ? "Modify Brand Specification" : "Register Verified Brand"}
              </h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">
                Product Line & Manufacturer Association
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

        {brandError && (
          <div className="p-3 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger text-xs font-bold rounded-xl">
            {brandError}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Brand / Manufacturer Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={brandName ?? ''}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Mariwasa, EuroTiles, Guocera"
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Product Category / Specifications Notes
            </label>
            <textarea
              rows={2}
              value={brandDescription ?? ''}
              onChange={(e) => setBrandDescription(e.target.value)}
              placeholder="e.g. Specialized in vitrified porcelain and rustic bathroom tiles..."
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
            <HeroButton
              variant="flat"
              color="default"
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
              className="font-black uppercase tracking-wider shadow-lg"
            >
              {isEditingBrand ? "Save Brand Details" : "Register Brand"}
            </HeroButton>
          </div>
        </form>
    </HeroModal>
  );
};
