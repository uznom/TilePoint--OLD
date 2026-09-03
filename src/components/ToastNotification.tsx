/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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

/**
 * ToastNotification Component (1:1 with HeroUI v3 Toast)
 */
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
          icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
          indicatorBg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
          titleColor: 'text-foreground'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          indicatorBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          titleColor: 'text-foreground'
        };
      case 'info':
        return {
          icon: <Info className="h-4 w-4 text-primary" />,
          indicatorBg: 'bg-primary/10 text-primary border border-primary/20',
          titleColor: 'text-foreground'
        };
      case 'success':
      default:
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          indicatorBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          titleColor: 'text-foreground'
        };
    }
  };

  const getRegionClass = (pos: ToastPosition) => {
    switch (pos) {
      case 'top-left':
        return 'toast-region--top-start';
      case 'top-center':
        return 'toast-region--top-center';
      case 'bottom-left':
        return 'toast-region--bottom-start';
      case 'bottom-center':
        return 'toast-region--bottom-center';
      case 'bottom-right':
        return 'toast-region--bottom-end';
      case 'top-right':
      default:
        return 'toast-region--top-end';
    }
  };

  const style = getTypeStyles();

  return createPortal(
    <div 
      role="region" 
      aria-label="Notification Center"
      className={`toast-region ${getRegionClass(position)}`}
    >
      <div 
        role="status" 
        aria-live="polite" 
        data-slot="toast"
        className="toast animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div data-slot="indicator" className={`toast__indicator ${style.indicatorBg}`}>
          {icon || style.icon}
        </div>

        <div data-slot="content" className="toast__content font-sans">
          <span data-slot="title" className={`toast__title ${style.titleColor}`}>
            {message}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            data-slot="close-button"
            onClick={onClose}
            aria-label="Close notification"
            className="toast__close-button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ToastNotification;
