import React from "react";
import { AlertTriangle } from "lucide-react";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";

export interface UnsavedCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLeave: () => void;
}

export const UnsavedCartModal: React.FC<UnsavedCartModalProps> = ({
  isOpen,
  onClose,
  onConfirmLeave,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      zIndex={60}
    >
      <HeroModal.Header className="pb-3 border-b border-divider/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-warning/10 text-warning shrink-0 border border-warning/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Unsaved Checkout Warning</h3>
            <p className="text-[10px] text-warning font-bold uppercase tracking-wider">Active Transaction Guard</p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4 space-y-2">
        <p className="text-xs text-default-500 font-medium leading-relaxed">
          Are you sure you want to leave this site? Changes you made may not be saved.
        </p>
        <p className="text-xs text-default-500 font-medium leading-relaxed">
          Leaving the ERP OS terminal now will disrupt the current active customer checkout session and clear the basket.
        </p>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/20">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          onClick={onClose}
          className="font-bold text-xs"
        >
          Cancel, Keep Basket
        </HeroButton>
        <HeroButton
          type="button"
          variant="solid"
          color="warning"
          size="sm"
          onClick={() => {
            onClose();
            onConfirmLeave();
          }}
          className="font-black text-xs uppercase tracking-wider text-black"
        >
          Yes, Leave Mode
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};
