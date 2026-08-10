import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { Branch, Product, BranchStock } from '../../types/db';

interface BulkDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  branches: Branch[];
  branchStock: BranchStock[];
  selectedProducts: Product[];
  bulkDamageBranchId: string;
  setBulkDamageBranchId: (val: string) => void;
  bulkDamageCategory: string;
  setBulkDamageCategory: (val: string) => void;
  bulkDamageAction: string;
  setBulkDamageAction: (val: string) => void;
  bulkDamageNotes: string;
  setBulkDamageNotes: (val: string) => void;
  bulkDamageQuantities: Record<string, number>;
  setBulkDamageQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const BulkDamageModal: React.FC<BulkDamageModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  branches,
  branchStock,
  selectedProducts,
  bulkDamageBranchId,
  setBulkDamageBranchId,
  bulkDamageCategory,
  setBulkDamageCategory,
  bulkDamageAction,
  setBulkDamageAction,
  bulkDamageNotes,
  setBulkDamageNotes,
  bulkDamageQuantities,
  setBulkDamageQuantities,
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
        className="relative w-full max-w-2xl rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4 max-h-[90vh] overflow-y-auto animate-scale-up"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
          <h3 className="text-sm font-black text-rose-500 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
            <span>Register Bulk Damages & Log Breakages</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/15 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Config Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Reporting Branch</label>
            <select
              required
              value={bulkDamageBranchId}
              onChange={e => setBulkDamageBranchId(e.target.value)}
              className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans cursor-pointer"
            >
              {branches.filter(b => !b.isDeleted).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Damage Category</label>
            <select
              value={bulkDamageCategory}
              onChange={e => setBulkDamageCategory(e.target.value)}
              className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans cursor-pointer"
            >
              <option value="Warehouse Breakage">Warehouse Drop / Forklift Clash</option>
              <option value="BOA">BOA (Broken On Arrival from Supplier)</option>
              <option value="Showroom Casualty">Showroom Display Chipped</option>
              <option value="Delivery Transit">Transport Transit Fractures</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Action / Treatment Taken</label>
            <select
              value={bulkDamageAction}
              onChange={e => setBulkDamageAction(e.target.value)}
              className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary p-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans cursor-pointer"
            >
              <option value="Disposed / Scrapped">Shattered - Disposed & Scrapped</option>
              <option value="Saved for Mosaic">Saved for Low-Cost Mosaic Sales</option>
              <option value="Claimed from Supplier / Insurance Code">Pending Supplier Cargo Claim / BOA Reimbursement</option>
              <option value="Returned for Credit">Returned to Supplier Warehouse for Credit Note</option>
            </select>
          </div>
        </div>

        {/* Selected Products Quantities list */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Damaged Quantities per Tile Code</label>
          <div className="bg-m3-surface-lowest border border-m3-outline-variant/15 rounded-2xl max-h-[240px] overflow-y-auto divide-y divide-m3-outline-variant/10 scrollbar-thin">
            {selectedProducts.map((pItem) => {
              const branchStockVal = branchStock.find(bs => bs.productId === pItem.id && bs.branchId === bulkDamageBranchId)?.quantity ?? 0;
              return (
                <div key={pItem.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold truncate text-m3-on-surface">{pItem.productName}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      SKU: {pItem.sku} • Stock in Branch: <span className="font-bold text-m3-primary">{branchStockVal} boxes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Damaged Boxes:</span>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      required
                      value={bulkDamageQuantities[pItem.id] ?? 1}
                      onChange={e => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setBulkDamageQuantities(prev => ({
                          ...prev,
                          [pItem.id]: val
                        }));
                      }}
                      className="w-16 bg-m3-surface-low border border-m3-outline-variant/30 rounded-lg text-center p-1 font-mono font-bold text-xs focus:border-m3-primary focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident description */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">Incident Description & Audit Remarks</label>
          <textarea
            required
            rows={2}
            value={bulkDamageNotes}
            onChange={e => setBulkDamageNotes(e.target.value)}
            placeholder="Describe the incident causing the stock breakages or suppliers delivery issue..."
            className="w-full bg-m3-surface-lowest border border-m3-outline-variant/20 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-xl font-sans"
          />
        </div>

        {/* Submit / Cancel Actions */}
        <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider px-5 py-2.5 rounded-full text-xs shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Register Bulk Damages</span>
          </button>
        </div>
      </form>
    </div>
  );
});

BulkDamageModal.displayName = 'BulkDamageModal';
