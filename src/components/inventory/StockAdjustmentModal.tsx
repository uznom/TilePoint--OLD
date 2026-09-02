import { Plus, Sliders, Trash2 } from 'lucide-react';
import React from 'react';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroInput } from '../common/ui/HeroInput';
import { HeroTextarea } from '../common/ui/HeroTextarea';
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
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden font-sans">
        <HeroModal.Header className="pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Manual Stock Correction
              </h3>
              <p className="text-[11px] text-default-500 font-medium">Inventory delta ledger adjustment</p>
            </div>
          </div>
        </HeroModal.Header>

        <HeroModal.Body className="py-4 space-y-4 text-left">
          <div className="p-3.5 bg-zinc-100/90 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-white/5 shadow-2xs">
            <span className="text-[10px] text-default-500 font-bold uppercase tracking-wider block mb-0.5 select-none">
              Adjusting Product
            </span>
            <strong className="text-xs text-foreground font-bold truncate block">
              {adjustProductName}
            </strong>
          </div>

          {/* Adjust Type segment */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-default-500 uppercase tracking-wider pl-0.5 block select-none">
              Adjustment Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              <HeroButton
                type="button"
                onClick={() => setAdjustType('ADD')}
                variant={adjustType === 'ADD' ? 'solid' : 'flat'}
                color={adjustType === 'ADD' ? 'success' : 'default'}
                radius="xl"
                className="w-full font-bold text-xs h-10 shadow-2xs"
                startIcon={<Plus className="h-4 w-4 shrink-0" />}
              >
                Receive Quantity (+)
              </HeroButton>
              <HeroButton
                type="button"
                onClick={() => setAdjustType('SUB')}
                variant={adjustType === 'SUB' ? 'solid' : 'flat'}
                color={adjustType === 'SUB' ? 'danger' : 'default'}
                radius="xl"
                className="w-full font-bold text-xs h-10 shadow-2xs"
                startIcon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
              >
                Deduct Quantity (-)
              </HeroButton>
            </div>
          </div>

          {/* Adjust Value input */}
          <HeroInput
            label="Quantity Delta Count"
            type="number"
            required
            min={1}
            value={adjustVal ? String(adjustVal) : ''}
            onValueChange={val => setAdjustVal(Math.max(1, Number(val) || 0))}
            radius="lg"
            variant="flat"
          />

          {/* Adjust Reason log detail */}
          <HeroTextarea
            label="Adjustment Reason / Notes"
            required
            rows={3}
            value={adjustReason}
            onValueChange={val => setAdjustReason(val)}
            placeholder="Enter audit rationale and physical count confirmation details..."
            radius="lg"
            variant="flat"
          />
        </HeroModal.Body>

        <HeroModal.Footer className="justify-end gap-2 pt-3 pb-4">
          <HeroButton
            type="button"
            onClick={onClose}
            variant="flat"
            size="sm"
            radius="full"
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
            className="font-bold shadow-[0_2px_8px_rgba(0,111,238,0.25)]"
          >
            Execute Stock Correction
          </HeroButton>
        </HeroModal.Footer>
      </form>
    </HeroModal>
  );
});
