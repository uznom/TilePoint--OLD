import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { HeroButton } from '../common/ui/HeroButton';
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
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-sm rounded-large border border-divider p-6 z-20 shadow-2xl bg-content1 text-foreground text-center space-y-4">
        <div className="text-left space-y-2">
          <h3 className="text-base font-black text-primary uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="text-danger h-5 w-5" /> 
            <span>Archive Product safe-listing?</span>
          </h3>
          {isBlocked ? (
            <div className="bg-warning/15 border border-warning/30 p-3 rounded-medium text-left space-y-1 mt-2">
              <span className="text-[10px] font-black uppercase text-warning tracking-wider block">Archiving Blocked</span>
              <p className="text-[10.5px] text-default-500 leading-normal font-sans">
                Row-clearing and product archiving are disabled because the register has: <strong className="text-warning font-black">{blockedReason}</strong>.
              </p>
            </div>
          ) : (
            <p className="text-xs text-default-500 leading-relaxed">
              Confirm soft-deletion of <strong className="text-foreground font-black">{productName}</strong>? All warehouse catalog configurations and stats metrics will adjust.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <div className="flex justify-end items-center gap-2">
            <HeroButton
              type="button"
              variant="flat"
              size="sm"
              onClick={onClose}
              className="font-bold text-xs uppercase tracking-wider"
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
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
