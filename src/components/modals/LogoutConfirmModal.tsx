import React from "react";
import { Power } from "lucide-react";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";

export interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      zIndex={99999}
    >
      <HeroModal.Header className="pb-3 border-b border-divider/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-danger/10 text-danger shrink-0 border border-danger/20">
            <Power className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Confirm Sign Out</h3>
            <p className="text-[10px] text-default-500 font-bold uppercase tracking-wider">Session Termination Guard</p>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4">
        <p className="text-xs text-default-500 font-medium leading-relaxed">
          Are you sure you want to log out of TilePoint terminal? Any unsaved active checkout carts will be lost.
        </p>
      </HeroModal.Body>

      <HeroModal.Footer className="justify-end gap-2.5 pt-3 pb-4 border-t border-divider/20">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          radius="full"
          onClick={onClose}
          className="font-bold text-xs"
        >
          No, Keep Active
        </HeroButton>
        <HeroButton
          type="button"
          variant="solid"
          color="danger"
          size="sm"
          radius="full"
          onClick={() => {
            onClose();
            onConfirm();
          }}
          className="font-bold text-xs shadow-[0_2px_8px_rgba(243,18,96,0.25)]"
        >
          Yes, Sign Out
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};
