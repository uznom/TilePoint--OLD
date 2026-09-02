import React from "react";
import { HeroModal } from "../../common/ui/HeroModal";
import { Building2, X } from "lucide-react";

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
    <HeroModal isOpen={isOpen} onClose={onClose} size="md" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      <div className="flex items-center justify-between border-b border-divider/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                {isEditingSupplier ? "Modify Vendor Profile" : "Register Verified Vendor"}
              </h3>
              <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">
                Authorized Supplier & Supply Chain Credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {supplierError && (
          <div className="p-3 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger text-xs font-bold rounded-xl">
            {supplierError}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Supplier Enterprise Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={supplierName ?? ''}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Apex Tile Corp, Prime Global Builders"
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Contact Person <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={supplierContact ?? ''}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="Key Account Representative"
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
                Direct Phone / Viber
              </label>
              <input
                type="text"
                value={supplierPhone ?? ''}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="e.g. +63 917 000 0000"
                className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Billing & Invoicing Email
            </label>
            <input
              type="email"
              value={supplierEmail ?? ''}
              onChange={(e) => setSupplierEmail(e.target.value)}
              placeholder="billing@supplierdomain.com"
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-default-500 uppercase tracking-wider pl-1">
              Warehouse / Plant Physical Address
            </label>
            <textarea
              rows={2}
              value={supplierAddress ?? ''}
              onChange={(e) => setSupplierAddress(e.target.value)}
              placeholder="Warehouse / Factory / Depot location..."
              className="w-full bg-content2 border border-divider/40 rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-divider/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-content2 hover:bg-content3 border border-divider/30 text-xs font-bold text-foreground rounded-full transition-colors cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer active:scale-95"
            >
              {isEditingSupplier ? "Update Vendor Profile" : "Register Vendor"}
            </button>
          </div>
        </form>
    </HeroModal>
  );
};
