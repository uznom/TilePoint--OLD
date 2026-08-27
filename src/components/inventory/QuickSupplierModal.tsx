import React from 'react';
import { createPortal } from 'react-dom';
import { Building2, X } from 'lucide-react';
import { HeroButton } from '../common/ui/HeroButton';

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
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-50 shadow-2xl bg-content1 text-foreground text-left space-y-4 font-sans"
      >
        <div className="flex justify-between items-center border-b border-divider pb-3">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <span>Quick Add New Supplier</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1.5 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="text-xs text-default-500 font-medium leading-normal bg-content2 p-3 rounded-medium border border-divider">
          This will register a new vendor profile in the database on-the-fly and link it directly to this product, without reloading your catalog form.
        </p>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">Supplier Company Name *</label>
            <input
              type="text"
              required
              value={quickSupName ?? ''}
              onChange={e => setQuickSupName(e.target.value)}
              placeholder="Supplier company name"
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">Primary Contact Agent</label>
              <input
                type="text"
                value={quickSupContact ?? ''}
                onChange={e => setQuickSupContact(e.target.value)}
                placeholder="Contact agent name"
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">Contact Phone</label>
              <input
                type="text"
                value={quickSupPhone ?? ''}
                onChange={e => setQuickSupPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">Corporate Email</label>
            <input
              type="email"
              value={quickSupEmail ?? ''}
              onChange={e => setQuickSupEmail(e.target.value)}
              placeholder="Corporate email address"
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5">Office Address</label>
            <input
              type="text"
              value={quickSupAddress ?? ''}
              onChange={e => setQuickSupAddress(e.target.value)}
              placeholder="Street, City, Province"
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <HeroButton
            type="button"
            variant="flat"
            size="sm"
            onClick={onClose}
            className="font-bold text-xs uppercase tracking-wider"
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
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
