import React from 'react';
import { Sliders, X } from 'lucide-react';
import { Branch, Product, User } from '../../types/db';

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

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
      >
        <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
          <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            <span>Insert Manual Stock Ledger Entry</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full border-0 bg-transparent hover:bg-m3-outline-variant/15 transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="text-xs text-m3-on-surface-variant font-medium">
          Create a custom movement to adjust both physical multi-branch inventory tracking registers and cumulative catalog quantities instantly.
        </p>

        {/* Product selection dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Select Catalogue Tile</label>
          <select
            required
            value={manualLedgerProductId}
            onChange={e => setManualLedgerProductId(e.target.value)}
            className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans cursor-pointer"
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
            <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Impacted Yard / Branch</label>
            {currentUser?.role === 'Admin' ? (
              <select
                required
                value={manualLedgerBranchId}
                onChange={e => setManualLedgerBranchId(e.target.value)}
                className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-m3-surface-lowest/60 border border-m3-outline-variant/30 px-3 py-2 text-xs rounded-xl font-bold font-mono text-zinc-400">
                {branches.find(b => b.id === (currentUser?.branchAssignmentId || 'B1'))?.name || 'N/A'}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Movement Ledger Type</label>
            <select
              required
              value={manualLedgerType}
              onChange={e => setManualLedgerType(e.target.value as any)}
              className="w-full bg-m3-surface-lowest border border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface rounded-xl focus:outline-none transition-colors font-sans font-bold cursor-pointer"
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
            <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
            <input
              type="number"
              required
              min={1}
              value={manualLedgerQty || ''}
              onChange={e => setManualLedgerQty(Math.max(1, Number(e.target.value)))}
              className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-mono font-bold"
            />
            <span className="text-[9px] text-zinc-400 font-mono italic block pt-0.5 pl-1">
              Note: IN/PURCHASE adds. OUT/SALE subtracts automatically.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Reference Code / Ticket ID</label>
            <input
              type="text"
              required
              placeholder="Reference Code / Ticket ID"
              value={manualLedgerRefNo}
              onChange={e => setManualLedgerRefNo(e.target.value)}
              className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-mono font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Audit Sign-off Remarks</label>
          <textarea
            required
            rows={3}
            placeholder="Describe why this entry is being manually added..."
            value={manualLedgerRemarks}
            onChange={e => setManualLedgerRemarks(e.target.value)}
            className="w-full bg-m3-surface-lowest border border-m3-outline-variant/35 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-sans italic"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors border-0 bg-transparent cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border cursor-pointer font-black uppercase tracking-wider"
          >
            Apply Ledger Movement
          </button>
        </div>
      </form>
    </div>
  );
});

ManualLedgerModal.displayName = 'ManualLedgerModal';
