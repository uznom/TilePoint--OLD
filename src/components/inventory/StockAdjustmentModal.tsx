import React from 'react';
import { Sliders, X, Plus, Trash2 } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm shadow-xl" 
        onClick={onClose} 
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] border border-m3-outline-variant/30 p-6 z-20 shadow-2xl bg-m3-surface-low text-m3-on-surface text-left space-y-4"
      >
        <div className="flex justify-between items-center border-b border-m3-outline-variant/15 pb-3">
          <h3 className="text-sm font-black text-m3-primary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            <span>Manual Stock Correction</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer p-1 rounded-full hover:bg-m3-outline-variant/15 transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div>
          <span className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wider block mb-0.5 select-none">Adjusting Product</span>
          <strong className="text-xs text-m3-on-surface font-extrabold max-w-[300px] truncate block">{adjustProductName}</strong>
        </div>

        {/* Adjust Type segment */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-0.5 block select-none">Adjustment Type</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustType('ADD')}
              className={`py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all cursor-pointer ${
                adjustType === 'ADD' 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-extrabold shadow-sm' 
                  : 'bg-m3-surface-lowest border-m3-outline-variant/35 text-m3-on-surface-variant'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Receive Quantity (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('SUB')}
              className={`py-2 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 mt-1 transition-all cursor-pointer ${
                adjustType === 'SUB' 
                  ? 'bg-rose-500/15 border-rose-500 text-rose-500 font-extrabold shadow-sm' 
                  : 'bg-m3-surface-lowest border-m3-outline-variant/35 text-m3-on-surface-variant'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span>Deduct Quantity (-)</span>
            </button>
          </div>
        </div>

        {/* Adjust Value input */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Quantity Delta count</label>
          <input
            type="number"
            required
            min={1}
            value={adjustVal || ''}
            onChange={e => setAdjustVal(Math.max(1, Number(e.target.value)))}
            className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-mono font-bold"
          />
        </div>

        {/* Adjust Reason log detail */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-black text-m3-primary uppercase tracking-widest pl-1 select-none">Adjustment Reason / Notes</label>
          <textarea
            required
            rows={3}
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
            placeholder="Adjustment reason / notes"
            className="w-full bg-m3-surface-lowest border-b-2 border-m3-outline-variant/50 focus:border-m3-primary px-3 py-2 text-xs text-m3-on-surface focus:outline-none transition-colors rounded-t-md font-sans italic"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-m3-outline-variant/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-full hover:bg-m3-outline-variant/15 text-m3-on-surface-variant transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="m3-btn-primary px-5 py-2.5 text-xs shadow-md border cursor-pointer"
          >
            Execute Stock Correction
          </button>
        </div>
      </form>
    </div>
  );
});

StockAdjustmentModal.displayName = 'StockAdjustmentModal';
