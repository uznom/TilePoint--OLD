import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, AlertCircle, Info, X } from 'lucide-react';

export type ToastPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'top-center' 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'bottom-center';

export interface ToastNotificationProps {
  message: string | null;
  type?: 'success' | 'info' | 'error' | 'warning';
  position?: ToastPosition;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = 'success',
  position = 'top-right',
  onClose,
  icon
}) => {
  if (!message || typeof document === 'undefined') return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle className="h-4.5 w-4.5 text-danger" />,
          badgeBg: 'bg-danger/15 text-danger border-danger/25',
          accentBorder: 'border-danger/30'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-4.5 w-4.5 text-warning" />,
          badgeBg: 'bg-warning/15 text-warning border-warning/25',
          accentBorder: 'border-warning/30'
        };
      case 'info':
        return {
          icon: <Info className="h-4.5 w-4.5 text-primary" />,
          badgeBg: 'bg-primary/15 text-primary border-primary/25',
          accentBorder: 'border-primary/30'
        };
      case 'success':
      default:
        return {
          icon: <ShieldCheck className="h-4.5 w-4.5 text-secondary" />,
          badgeBg: 'bg-secondary/15 text-secondary border-secondary/25',
          accentBorder: 'border-secondary/30'
        };
    }
  };

  const getPositionClasses = (pos: ToastPosition) => {
    switch (pos) {
      case 'top-left':
        return 'top-0 left-0 items-start';
      case 'top-center':
        return 'top-0 left-1/2 -translate-x-1/2 items-center';
      case 'bottom-left':
        return 'bottom-0 left-0 items-start';
      case 'bottom-center':
        return 'bottom-0 left-1/2 -translate-x-1/2 items-center';
      case 'bottom-right':
        return 'bottom-0 right-0 items-end';
      case 'top-right':
      default:
        return 'top-0 right-0 items-end';
    }
  };

  const style = getTypeStyles();

  return createPortal(
    <div 
      role="region" 
      aria-label="Notification Center"
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden"
    >
      <div className={`absolute p-4 sm:p-6 flex flex-col pointer-events-none max-w-full ${getPositionClasses(position)}`}>
        <div 
          role="status" 
          aria-live="polite" 
          className="pointer-events-auto bg-content1/95 text-foreground backdrop-blur-xl border border-divider/50 shadow-2xl rounded-large p-3.5 sm:p-4 flex items-center justify-between gap-3 max-w-sm sm:max-w-md w-auto min-w-[280px] transition-all animate-fade-in ring-1 ring-black/5 dark:ring-white/5"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`h-9 w-9 rounded-medium flex items-center justify-center shrink-0 border ${style.badgeBg} shadow-sm`}>
              {icon || style.icon}
            </div>
            <span className="text-foreground text-xs md:text-sm font-semibold leading-snug break-words">
              {message}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notification"
              className="text-default-400 hover:text-foreground p-1.5 rounded-medium hover:bg-default/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

