import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Check } from 'lucide-react';
import { Branch, Product, BranchStock } from '../../types/db';
import { getBranchOptionLabel } from '../../lib/branchUtils';
import { HeroButton } from '../common/ui/HeroButton';

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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-2xl rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4 max-h-[90vh] overflow-y-auto animate-scale-up"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-divider pb-3">
          <h3 className="text-sm font-black text-danger uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <span>Register Bulk Damages & Log Breakages</span>
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

        {/* Config Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">Reporting Branch</label>
            <select
              required
              value={bulkDamageBranchId}
              onChange={e => setBulkDamageBranchId(e.target.value)}
              className="w-full bg-content2 border border-divider focus:border-primary p-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans cursor-pointer"
            >
              {branches.filter(b => !b.isDeleted).map(b => (
                <option key={b.id} value={b.id}>{getBranchOptionLabel(b)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">Damage Category</label>
            <select
              value={bulkDamageCategory}
              onChange={e => setBulkDamageCategory(e.target.value)}
              className="w-full bg-content2 border border-divider focus:border-primary p-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans cursor-pointer"
            >
              <option value="Warehouse Breakage">Warehouse Drop / Forklift Clash</option>
              <option value="BOA">BOA (Broken On Arrival from Supplier)</option>
              <option value="Showroom Casualty">Showroom Display Chipped</option>
              <option value="Delivery Transit">Transport Transit Fractures</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">Action / Treatment Taken</label>
            <select
              value={bulkDamageAction}
              onChange={e => setBulkDamageAction(e.target.value)}
              className="w-full bg-content2 border border-divider focus:border-primary p-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans cursor-pointer"
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
          <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">Damaged Quantities per Tile Code</label>
          <div className="bg-content2 border border-divider rounded-medium max-h-[240px] overflow-y-auto divide-y divide-divider scrollbar-thin">
            {selectedProducts.map((pItem) => {
              const branchStockVal = branchStock.find(bs => bs.productId === pItem.id && bs.branchId === bulkDamageBranchId)?.quantity ?? 0;
              return (
                <div key={pItem.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold truncate text-foreground">{pItem.productName}</div>
                    <div className="text-[10px] text-default-500 mt-0.5">
                      SKU: {pItem.sku} • Stock in Branch: <span className="font-bold text-primary">{branchStockVal} boxes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-default-500 uppercase">Damaged Boxes:</span>
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
                      className="w-16 bg-content1 border border-divider rounded-medium text-center p-1 font-bold text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident description */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-primary uppercase tracking-widest pl-1 block">Incident Description & Audit Remarks</label>
          <textarea
            required
            rows={2}
            value={bulkDamageNotes}
            onChange={e => setBulkDamageNotes(e.target.value)}
            placeholder="Describe the incident causing the stock breakages or suppliers delivery issue..."
            className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-sans"
          />
        </div>

        {/* Submit / Cancel Actions */}
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
            color="danger"
            variant="solid"
            size="sm"
            className="font-black uppercase tracking-wider"
            startIcon={<Check className="h-4 w-4" />}
          >
            Register Bulk Damages
          </HeroButton>
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
});

BulkDamageModal.displayName = 'BulkDamageModal';
