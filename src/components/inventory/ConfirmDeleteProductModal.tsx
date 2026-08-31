import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { HeroButton } from '../common/ui/HeroButton';
import { HeroModal } from '../common/ui/HeroModal';
import { HoldToConfirmButton } from '../HoldToConfirmButton';

interface ConfirmDeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  isBlocked: boolean;
  blockedReason?: string;
  onConfirm: () => void;
}

export const ConfirmDeleteProductModal: React.FC<ConfirmDeleteProductModalProps> = ({
  isOpen,
  onClose,
  productName,
  isBlocked,
  blockedReason,
  onConfirm,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <HeroModal.Header className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-danger/10 text-danger shrink-0 border border-danger/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wide">
              Archive Product Safe-listing
            </h3>
            <p className="text-[10.5px] text-default-500 font-medium">Inventory catalog adjustment</p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4 space-y-3 text-left">
        {isBlocked ? (
          <div className="bg-warning/15 border border-warning/30 p-3.5 rounded-2xl text-left space-y-1">
            <span className="text-[10px] font-black uppercase text-warning tracking-wider block">Archiving Blocked</span>
            <p className="text-[11px] text-default-500 leading-normal font-sans">
              Row-clearing and product archiving are disabled because the register has: <strong className="text-warning font-black">{blockedReason}</strong>.
            </p>
          </div>
        ) : (
          <p className="text-xs text-default-500 leading-relaxed font-normal">
            Confirm soft-deletion of <strong className="text-foreground font-black">{productName}</strong>? All warehouse catalog configurations and stats metrics will adjust.
          </p>
        )}
      </HeroModal.Body>

      <HeroModal.Footer className="justify-end items-center gap-2 pt-3 pb-4">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Cancel
        </HeroButton>
        {!isBlocked && (
          <div className="w-48">
            <HoldToConfirmButton
              onConfirm={onConfirm}
              variant="rose"
            >
              Hold 3s to Archive
            </HoldToConfirmButton>
          </div>
        )}
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default ConfirmDeleteProductModal;
