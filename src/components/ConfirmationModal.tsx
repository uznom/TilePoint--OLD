import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import React from 'react';
import { HeroButton } from './common/ui/HeroButton';
import { HeroChip } from './common/ui/HeroChip';
import { HeroModal } from './common/ui/HeroModal';

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
  const getAlertStyle = () => {
    switch (alertType) {
      case 'danger':
        return {
          icon: <ShieldAlert className="h-5 w-5 text-danger shrink-0" />,
          chipVariant: 'danger' as const,
          btnVariant: 'danger' as const,
          border: 'border-danger/30',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
          chipVariant: 'warning' as const,
          btnVariant: 'primary' as const,
          border: 'border-warning/30',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
          chipVariant: 'success' as const,
          btnVariant: 'success' as const,
          border: 'border-success/30',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-5 w-5 text-primary shrink-0" />,
          chipVariant: 'info' as const,
          btnVariant: 'primary' as const,
          border: 'border-primary/30',
        };
    }
  };

  const style = getAlertStyle();

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      isDismissable={!isSubmitting}
      className={`border ${style.border}`}
      zIndex={9999}
    >
      <HeroModal.Header className="pb-3">
        <div className="flex items-center gap-3 w-full">
          <div className="p-2.5 rounded-2xl border border-divider/30 bg-content2/60 shrink-0">
            {style.icon}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <HeroChip variant={style.chipVariant} size="sm">
              {alertType.toUpperCase()} ALERT
            </HeroChip>
            <h3 className="text-sm sm:text-base font-extrabold text-foreground leading-snug truncate">
              {title}
            </h3>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4">
        <div className="text-xs text-default-500 leading-relaxed font-normal">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="pt-3 pb-4">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="font-semibold"
        >
          {cancelText}
        </HeroButton>
        <HeroButton
          type="button"
          variant={style.btnVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={isSubmitting}
          loadingText="Processing..."
          className="font-bold uppercase tracking-wider"
        >
          {confirmText}
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default ConfirmationModal;
