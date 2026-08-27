import React from 'react';
import { createPortal } from 'react-dom';
import { Sliders, X } from 'lucide-react';
import { Branch, Product, User } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';

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
        <div className="space-y-1">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Select Catalogue Tile</label>
          <select
            required
            value={manualLedgerProductId}
            onChange={e => setManualLedgerProductId(e.target.value)}
            className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground rounded-medium focus:outline-none transition-colors font-sans cursor-pointer"
          >
            <option value="" disabled>-- Choose a product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.productName} ({p.sku || p.id.slice(-6)}) - Current Qty: {p.stockQuantity}
              </option>
            ))}
          </select>
        </div>

        {/* Grid for parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Impacted Yard / Branch</label>
            {currentUser?.role === 'Admin' ? (
              <select
                required
                value={manualLedgerBranchId}
                onChange={e => setManualLedgerBranchId(e.target.value)}
                className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground rounded-medium focus:outline-none transition-colors font-sans cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{getBranchOptionLabel(b)}</option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-content2/60 border border-divider px-3 py-2 text-xs rounded-medium font-bold text-default-400">
                {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Movement Ledger Type</label>
            <select
              required
              value={manualLedgerType}
              onChange={e => setManualLedgerType(e.target.value as any)}
              className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground rounded-medium focus:outline-none transition-colors font-sans font-bold cursor-pointer"
            >
              <option value="ADJUST">ADJUST (Signed variance +/-)</option>
              <option value="IN">IN (Receive to stock +)</option>
              <option value="OUT">OUT (Issue out / breakages -)</option>
              <option value="PURCHASE">PURCHASE (Direct replenishment +)</option>
              <option value="SALE">SALE (Floor sale issue out -)</option>
              <option value="TRANSFER">TRANSFER (Signed Inter-branch +/-)</option>
            </select>
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
