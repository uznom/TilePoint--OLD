import { AlertTriangle,CheckCircle2,Info,ShieldAlert,X } from 'lucide-react';
import { AnimatePresence,motion } from 'motion/react';
import React from 'react';
import { createPortal } from 'react-dom';
import { HeroButton } from './common/ui/HeroButton';
import { HeroChip } from './common/ui/HeroChip';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  alertType?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  alertType = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getAlertStyle = () => {
    switch (alertType) {
      case 'danger':
        return {
          icon: <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0" />,
          chipVariant: 'danger' as const,
          btnVariant: 'danger' as const,
          border: 'border-rose-500/30',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />,
          chipVariant: 'warning' as const,
          btnVariant: 'primary' as const,
          border: 'border-amber-500/30',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />,
          chipVariant: 'success' as const,
          btnVariant: 'success' as const,
          border: 'border-emerald-500/30',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-6 w-6 text-sky-400 shrink-0" />,
          chipVariant: 'info' as const,
          btnVariant: 'primary' as const,
          border: 'border-sky-500/30',
        };
    }
  };

  const style = getAlertStyle();

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Full-Screen Uniform Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={!isSubmitting ? onCancel : undefined}
          className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-md bg-content1 border ${style.border} rounded-2xl p-6 shadow-2xl text-foreground font-sans overflow-hidden transition-all duration-300 z-10`}
        >
          {/* Top header & badge */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border border-divider/20 bg-content2/40">
                {style.icon}
              </div>
              <div className="space-y-1">
                <HeroChip variant={style.chipVariant} size="sm">
                  {alertType.toUpperCase()} ALERT
                </HeroChip>
                <h3 className="text-base font-extrabold text-foreground mt-1 leading-snug">
                  {title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-default-500 hover:text-foreground hover:bg-default-100 rounded-lg transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body message */}
          <div className="text-xs text-default-500 leading-relaxed my-3 font-normal">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Footer action buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-divider/30">
            <HeroButton
              type="button"
              variant="flat"
              size="md"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </HeroButton>
            <HeroButton
              type="button"
              variant={style.btnVariant}
              size="md"
              onClick={onConfirm}
              isLoading={isSubmitting}
              loadingText="Processing..."
            >
              {confirmText}
            </HeroButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;
