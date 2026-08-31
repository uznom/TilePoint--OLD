import { Building2 } from 'lucide-react';
import React from 'react';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';

interface QuickSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  quickSupName: string;
  setQuickSupName: (v: string) => void;
  quickSupContact: string;
  setQuickSupContact: (v: string) => void;
  quickSupPhone: string;
  setQuickSupPhone: (v: string) => void;
  quickSupEmail: string;
  setQuickSupEmail: (v: string) => void;
  quickSupAddress: string;
  setQuickSupAddress: (v: string) => void;
}

export const QuickSupplierModal: React.FC<QuickSupplierModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  quickSupName,
  setQuickSupName,
  quickSupContact,
  setQuickSupContact,
  quickSupPhone,
  setQuickSupPhone,
  quickSupEmail,
  setQuickSupEmail,
  quickSupAddress,
  setQuickSupAddress,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      zIndex={60}
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                Quick Add New Supplier
              </h3>
              <p className="text-[10.5px] text-default-500 font-medium">Register vendor profile on-the-fly</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <p className="text-xs text-default-500 font-medium leading-normal bg-content2/50 p-3 rounded-2xl border border-divider/30">
            This will register a new vendor profile in the database on-the-fly and link it directly to this product, without reloading your catalog form.
          </p>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">
                Supplier Company Name *
              </label>
              <input
                type="text"
                required
                value={quickSupName ?? ''}
                onChange={e => setQuickSupName(e.target.value)}
                placeholder="Supplier company name"
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">
                  Primary Contact Agent
                </label>
                <input
                  type="text"
                  value={quickSupContact ?? ''}
                  onChange={e => setQuickSupContact(e.target.value)}
                  placeholder="Contact agent name"
                  className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={quickSupPhone ?? ''}
                  onChange={e => setQuickSupPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">
                Corporate Email
              </label>
              <input
                type="email"
                value={quickSupEmail ?? ''}
                onChange={e => setQuickSupEmail(e.target.value)}
                placeholder="Corporate email address"
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">
                Office Address
              </label>
              <input
                type="text"
                value={quickSupAddress ?? ''}
                onChange={e => setQuickSupAddress(e.target.value)}
                placeholder="Street, City, Province"
                className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-medium"
              />
            </div>
          </div>
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            className="font-bold text-xs uppercase tracking-wider"
          >
            Save Supplier
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
};

export default QuickSupplierModal;
