import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { HeroButton } from "../../common/ui/HeroButton";
import { HeroInput } from "../../common/ui/HeroInput";
import { HeroTextarea } from "../../common/ui/HeroTextarea";
import { Building2 } from "lucide-react";

export interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingSupplier: boolean;
  supplierName: string;
  setSupplierName: (val: string) => void;
  supplierContact: string;
  setSupplierContact: (val: string) => void;
  supplierEmail: string;
  setSupplierEmail: (val: string) => void;
  supplierPhone: string;
  setSupplierPhone: (val: string) => void;
  supplierAddress: string;
  setSupplierAddress: (val: string) => void;
  supplierError: string;
  onSave: (e: React.FormEvent) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  isEditingSupplier,
  supplierName,
  setSupplierName,
  supplierContact,
  setSupplierContact,
  supplierEmail,
  setSupplierEmail,
  supplierPhone,
  setSupplierPhone,
  supplierAddress,
  setSupplierAddress,
  supplierError,
  onSave,
}) => {
  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 sm:p-7 space-y-5 text-left font-sans text-xs">
        <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {isEditingSupplier ? "Modify Vendor Profile" : "Register Verified Vendor"}
              </h3>
              <p className="text-[11px] text-default-500 font-medium">
                Authorized supplier & supply chain credentials
              </p>
            </div>
          </div>
        </div>

        {supplierError && (
          <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-bold rounded-xl">
            {supplierError}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <HeroInput
            label="Supplier Enterprise Name"
            required
            value={supplierName ?? ''}
            onValueChange={(val) => setSupplierName(val)}
            placeholder="e.g. Apex Tile Corp, Prime Global Builders"
            radius="lg"
            variant="flat"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <HeroInput
              label="Contact Person"
              required
              value={supplierContact ?? ''}
              onValueChange={(val) => setSupplierContact(val)}
              placeholder="Key Account Representative"
              radius="lg"
              variant="flat"
            />
            <HeroInput
              label="Direct Phone / Viber"
              value={supplierPhone ?? ''}
              onValueChange={(val) => setSupplierPhone(val)}
              placeholder="e.g. +63 917 000 0000"
              radius="lg"
              variant="flat"
            />
          </div>

          <HeroInput
            label="Billing & Invoicing Email"
            type="email"
            value={supplierEmail ?? ''}
            onValueChange={(val) => setSupplierEmail(val)}
            placeholder="billing@supplierdomain.com"
            radius="lg"
            variant="flat"
          />

          <HeroTextarea
            label="Warehouse / Plant Physical Address"
            rows={2}
            value={supplierAddress ?? ''}
            onValueChange={(val) => setSupplierAddress(val)}
            placeholder="Warehouse / Factory / Depot location..."
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
              {isEditingSupplier ? "Save Vendor Details" : "Register Vendor"}
            </HeroButton>
          </div>
        </form>
      </div>
    </HeroModal>
  );
};
