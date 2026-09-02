import { Building2 } from 'lucide-react';
import React from 'react';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroInput } from '../common/ui/HeroInput';
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
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden font-sans">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Quick Add New Supplier
              </h3>
              <p className="text-[11px] text-default-500 font-medium">Register vendor profile on-the-fly</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <p className="text-xs text-default-500 font-medium leading-relaxed bg-zinc-100/90 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
            This will register a new vendor profile in the database on-the-fly and link it directly to this product, without reloading your catalog form.
          </p>

          <div className="space-y-3 pt-1">
            <HeroInput
              label="Supplier Company Name *"
              required
              value={quickSupName ?? ''}
              onValueChange={val => setQuickSupName(val)}
              placeholder="Supplier company name"
              radius="lg"
              variant="flat"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HeroInput
                label="Primary Contact Agent"
                value={quickSupContact ?? ''}
                onValueChange={val => setQuickSupContact(val)}
                placeholder="Contact agent name"
                radius="lg"
                variant="flat"
              />

              <HeroInput
                label="Contact Phone"
                type="tel"
                value={quickSupPhone ?? ''}
                onValueChange={val => setQuickSupPhone(val)}
                placeholder="Phone number"
                radius="lg"
                variant="flat"
              />
            </div>

            <HeroInput
              label="Corporate Email"
              type="email"
              value={quickSupEmail ?? ''}
              onValueChange={val => setQuickSupEmail(val)}
              placeholder="Corporate email address"
              radius="lg"
              variant="flat"
            />

            <HeroInput
              label="Office Address"
              value={quickSupAddress ?? ''}
              onValueChange={val => setQuickSupAddress(val)}
              placeholder="Street, City, Province"
              radius="lg"
              variant="flat"
            />
          </div>
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            radius="full"
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
            radius="full"
            className="font-bold text-xs shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Save Supplier
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
};

export default QuickSupplierModal;
