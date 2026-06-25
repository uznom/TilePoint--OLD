import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'slate';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  loadingText,
  icon,
  disabled,
  fullWidth = false,
  className = '',
  ...props
}) => {
  // Compute variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90 hover:shadow-md hover:shadow-m3-primary/10 border border-transparent';
      case 'secondary':
        return 'bg-m3-secondary-container text-m3-on-secondary-container hover:bg-m3-secondary-container/90 border border-m3-outline-variant/30';
      case 'danger':
        return 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md hover:shadow-rose-600/10 border border-transparent';
      case 'success':
        return 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/10 border border-transparent';
      case 'outline':
        return 'bg-transparent border border-m3-outline-variant/60 text-m3-on-surface hover:bg-m3-primary/5 hover:border-m3-primary';
      case 'ghost':
        return 'bg-transparent text-m3-on-surface hover:bg-m3-primary/5 hover:text-m3-primary border border-transparent';
      case 'slate':
        return 'bg-[#1e293b]/50 border border-slate-700/50 hover:bg-[#1e293b]/80 hover:border-slate-500 text-slate-200';
      default:
        return 'bg-m3-primary text-m3-on-primary hover:bg-m3-primary/95';
    }
  };

  const baseClasses = 'relative inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-150 outline-none select-none';
  const focusClasses = 'focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:outline-none';
  const pressedClasses = 'active:scale-[0.97]';
  const disabledClasses = 'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:shadow-none disabled:active:scale-100';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${focusClasses} ${pressedClasses} ${disabledClasses} ${getVariantClasses()} ${widthClass} ${className}`}
      {...props}
    >
      {/* Loading state spinner */}
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-current" />
          <span className="animate-pulse">{loadingText || 'Processing...'}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2 w-full">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{children}</span>
        </span>
      )}
    </button>
  );
};
