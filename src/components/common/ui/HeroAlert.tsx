import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

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
    const iconClass = 'w-5 h-5 shrink-0 mt-0.5';
    switch (color) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-emerald-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      case 'danger':
        return <AlertCircle className={`${iconClass} text-rose-500`} />;
      case 'secondary':
        return <Info className={`${iconClass} text-secondary`} />;
      case 'default':
        return <Info className={`${iconClass} text-zinc-400`} />;
      case 'primary':
      default:
        return <Info className={`${iconClass} text-primary`} />;
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'solid':
        switch (color) {
          case 'success':
            return 'bg-emerald-600 text-white';
          case 'warning':
            return 'bg-amber-500 text-black';
          case 'danger':
            return 'bg-rose-600 text-white';
          case 'secondary':
            return 'bg-secondary text-secondary-foreground';
          case 'default':
            return 'bg-zinc-700 text-white';
          case 'primary':
          default:
            return 'bg-primary text-primary-foreground';
        }
      case 'bordered':
        switch (color) {
          case 'success':
            return 'border border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300';
          case 'warning':
            return 'border border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300';
          case 'danger':
            return 'border border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-300';
          case 'secondary':
            return 'border border-secondary/40 bg-secondary/5 text-secondary';
          case 'default':
            return 'border border-zinc-500/30 bg-zinc-500/5 text-zinc-300';
          case 'primary':
          default:
            return 'border border-primary/40 bg-primary/5 text-primary';
        }
      case 'faded':
        switch (color) {
          case 'success':
            return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
          case 'warning':
            return 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
          case 'danger':
            return 'border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
          case 'secondary':
            return 'border border-secondary/20 bg-secondary/10 text-secondary';
          case 'default':
            return 'border border-zinc-500/20 bg-zinc-500/10 text-zinc-300';
          case 'primary':
          default:
            return 'border border-primary/20 bg-primary/10 text-primary';
        }
      case 'flat':
      default:
        switch (color) {
          case 'success':
            return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20';
          case 'warning':
            return 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20';
          case 'danger':
            return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20';
          case 'secondary':
            return 'bg-secondary/10 text-secondary border border-secondary/20';
          case 'default':
            return 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20';
          case 'primary':
          default:
            return 'bg-primary/10 text-foreground border border-primary/20';
        }
    }
  };

  const renderedIcon = !hideIcon ? (icon || getDefaultIcon()) : null;

  return (
    <div
      id={id}
      role="alert"
      className={`relative flex items-start gap-3 p-4 rounded-2xl transition-all duration-200 ${getVariantClasses()} ${className}`}
    >
      {renderedIcon}

      <div className="flex-1 min-w-0 font-sans">
        {title && (
          <h5 className="text-xs sm:text-sm font-semibold tracking-tight leading-snug">
            {title}
          </h5>
        )}
        {description && (
          <div className="text-xs opacity-90 leading-relaxed mt-0.5 font-normal">
            {description}
          </div>
        )}
        {children && <div className="mt-2 text-xs">{children}</div>}
      </div>

      {action && <div className="shrink-0 flex items-center">{action}</div>}

      {isClosable && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className="p-1 -mr-1 -mt-1 rounded-lg text-current opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const Alert = HeroAlert;

export default HeroAlert;
