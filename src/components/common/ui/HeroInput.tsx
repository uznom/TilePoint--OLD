import React from 'react';

export type HeroInputVariant = 'flat' | 'bordered' | 'faded' | 'underlined';
export type HeroInputColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroInputSize = 'sm' | 'md' | 'lg';
export type HeroInputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  variant?: HeroInputVariant;
  color?: HeroInputColor;
  size?: HeroInputSize;
  radius?: HeroInputRadius;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isClearable?: boolean;
  onClear?: () => void;
  onValueChange?: (value: string) => void;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  classNames?: {
    base?: string;
    inputWrapper?: string;
    input?: string;
    label?: string;
    helperWrapper?: string;
  };
  id?: string;
}

export const HeroInput = React.forwardRef<HTMLInputElement, HeroInputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      isInvalid = false,
      isRequired = false,
      isDisabled = false,
      isReadOnly = false,
      variant = 'bordered',
      color = 'primary',
      size = 'md',
      radius = 'md',
      startContent,
      endContent,
      isClearable = false,
      onClear,
      onValueChange,
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      classNames,
      id,
      value,
      defaultValue,
      onChange,
      disabled,
      readOnly,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `hero-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const effectiveDisabled = disabled ?? isDisabled;
    const effectiveReadOnly = readOnly ?? isReadOnly;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    const getRadiusClasses = () => {
      if (variant === 'underlined') return 'rounded-none';
      switch (radius) {
        case 'none':
          return 'rounded-none';
        case 'sm':
          return 'rounded-small';
        case 'md':
          return 'rounded-medium';
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
          return 'h-8 px-3 text-xs';
        case 'lg':
          return 'h-12 px-4 text-base';
        case 'md':
        default:
          return 'h-10 px-3.5 text-xs sm:text-sm';
      }
    };

    const getVariantClasses = () => {
      if (isInvalid) {
        return 'bg-danger-50/20 border border-danger text-foreground focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/25 shadow-elevation-inset';
      }

      switch (variant) {
        case 'flat':
          return 'bg-zinc-100/90 dark:bg-zinc-800/80 border border-transparent dark:border-white/5 text-foreground hover:bg-zinc-200/70 dark:hover:bg-zinc-800 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 shadow-elevation-inset';
        case 'faded':
          return 'bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-white/10 text-foreground hover:border-zinc-300 dark:hover:border-white/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 shadow-elevation-inset';
        case 'underlined':
          return 'bg-transparent border-b-2 border-divider rounded-none px-0 text-foreground hover:border-default-400 focus-within:border-primary';
        case 'bordered':
        default:
          return 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 text-foreground hover:border-zinc-300 dark:hover:border-white/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 shadow-elevation-inset';
      }
    };

    const showClear = isClearable && Boolean(value) && !effectiveDisabled && !effectiveReadOnly;

    return (
      <div data-slot="input-group" className={`input-group flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${wrapperClassName} ${classNames?.base || ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            data-slot="label"
            className={`text-xs font-semibold text-foreground dark:text-default-200 select-none flex items-center gap-1 font-sans tracking-tight ${classNames?.label || ''}`}
          >
            <span>{label}</span>
            {isRequired && <span className="text-danger">*</span>}
          </label>
        )}

        <div
          data-slot="input-wrapper"
          className={`relative flex items-center gap-2 transition-all duration-150 ${getRadiusClasses()} ${getSizeClasses()} ${getVariantClasses()} ${
            effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          } ${classNames?.inputWrapper || ''} ${className}`}
        >
          {startContent && <div data-slot="start-content" className="shrink-0 text-default-400 flex items-center">{startContent}</div>}

          <input
            ref={ref}
            id={inputId}
            type={type}
            data-slot="input"
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            disabled={effectiveDisabled}
            readOnly={effectiveReadOnly}
            className={`w-full h-full bg-transparent text-foreground placeholder:text-default-400 outline-none border-none p-0 focus:ring-0 text-inherit font-medium ${classNames?.input || ''}`}
            {...props}
          />

          {showClear && (
            <button
              type="button"
              data-slot="clear-button"
              onClick={onClear}
              className="text-default-400 hover:text-default-700 p-0.5 rounded-full hover:bg-default-200 transition-colors cursor-pointer shrink-0"
              title="Clear input"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {endContent && <div data-slot="end-content" className="shrink-0 text-default-400 flex items-center">{endContent}</div>}
        </div>

        {errorMessage && isInvalid ? (
          <p data-slot="error-message" className="text-[11px] font-medium text-danger animate-fade-in pl-1">{errorMessage}</p>
        ) : helperText ? (
          <p data-slot="helper-text" className="text-[11px] text-default-400 pl-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

HeroInput.displayName = 'HeroInput';

export default HeroInput;
