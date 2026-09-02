import React from 'react';

export type HeroChipVariant =
  | 'solid'
  | 'bordered'
  | 'light'
  | 'flat'
  | 'faded'
  | 'shadow'
  | 'dot'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'outline';

export type HeroChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger';

export type HeroChipSize = 'sm' | 'md' | 'lg';
export type HeroChipRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroChipProps {
  children?: React.ReactNode;
  variant?: HeroChipVariant;
  color?: HeroChipColor;
  size?: HeroChipSize;
  radius?: HeroChipRadius;
  dot?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
  onClose?: () => void;
}

export const HeroChip: React.FC<HeroChipProps> = ({
  children,
  variant = 'flat',
  color = 'default',
  size = 'md',
  radius = 'full',
  dot = false,
  startContent,
  endContent,
  avatar,
  className = '',
  id,
  onClick,
  onClose,
}) => {
  // Normalize legacy variants
  let resolvedVariant: string = variant;
  let resolvedColor: HeroChipColor = color;

  if (variant === 'primary') {
    resolvedVariant = 'flat';
    resolvedColor = 'primary';
  } else if (variant === 'secondary') {
    resolvedVariant = 'flat';
    resolvedColor = 'secondary';
  } else if (variant === 'tertiary') {
    resolvedVariant = 'flat';
    resolvedColor = 'secondary';
  } else if (variant === 'success') {
    resolvedVariant = 'flat';
    resolvedColor = 'success';
  } else if (variant === 'warning') {
    resolvedVariant = 'flat';
    resolvedColor = 'warning';
  } else if (variant === 'danger') {
    resolvedVariant = 'flat';
    resolvedColor = 'danger';
  } else if (variant === 'info') {
    resolvedVariant = 'flat';
    resolvedColor = 'primary';
  } else if (variant === 'outline') {
    resolvedVariant = 'bordered';
  } else if (variant === 'neutral') {
    resolvedVariant = 'flat';
    resolvedColor = 'default';
  }

  const getVariantClasses = () => {
    switch (resolvedVariant) {
      case 'solid':
        switch (resolvedColor) {
          case 'primary':
            return { container: 'bg-primary text-primary-foreground', dot: 'bg-white' };
          case 'secondary':
            return { container: 'bg-secondary text-secondary-foreground', dot: 'bg-white' };
          case 'success':
            return { container: 'bg-success text-success-foreground', dot: 'bg-white' };
          case 'warning':
            return { container: 'bg-warning text-warning-foreground', dot: 'bg-white' };
          case 'danger':
            return { container: 'bg-danger text-danger-foreground', dot: 'bg-white' };
          case 'default':
          default:
            return { container: 'bg-default text-default-foreground', dot: 'bg-default-foreground' };
        }
      case 'bordered':
        switch (resolvedColor) {
          case 'primary':
            return { container: 'border border-primary text-primary bg-transparent', dot: 'bg-primary' };
          case 'secondary':
            return { container: 'border border-secondary text-secondary bg-transparent', dot: 'bg-secondary' };
          case 'success':
            return { container: 'border border-success text-success bg-transparent', dot: 'bg-success' };
          case 'warning':
            return { container: 'border border-warning text-warning bg-transparent', dot: 'bg-warning' };
          case 'danger':
            return { container: 'border border-danger text-danger bg-transparent', dot: 'bg-danger' };
          case 'default':
          default:
            return { container: 'border border-default-300 text-default-700 dark:text-default-300 bg-transparent', dot: 'bg-default-500' };
        }
      case 'light':
        switch (resolvedColor) {
          case 'primary':
            return { container: 'text-primary bg-transparent', dot: 'bg-primary' };
          case 'secondary':
            return { container: 'text-secondary bg-transparent', dot: 'bg-secondary' };
          case 'success':
            return { container: 'text-success bg-transparent', dot: 'bg-success' };
          case 'warning':
            return { container: 'text-warning bg-transparent', dot: 'bg-warning' };
          case 'danger':
            return { container: 'text-danger bg-transparent', dot: 'bg-danger' };
          case 'default':
          default:
            return { container: 'text-default-600 dark:text-default-400 bg-transparent', dot: 'bg-default-500' };
        }
      case 'dot':
        switch (resolvedColor) {
          case 'primary':
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-primary' };
          case 'secondary':
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-secondary' };
          case 'success':
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-success' };
          case 'warning':
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-warning' };
          case 'danger':
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-danger' };
          case 'default':
          default:
            return { container: 'border border-default-200 bg-transparent text-default-800 dark:text-default-200', dot: 'bg-default-500' };
        }
      case 'shadow':
        return { container: 'bg-primary text-primary-foreground shadow-md shadow-primary/30', dot: 'bg-white' };
      case 'flat':
      default:
        switch (resolvedColor) {
          case 'primary':
            return { container: 'bg-primary-50 text-primary-600 dark:bg-primary/15 dark:text-primary border border-primary/20', dot: 'bg-primary' };
          case 'secondary':
            return { container: 'bg-secondary-50 text-secondary-600 dark:bg-secondary/15 dark:text-secondary border border-secondary/20', dot: 'bg-secondary' };
          case 'success':
            return { container: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-500' };
          case 'warning':
            return { container: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20', dot: 'bg-amber-500' };
          case 'danger':
            return { container: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-500/20', dot: 'bg-rose-500' };
          case 'default':
          default:
            return { container: 'bg-default-100 text-default-700 dark:bg-content2/80 dark:text-default-300 border border-divider/60 dark:border-white/5', dot: 'bg-default-500' };
        }
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
      case 'lg':
        return 'rounded-large';
      case 'full':
      default:
        return 'rounded-full';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-[10px] h-5 px-2 gap-1 font-semibold';
      case 'lg':
        return 'text-xs h-8 px-3.5 gap-2 font-semibold';
      case 'md':
      default:
        return 'text-[11px] h-6 px-2.5 gap-1.5 font-semibold';
    }
  };

  const styles = getVariantClasses();
  const showDot = dot || resolvedVariant === 'dot';

  return (
    <span
      id={id}
      data-slot="chip"
      onClick={onClick}
      className={`chip inline-flex items-center justify-center font-sans font-semibold tracking-tight select-none transition-colors duration-150 ${getRadiusClasses()} ${getSizeClasses()} ${styles.container} ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
    >
      {avatar && <span data-slot="avatar" className="shrink-0 -ml-1 mr-1">{avatar}</span>}
      {startContent && <span data-slot="start-content" className="shrink-0">{startContent}</span>}
      {showDot && <span data-slot="dot" className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      <span data-slot="content">{children}</span>
      {endContent && <span data-slot="end-content" className="shrink-0">{endContent}</span>}
      {onClose && (
        <button
          type="button"
          data-slot="close-button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-current opacity-70 hover:opacity-100 cursor-pointer"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default HeroChip;
