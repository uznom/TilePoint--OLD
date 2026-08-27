import React from 'react';
import { createPortal } from 'react-dom';
import { Sliders, X, Plus, Trash2 } from 'lucide-react';
import { HeroButton } from '../common/ui/HeroButton';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  adjustProductName: string;
  adjustType: 'ADD' | 'SUB';
  setAdjustType: (type: 'ADD' | 'SUB') => void;
  adjustVal: number;
  setAdjustVal: (val: number) => void;
  adjustReason: string;
  setAdjustReason: (reason: string) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  adjustProductName,
  adjustType,
  setAdjustType,
  adjustVal,
  setAdjustVal,
  adjustReason,
  setAdjustReason,
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
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4"
      >
        <div className="flex justify-between items-center border-b border-divider pb-3">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Manual Stock Correction</span>
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

        <div>
          <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider block mb-0.5 select-none">Adjusting Product</span>
          <strong className="text-xs text-foreground font-extrabold max-w-[300px] truncate block">{adjustProductName}</strong>
        </div>

        {/* Adjust Type segment */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest pl-0.5 block select-none">Adjustment Type</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustType('ADD')}
              className={`py-2 px-3.5 rounded-medium border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all cursor-pointer ${
                adjustType === 'ADD' 
                  ? 'bg-success/15 border-success text-success font-extrabold shadow-sm' 
                  : 'bg-content2 border-divider text-default-600 hover:bg-default-100'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Receive Quantity (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('SUB')}
              className={`py-2 px-3.5 rounded-medium border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all cursor-pointer ${
                adjustType === 'SUB' 
                  ? 'bg-danger/15 border-danger text-danger font-extrabold shadow-sm' 
                  : 'bg-content2 border-divider text-default-600 hover:bg-default-100'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span>Deduct Quantity (-)</span>
            </button>
          </div>
        </div>

        {/* Adjust Value input */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
          <input
            type="number"
            required
            min={1}
            value={adjustVal || ''}
            onChange={e => setAdjustVal(Math.max(1, Number(e.target.value)))}
            className="w-full bg-content2 border border-divider focus:border-primary px-3 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-medium font-bold"
          />
        </div>

        {/* Adjust Reason log detail */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">Adjustment Reason / Notes</label>
          <textarea
            required
            rows={3}
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
            placeholder="Adjustment reason / notes"
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
            Execute Stock Correction
          </HeroButton>
        </div>
      </form>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
});

StockAdjustmentModal.displayName = 'StockAdjustmentModal';
