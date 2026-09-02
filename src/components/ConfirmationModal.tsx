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
          icon: <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />,
          chipColor: 'danger' as const,
          btnColor: 'danger' as const,
          btnVariant: 'solid' as const,
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
          chipColor: 'warning' as const,
          btnColor: 'warning' as const,
          btnVariant: 'solid' as const,
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
          chipColor: 'success' as const,
          btnColor: 'success' as const,
          btnVariant: 'solid' as const,
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-5 w-5 text-primary shrink-0" />,
          chipColor: 'primary' as const,
          btnColor: 'primary' as const,
          btnVariant: 'solid' as const,
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
      zIndex={9999}
    >
      <HeroModal.Header className="pb-3">
        <div className="flex items-center gap-3 w-full font-sans">
          <div className="p-2.5 rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 shrink-0 shadow-2xs">
            {style.icon}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <HeroChip color={style.chipColor} variant="flat" size="sm" className="font-bold text-[9px] uppercase tracking-wider font-mono">
              {alertType.toUpperCase()} Alert
            </HeroChip>
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate tracking-tight">
              {title}
            </h3>
          </div>
        </div>
      </HeroModal.Header>

      <HeroModal.Body className="py-4 font-sans text-xs">
        <div className="text-xs text-default-500 leading-relaxed font-medium">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      </HeroModal.Body>

      <HeroModal.Footer className="pt-3 pb-4 font-sans">
        <HeroButton
          type="button"
          variant="flat"
          size="sm"
          radius="full"
          onClick={onCancel}
          disabled={isSubmitting}
          className="font-bold text-xs"
        >
          {cancelText}
        </HeroButton>
        <HeroButton
          type="button"
          color={style.btnColor}
          variant={style.btnVariant}
          size="sm"
          radius="full"
          onClick={onConfirm}
          isLoading={isSubmitting}
          loadingText="Processing..."
          className="font-bold text-xs uppercase tracking-wider shadow-2xs"
        >
          {confirmText}
        </HeroButton>
      </HeroModal.Footer>
    </HeroModal>
  );
};

export default ConfirmationModal;
