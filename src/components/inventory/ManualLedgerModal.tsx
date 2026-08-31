import React from 'react';
import { createPortal } from 'react-dom';
import { Sliders, X } from 'lucide-react';
import { Branch, Product, User } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroSelect } from '../common/ui/HeroSelect';

interface ManualLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  products: Product[];
  branches: Branch[];
  currentUser: User | null;
  manualLedgerProductId: string;
  setManualLedgerProductId: (val: string) => void;
  manualLedgerBranchId: string;
  setManualLedgerBranchId: (val: string) => void;
  manualLedgerType: 'ADJUST' | 'IN' | 'OUT' | 'PURCHASE' | 'SALE' | 'TRANSFER';
  setManualLedgerType: (val: 'ADJUST' | 'IN' | 'OUT' | 'PURCHASE' | 'SALE' | 'TRANSFER') => void;
  manualLedgerQty: number;
  setManualLedgerQty: (val: number) => void;
  manualLedgerRefNo: string;
  setManualLedgerRefNo: (val: string) => void;
  manualLedgerRemarks: string;
  setManualLedgerRemarks: (val: string) => void;
}

export const ManualLedgerModal: React.FC<ManualLedgerModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  products,
  branches,
  currentUser,
  manualLedgerProductId,
  setManualLedgerProductId,
  manualLedgerBranchId,
  setManualLedgerBranchId,
  manualLedgerType,
  setManualLedgerType,
  manualLedgerQty,
  setManualLedgerQty,
  manualLedgerRefNo,
  setManualLedgerRefNo,
  manualLedgerRemarks,
  setManualLedgerRemarks,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4"
      >
        <div className="flex justify-between items-center border-b border-divider pb-3">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Insert Manual Stock Ledger Entry</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-default-400 hover:text-foreground cursor-pointer p-1 rounded-medium hover:bg-default-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="text-xs text-default-500 font-medium">
          Create a custom movement to adjust both physical multi-branch inventory tracking registers and cumulative catalog quantities instantly.
        </p>

        {/* Product selection dropdown */}
        <HeroSelect
          label="Select Catalogue Tile"
          isRequired
          placeholder="-- Choose a product --"
          value={manualLedgerProductId}
          onValueChange={(val) => setManualLedgerProductId(val)}
          radius="md"
          items={products.map(p => ({
            key: p.id,
            value: p.id,
            label: `${p.productName} (${p.sku || p.id.slice(-6)}) - Stock: ${p.stockQuantity}`
          }))}
        />

        {/* Grid for parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            {currentUser?.role === 'Admin' ? (
              <HeroSelect
                label="Impacted Yard / Branch"
                isRequired
                value={manualLedgerBranchId}
                onValueChange={(val) => setManualLedgerBranchId(val)}
                radius="md"
                items={branches.map(b => ({
                  key: b.id,
                  value: b.id,
                  label: getBranchOptionLabel(b)
                }))}
              />
            ) : (
              <div>
                <label className="text-xs font-semibold text-foreground select-none block mb-1">Impacted Yard / Branch</label>
                <div className="w-full bg-default-100 border border-divider px-3 py-2 text-xs rounded-xl font-bold text-default-400">
                  {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <HeroSelect
              label="Movement Ledger Type"
              isRequired
              value={manualLedgerType}
              onValueChange={(val) => setManualLedgerType(val as any)}
              radius="md"
              items={[
                { key: 'ADJUST', label: 'ADJUST (Signed variance +/-)' },
                { key: 'IN', label: 'IN (Receive to stock +)' },
                { key: 'OUT', label: 'OUT (Issue out / breakages -)' },
                { key: 'PURCHASE', label: 'PURCHASE (Direct replenishment +)' },
                { key: 'SALE', label: 'SALE (Floor sale issue out -)' },
                { key: 'TRANSFER', label: 'TRANSFER (Signed Inter-branch +/-)' },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
            <input
              type="number"
              required
              min={1}
              value={manualLedgerQty || ''}
              onChange={e => setManualLedgerQty(Math.max(1, Number(e.target.value)))}
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
            />
            <span className="text-[9px] text-default-400 italic block pt-0.5 pl-1">
              Note: IN/PURCHASE adds. OUT/SALE subtracts automatically.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Reference Code / Ticket ID</label>
            <input
              type="text"
              required
              placeholder="Reference Code / Ticket ID"
              value={manualLedgerRefNo}
              onChange={e => setManualLedgerRefNo(e.target.value)}
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Audit Sign-off Remarks</label>
          <textarea
            required
            rows={3}
            placeholder="Describe why this entry is being manually added..."
            value={manualLedgerRemarks}
            onChange={e => setManualLedgerRemarks(e.target.value)}
            className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans italic"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="light"
            size="sm"
            className="font-bold text-default-600"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            className="font-bold"
          >
            Apply Ledger Movement
          </HeroButton>
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
});

ManualLedgerModal.displayName = 'ManualLedgerModal';
