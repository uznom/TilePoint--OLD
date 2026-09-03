/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type HeroAlertVariant = 'solid' | 'flat' | 'bordered' | 'faded';
export type HeroAlertColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

export interface HeroAlertProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: HeroAlertVariant;
  color?: HeroAlertColor;
  icon?: React.ReactNode;
  hideIcon?: boolean;
  isClosable?: boolean;
  onClose?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * HeroUI v3 Alert Component (1:1 with heroui/v3 alert.css)
 */
export const HeroAlert: React.FC<HeroAlertProps> = ({
  title,
  description,
  variant = 'flat',
  color = 'primary',
  icon,
  hideIcon = false,
  isClosable = false,
  onClose,
  action,
  children,
  className = '',
  id,
}) => {
  const getDefaultIcon = () => {
    const iconClass = 'w-4 h-4';
    switch (color) {
      case 'success':
        return <CheckCircle2 className={`${iconClass} text-success`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-warning`} />;
      case 'danger':
        return <AlertCircle className={`${iconClass} text-danger`} />;
      case 'secondary':
        return <Info className={`${iconClass} text-secondary`} />;
      case 'default':
        return <Info className={`${iconClass} text-muted`} />;
      case 'primary':
      default:
        return <Info className={`${iconClass} text-primary`} />;
    }
  };

  const renderedIcon = !hideIcon ? (icon || getDefaultIcon()) : null;

  return (
    <div
      id={id}
      role="alert"
      data-slot="alert"
      className={`alert alert--${variant} alert--${color} ${className}`}
    >
      {renderedIcon && (
        <div data-slot="indicator" className="alert__indicator">
          {renderedIcon}
        </div>
      )}

      <div data-slot="content" className="alert__content font-sans">
        {title && (
          <div data-slot="title" className="alert__title">
            {title}
          </div>
        )}
        {description && (
          <div data-slot="description" className="alert__description">
            {description}
          </div>
        )}
        {children && <div className="mt-1.5 text-xs w-full">{children}</div>}
      </div>

      {action && (
        <div data-slot="action" className="shrink-0 flex items-center ml-auto">
          {action}
        </div>
      )}

      {isClosable && onClose && (
        <button
          type="button"
          data-slot="close-button"
          onClick={onClose}
          aria-label="Close alert"
          className="p-1 -mr-1 -mt-0.5 rounded-lg text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

HeroAlert.displayName = 'HeroAlert';

export const Alert = HeroAlert;

export default HeroAlert;
