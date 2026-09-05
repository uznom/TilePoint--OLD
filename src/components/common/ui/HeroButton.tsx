import React from 'react';

export type HeroButtonVariant =
  | 'solid'
  | 'bordered'
  | 'light'
  | 'flat'
  | 'ghost'
  | 'shadow'
  | 'faded'
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'outline'
  | 'slate';

export type HeroButtonColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger';

export type HeroButtonSize = 'sm' | 'md' | 'lg';
export type HeroButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface HeroButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  variant?: HeroButtonVariant;
  color?: HeroButtonColor;
  size?: HeroButtonSize;
  radius?: HeroButtonRadius;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress?: (e: any) => void;
  loadingText?: string;
  startIcon?: React.ReactNode;
  startContent?: React.ReactNode;
  endIcon?: React.ReactNode;
  endContent?: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  isIconOnly?: boolean;
  className?: string;
  children?: React.ReactNode;
  id?: string;
  value?: string;
}

export const HeroButton: React.FC<HeroButtonProps> = ({
  variant = 'solid',
  color = 'primary',
  size = 'md',
  radius = 'lg',
  isLoading = false,
  isDisabled = false,
  onPress,
  loadingText,
  startIcon,
  startContent,
  endIcon,
  endContent,
  icon,
  fullWidth = false,
  isIconOnly = false,
  className = '',
  children,
  disabled,
  id,
  type = 'button',
  onClick,
  ...props
}) => {
  const effectiveDisabled = disabled || isDisabled || isLoading;
  const effectiveStartIcon = startContent || startIcon || icon;
  const effectiveEndIcon = endContent || endIcon;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (effectiveDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    onPress?.(e);
  };

  // Resolve legacy alias variants to native HeroUI v3 colors + variants
  let resolvedVariant: string = variant;
  let resolvedColor: HeroButtonColor = color;

  if (variant === 'primary') {
    resolvedVariant = 'solid';
    resolvedColor = 'primary';
  } else if (variant === 'secondary') {
    resolvedVariant = 'flat';
    resolvedColor = 'default';
  } else if (variant === 'danger') {
    resolvedVariant = 'solid';
    resolvedColor = 'danger';
  } else if (variant === 'success') {
    resolvedVariant = 'solid';
    resolvedColor = 'success';
  } else if (variant === 'outline') {
    resolvedVariant = 'bordered';
  } else if (variant === 'slate') {
    resolvedVariant = 'flat';
    resolvedColor = 'default';
  }

  const getVariantClasses = () => {
    switch (resolvedVariant) {
      case 'solid':
        switch (resolvedColor) {
          case 'primary':
            return 'bg-primary text-primary-foreground btn-tactile-primary hover:brightness-105 active:brightness-95 hover:-translate-y-[1px] active:translate-y-[0px] active:scale-[0.985] transition-all duration-150';
          case 'secondary':
            return 'bg-secondary text-secondary-foreground shadow-[0_3px_12px_rgba(120,40,200,0.38)] hover:brightness-105 active:brightness-95 hover:-translate-y-[1px] active:scale-[0.985] transition-all duration-150';
          case 'success':
            return 'bg-success text-success-foreground shadow-[0_3px_12px_rgba(23,201,100,0.38)] hover:brightness-105 active:brightness-95 hover:-translate-y-[1px] active:scale-[0.985] transition-all duration-150';
          case 'warning':
            return 'bg-warning text-warning-foreground shadow-[0_3px_12px_rgba(245,165,36,0.38)] hover:brightness-105 active:brightness-95 hover:-translate-y-[1px] active:scale-[0.985] transition-all duration-150';
          case 'danger':
            return 'bg-danger text-danger-foreground shadow-[0_3px_12px_rgba(243,18,96,0.38)] hover:brightness-105 active:brightness-95 hover:-translate-y-[1px] active:scale-[0.985] transition-all duration-150';
          case 'default':
          default:
            return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 btn-tactile-default hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 border border-zinc-200/70 dark:border-white/10 active:scale-[0.985] transition-all duration-150';
        }
      case 'flat':
        switch (resolvedColor) {
          case 'primary':
            return 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 active:scale-[0.985] transition-all';
          case 'secondary':
            return 'bg-secondary/10 text-secondary hover:bg-secondary/20 active:bg-secondary/25 dark:bg-secondary/20 dark:text-secondary dark:hover:bg-secondary/30 active:scale-[0.985] transition-all';
          case 'success':
            return 'bg-success/10 text-success hover:bg-success/20 active:bg-success/25 dark:bg-success/20 dark:text-success dark:hover:bg-success/30 active:scale-[0.985] transition-all';
          case 'warning':
            return 'bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/25 dark:bg-warning/20 dark:text-warning dark:hover:bg-warning/30 active:scale-[0.985] transition-all';
          case 'danger':
            return 'bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/25 dark:bg-danger/20 dark:text-danger dark:hover:bg-danger/30 active:scale-[0.985] transition-all';
          case 'default':
          default:
            return 'bg-zinc-100 text-default-700 hover:bg-zinc-200/80 active:bg-zinc-300/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-default-200 active:scale-[0.985] transition-all';
        }
      case 'bordered':
        switch (resolvedColor) {
          case 'primary':
            return 'border border-primary text-primary hover:bg-primary/10 active:bg-primary/20 shadow-xs active:scale-[0.985] transition-all';
          case 'secondary':
            return 'border border-secondary text-secondary hover:bg-secondary/10 active:bg-secondary/20 shadow-xs active:scale-[0.985] transition-all';
          case 'success':
            return 'border border-success text-success hover:bg-success/10 active:bg-success/20 shadow-xs active:scale-[0.985] transition-all';
          case 'warning':
            return 'border border-warning text-warning hover:bg-warning/10 active:bg-warning/20 shadow-xs active:scale-[0.985] transition-all';
          case 'danger':
            return 'border border-danger text-danger hover:bg-danger/10 active:bg-danger/20 shadow-xs active:scale-[0.985] transition-all';
          case 'default':
          default:
            return 'border border-zinc-200/80 dark:border-white/10 text-default-700 hover:bg-zinc-100 active:bg-zinc-200 dark:text-default-200 dark:hover:bg-zinc-800 shadow-xs active:scale-[0.985] transition-all';
        }
      case 'light':
        switch (resolvedColor) {
          case 'primary':
            return 'bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20';
          case 'secondary':
            return 'bg-transparent text-secondary hover:bg-secondary/10 active:bg-secondary/20';
          case 'success':
            return 'bg-transparent text-success hover:bg-success/10 active:bg-success/20';
          case 'warning':
            return 'bg-transparent text-warning hover:bg-warning/10 active:bg-warning/20';
          case 'danger':
            return 'bg-transparent text-danger hover:bg-danger/10 active:bg-danger/20';
          case 'default':
          default:
            return 'bg-transparent text-default-600 hover:bg-default-100 active:bg-default-200 dark:text-default-400 dark:hover:bg-content2/60 dark:hover:text-default-200';
        }
      case 'ghost':
        return 'border border-transparent hover:border-divider bg-transparent text-default-700 dark:text-default-300 hover:bg-default-100/50 dark:hover:bg-content2/50';
      case 'shadow':
        return 'bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:brightness-105 active:brightness-95';
      case 'faded':
        return 'border border-divider bg-default-100 text-default-700 hover:bg-default-200 dark:bg-content2/60 dark:text-default-300';
      default:
        return 'bg-primary text-primary-foreground hover:brightness-105';
    }
  };

  const getRadiusClasses = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-small';
      case 'md':
        return 'rounded-medium';
      case 'xl':
        return 'rounded-2xl';
      case 'full':
        return 'rounded-full';
      case 'lg':
      default:
        return 'rounded-xl';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return isIconOnly
          ? 'w-8 h-8 min-w-8 p-0 text-xs'
          : 'h-8 min-h-8 px-3 text-xs gap-1.5 font-semibold';
      case 'lg':
        return isIconOnly
          ? 'w-12 h-12 min-w-12 p-0 text-base'
          : 'h-12 min-h-12 px-6 text-sm gap-2.5 font-semibold';
      case 'md':
      default:
        return isIconOnly
          ? 'w-10 h-10 min-w-10 p-0 text-sm'
          : 'h-10 min-h-10 px-4 text-xs sm:text-sm gap-2 font-semibold tracking-tight';
    }
  };

  const baseClasses =
    'button relative inline-flex items-center justify-center font-sans tracking-tight transition-all duration-200 ease-out outline-none select-none cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-content1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      id={id}
      type={type}
      data-slot="button"
      data-disabled={effectiveDisabled ? 'true' : undefined}
      disabled={effectiveDisabled}
      onClick={handleClick}
      className={`${baseClasses} ${getRadiusClasses()} ${getSizeClasses()} ${getVariantClasses()} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {loadingText ? <span>{loadingText}</span> : children}
        </span>
      ) : (
        <>
          {effectiveStartIcon && (
            <span className="inline-flex items-center justify-center shrink-0 self-center" data-slot="start-content">
              {effectiveStartIcon}
            </span>
          )}
          {children && (
            <span className="inline-flex items-center justify-center gap-1.5 self-center">
              {children}
            </span>
          )}
          {effectiveEndIcon && (
            <span className="inline-flex items-center justify-center shrink-0 self-center" data-slot="end-content">
              {effectiveEndIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default HeroButton;
