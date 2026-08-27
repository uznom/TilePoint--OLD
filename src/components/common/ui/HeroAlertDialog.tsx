import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { HeroButton } from './HeroButton';

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
  isDestructive?: boolean;
  isLoading?: boolean;
  className?: string;
  id?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  color = 'danger',
  isDestructive = true,
  isLoading = false,
  className = '',
  id,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const effectiveColor = isDestructive ? 'danger' : color;

  const getIcon = () => {
    switch (effectiveColor) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'secondary':
        return <Info className="w-6 h-6 text-secondary" />;
      case 'danger':
        return <AlertCircle className="w-6 h-6 text-danger" />;
      default:
        return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full max-w-md bg-content1 rounded-2xl shadow-2xl border border-divider/40 overflow-hidden z-10 p-6 flex flex-col gap-4 ${className}`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-2.5 rounded-full bg-default-100 dark:bg-default-50/10">
                {getIcon()}
              </div>

              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-1 text-xs sm:text-sm text-default-500 leading-relaxed">
                    {description}
                  </p>
                )}
                {children && <div className="mt-2 text-xs sm:text-sm">{children}</div>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2 pt-2">
              <HeroButton
                variant="flat"
                color="default"
                size="sm"
                onClick={onClose}
                isDisabled={isLoading}
              >
                {cancelText}
              </HeroButton>
              {onConfirm && (
                <HeroButton
                  variant="solid"
                  color={effectiveColor}
                  size="sm"
                  onClick={onConfirm}
                  isLoading={isLoading}
                >
                  {confirmText}
                </HeroButton>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

AlertDialog.displayName = 'AlertDialog';

export default AlertDialog;
