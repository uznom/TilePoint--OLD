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
export type HeroButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

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
  endIcon?: React.ReactNode;
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
  radius = 'md',
  isLoading = false,
  isDisabled = false,
  onPress,
  loadingText,
  startIcon,
  endIcon,
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
  const effectiveStartIcon = startIcon || icon;

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
            return 'bg-primary text-primary-foreground hover:bg-primary-400 active:bg-primary-600 shadow-md shadow-primary/25';
          case 'secondary':
            return 'bg-secondary text-secondary-foreground hover:bg-secondary-400 active:bg-secondary-600 shadow-md shadow-secondary/25';
          case 'success':
            return 'bg-success text-success-foreground hover:bg-success-400 active:bg-success-600 shadow-md shadow-success/25';
          case 'warning':
            return 'bg-warning text-warning-foreground hover:bg-warning-400 active:bg-warning-600 shadow-md shadow-warning/25';
          case 'danger':
            return 'bg-danger text-danger-foreground hover:bg-danger-400 active:bg-danger-600 shadow-md shadow-danger/25';
          case 'default':
          default:
            return 'bg-default text-default-foreground hover:bg-default-300 active:bg-default-400 shadow-sm';
        }
      case 'flat':
        switch (resolvedColor) {
          case 'primary':
            return 'bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30';
          case 'secondary':
            return 'bg-secondary-50 text-secondary-600 hover:bg-secondary-100 active:bg-secondary-200 dark:bg-secondary/20 dark:text-secondary dark:hover:bg-secondary/30';
          case 'success':
            return 'bg-success-50 text-success-600 hover:bg-success-100 active:bg-success-200 dark:bg-success/20 dark:text-success dark:hover:bg-success/30';
          case 'warning':
            return 'bg-warning-50 text-warning-600 hover:bg-warning-100 active:bg-warning-200 dark:bg-warning/20 dark:text-warning dark:hover:bg-warning/30';
          case 'danger':
            return 'bg-danger-50 text-danger-600 hover:bg-danger-100 active:bg-danger-200 dark:bg-danger/20 dark:text-danger dark:hover:bg-danger/30';
          case 'default':
          default:
            return 'bg-default-100 text-default-700 hover:bg-default-200 active:bg-default-300 dark:text-default-300';
        }
      case 'bordered':
        switch (resolvedColor) {
          case 'primary':
            return 'border-2 border-primary text-primary hover:bg-primary/10 active:bg-primary/20';
          case 'secondary':
            return 'border-2 border-secondary text-secondary hover:bg-secondary/10 active:bg-secondary/20';
          case 'success':
            return 'border-2 border-success text-success hover:bg-success/10 active:bg-success/20';
          case 'warning':
            return 'border-2 border-warning text-warning hover:bg-warning/10 active:bg-warning/20';
          case 'danger':
            return 'border-2 border-danger text-danger hover:bg-danger/10 active:bg-danger/20';
          case 'default':
          default:
            return 'border-2 border-default-200 text-default-700 hover:bg-default-100 active:bg-default-200 dark:text-default-300 dark:border-default-300/40';
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
            return 'bg-transparent text-default-600 hover:bg-default-100 active:bg-default-200 dark:text-default-400';
        }
      case 'ghost':
        return 'border-2 border-transparent hover:border-current bg-transparent text-default-700 dark:text-default-300 hover:bg-default-100/50';
      case 'shadow':
        return 'bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:bg-primary-400 active:bg-primary-600';
      case 'faded':
        return 'border border-divider bg-default-100 text-default-700 hover:bg-default-200 dark:text-default-300';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary-400';
    }
  };

  const getRadiusClasses = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-small';
      case 'lg':
        return 'rounded-large';
      case 'full':
        return 'rounded-full';
      case 'md':
      default:
        return 'rounded-medium';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return isIconOnly
          ? 'w-8 h-8 min-w-8 p-0 text-xs'
          : 'h-8 min-h-8 px-3 text-xs gap-1.5 font-bold';
      case 'lg':
        return isIconOnly
          ? 'w-12 h-12 min-w-12 p-0 text-base'
          : 'h-12 min-h-12 px-6 text-sm gap-2.5 font-black';
      case 'md':
      default:
        return isIconOnly
          ? 'w-10 h-10 min-w-10 p-0 text-sm'
          : 'h-10 min-h-10 px-4 text-xs gap-2 font-bold tracking-wide';
    }
  };

  const baseClasses =
    'relative inline-flex items-center justify-center font-sans tracking-wide transition-all duration-200 ease-out outline-none select-none cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      id={id}
      type={type}
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
          {effectiveStartIcon && <span className="shrink-0">{effectiveStartIcon}</span>}
          {children && <span>{children}</span>}
          {endIcon && <span className="shrink-0">{endIcon}</span>}
        </>
      )}
    </button>
  );
};

export default HeroButton;
