import { Plus, Sliders, Trash2 } from 'lucide-react';
import React from 'react';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';

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
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                Manual Stock Correction
              </h3>
              <p className="text-[10.5px] text-default-500 font-medium">Inventory delta ledger adjustment</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <div className="p-3 bg-content2/50 rounded-2xl border border-divider/30">
            <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider block mb-0.5 select-none">
              Adjusting Product
            </span>
            <strong className="text-xs text-foreground font-extrabold truncate block">
              {adjustProductName}
            </strong>
          </div>

          {/* Adjust Type segment */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest pl-0.5 block select-none">
              Adjustment Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              <HeroButton
                type="button"
                onClick={() => setAdjustType('ADD')}
                variant={adjustType === 'ADD' ? 'solid' : 'flat'}
                color={adjustType === 'ADD' ? 'success' : 'default'}
                className="w-full font-bold text-xs h-10"
                startIcon={<Plus className="h-4 w-4 shrink-0" />}
              >
                Receive Quantity (+)
              </HeroButton>
              <HeroButton
                type="button"
                onClick={() => setAdjustType('SUB')}
                variant={adjustType === 'SUB' ? 'solid' : 'flat'}
                color={adjustType === 'SUB' ? 'danger' : 'default'}
                className="w-full font-bold text-xs h-10"
                startIcon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
              >
                Deduct Quantity (-)
              </HeroButton>
            </div>
          </div>

          {/* Adjust Value input */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">
              Quantity Delta count
            </label>
            <input
              type="number"
              required
              min={1}
              value={adjustVal || ''}
              onChange={e => setAdjustVal(Math.max(1, Number(e.target.value)))}
              className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-bold font-mono"
            />
          </div>

          {/* Adjust Reason log detail */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1 select-none">
              Adjustment Reason / Notes
            </label>
            <textarea
              required
              rows={3}
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="Enter audit rationale and physical count confirmation details..."
              className="w-full bg-background border border-divider/50 focus:border-primary px-3.5 py-2 text-xs text-foreground focus:outline-none transition-colors rounded-xl font-sans"
            />
          </div>
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            className="font-bold text-xs"
          >
            Cancel
          </HeroButton>
          <HeroButton
            type="submit"
            color="primary"
            variant="solid"
            size="sm"
            className="font-bold uppercase tracking-wider"
          >
            Execute Stock Correction
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
});

StockAdjustmentModal.displayName = 'StockAdjustmentModal';

export default StockAdjustmentModal;
