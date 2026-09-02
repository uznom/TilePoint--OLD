import React from "react";
import { AlertTriangle } from "lucide-react";
import { HeroModal } from "../common/ui/HeroModal";
import { HeroButton } from "../common/ui/HeroButton";

export interface SessionSupersededModalProps {
  sessionNotice: string | null;
  onClearNotice: () => void;
}

export const SessionSupersededModal: React.FC<SessionSupersededModalProps> = ({
  sessionNotice,
  onClearNotice,
}) => {
  return (
    <HeroModal
      isOpen={Boolean(sessionNotice)}
      onClose={onClearNotice}
      size="sm"
      zIndex={999999}
      className="border border-danger/30 text-center"
    >
      <HeroModal.Body className="p-6 space-y-4 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-danger/15 border border-danger/30 flex items-center justify-center text-danger">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-foreground">Single Active Terminal Security Alert</h3>
          <p className="text-xs text-default-600 leading-relaxed font-medium text-left bg-content2/60 p-3.5 rounded-2xl border border-divider/25">
            {sessionNotice}
          </p>
        </div>
        <div className="pt-2">
          <HeroButton
            type="button"
            color="primary"
            variant="solid"
            size="md"
            onClick={onClearNotice}
            className="w-full font-bold text-xs"
          >
            Acknowledge & Sign In
          </HeroButton>
        </div>
      </HeroModal.Body>
    </HeroModal>
  );
};
