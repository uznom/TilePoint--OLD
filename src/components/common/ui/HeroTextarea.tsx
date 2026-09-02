import React from 'react';

export type HeroTextareaVariant = 'flat' | 'bordered' | 'faded' | 'underlined';
export type HeroTextareaColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroTextareaSize = 'sm' | 'md' | 'lg';
export type HeroTextareaRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  variant?: HeroTextareaVariant;
  color?: HeroTextareaColor;
  size?: HeroTextareaSize;
  radius?: HeroTextareaRadius;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
  onValueChange?: (value: string) => void;
}

export const HeroTextarea = React.forwardRef<HTMLTextAreaElement, HeroTextareaProps>(
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
      size = 'md',
      radius = 'md',
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      id,
      value,
      defaultValue,
      onChange,
      onValueChange,
      disabled,
      readOnly,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `hero-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const effectiveDisabled = disabled ?? isDisabled;
    const effectiveReadOnly = readOnly ?? isReadOnly;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        case 'lg':
          return 'rounded-large';
        case 'full':
          return 'rounded-2xl';
        case 'md':
        default:
          return 'rounded-medium';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'p-2 text-xs';
        case 'lg':
          return 'p-4 text-base';
        case 'md':
        default:
          return 'p-3 text-sm';
      }
    };

    const getVariantClasses = () => {
      if (isInvalid) {
        return 'bg-danger-50/20 border border-danger text-foreground focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/20';
      }

      switch (variant) {
        case 'flat':
          return 'bg-default-100 border-transparent text-foreground hover:bg-default-200 focus-within:bg-default-100 focus-within:ring-2 focus-within:ring-primary/40';
        case 'faded':
          return 'bg-default-100 border border-divider text-foreground hover:border-default-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20';
        case 'underlined':
          return 'bg-transparent border-b-2 border-divider rounded-none px-0 text-foreground hover:border-default-400 focus-within:border-primary';
        case 'bordered':
        default:
          return 'bg-content1 border border-default-200 dark:border-default-100/50 text-foreground hover:border-default-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-xs';
      }
    };

    return (
      <div data-slot="input-group" className={`input-group flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            data-slot="label"
            className="text-xs font-bold text-default-700 dark:text-default-300 select-none flex items-center gap-1 font-sans tracking-tight"
          >
            <span>{label}</span>
            {isRequired && <span className="text-danger">*</span>}
          </label>
        )}

        <div
          data-slot="input-wrapper"
          className={`relative transition-all duration-150 ${getRadiusClasses()} ${getVariantClasses()} ${
            effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <textarea
            ref={ref}
            id={inputId}
            rows={rows}
            data-slot="input"
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            disabled={effectiveDisabled}
            readOnly={effectiveReadOnly}
            className={`w-full bg-transparent text-foreground placeholder:text-default-400 outline-none border-none focus:ring-0 text-inherit font-medium resize-y ${getSizeClasses()} ${className}`}
            {...props}
          />
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

HeroTextarea.displayName = 'HeroTextarea';

export const Textarea = HeroTextarea;

export default HeroTextarea;
