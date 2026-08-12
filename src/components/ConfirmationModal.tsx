import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, ShieldAlert, CheckCircle2, X } from 'lucide-react';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
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
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40',
          border: 'border-rose-500/30',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />,
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40',
          border: 'border-amber-500/30',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40',
          border: 'border-emerald-500/30',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-6 w-6 text-sky-400 shrink-0" />,
          badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          btnBg: 'bg-m3-primary hover:bg-m3-primary/90 text-m3-on-primary shadow-sky-950/40',
          border: 'border-sky-500/30',
        };
    }
  };

  const style = getAlertStyle();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-md bg-m3-surface-low border ${style.border} rounded-2xl p-6 shadow-2xl text-m3-on-surface font-sans overflow-hidden`}
        >
          {/* Top header & badge */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${style.badgeBg}`}>
                {style.icon}
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-widest font-extrabold px-2 py-0.5 rounded border ${style.badgeBg}`}>
                  {alertType.toUpperCase()} ALERT
                </span>
                <h3 className="text-base font-extrabold text-white mt-1 leading-snug">
                  {title}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-m3-on-surface-variant hover:text-white hover:bg-m3-outline-variant/20 rounded-lg transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body message */}
          <div className="text-xs text-m3-on-surface-variant leading-relaxed my-3 font-normal">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Footer action buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-m3-outline-variant/30">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-m3-on-surface-variant hover:text-white bg-m3-surface-container hover:bg-m3-outline-variant/20 transition cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 ${style.btnBg}`}
            >
              {isSubmitting ? 'Processing...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
