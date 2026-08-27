import React from 'react';
import { Search, X } from 'lucide-react';

export type SearchFieldVariant = 'flat' | 'bordered' | 'faded' | 'underlined';
export type SearchFieldColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type SearchFieldSize = 'sm' | 'md' | 'lg';
export type SearchFieldRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onSubmit'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  description?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  variant?: SearchFieldVariant;
  color?: SearchFieldColor;
  size?: SearchFieldSize;
  radius?: SearchFieldRadius;
  isClearable?: boolean;
  onClear?: () => void;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}


export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      label,
      placeholder = 'Search...',
      helperText,
      description,
      errorMessage,
      isInvalid = false,
      isRequired = false,
      isDisabled = false,
      isReadOnly = false,
      variant = 'bordered',
      color = 'primary',
      size = 'md',
      radius = 'lg',
      isClearable = true,
      onClear,
      onValueChange,
      onSubmit,
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      id,
      value,
      defaultValue,
      onChange,
      onKeyDown,
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `hero-search-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const effectiveDisabled = disabled ?? isDisabled;
    const effectiveReadOnly = readOnly ?? isReadOnly;

    const [internalValue, setInternalValue] = React.useState<string>(
      (value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : '')
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextVal = e.target.value;
      if (value === undefined) setInternalValue(nextVal);
      onChange?.(e);
      onValueChange?.(nextVal);
    };

    const handleClear = () => {
      if (value === undefined) setInternalValue('');
      onClear?.();
      onValueChange?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSubmit?.(internalValue);
      }
      onKeyDown?.(e);
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
          return 'rounded-large';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-8 px-2.5 text-xs';
        case 'lg':
          return 'h-12 px-4 text-base';
        case 'md':
        default:
          return 'h-10 px-3 text-sm';
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

    const hasValue = Boolean(internalValue);
    const showClear = isClearable && hasValue && !effectiveDisabled && !effectiveReadOnly;

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-default-700 dark:text-default-300 select-none flex items-center gap-1"
          >
            <span>{label}</span>
            {isRequired && <span className="text-danger">*</span>}
          </label>
        )}

        <div
          className={`relative flex items-center gap-2 transition-all duration-150 ${getRadiusClasses()} ${getSizeClasses()} ${getVariantClasses()} ${
            effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <Search className="w-4 h-4 text-default-400 shrink-0" />

          <input
            ref={ref}
            id={inputId}
            type="search"
            value={value !== undefined ? value : internalValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={effectiveDisabled}
            readOnly={effectiveReadOnly}
            placeholder={placeholder}
            className={`w-full h-full bg-transparent text-foreground placeholder:text-default-400 outline-none border-none p-0 focus:ring-0 text-inherit font-medium [&::-webkit-search-cancel-button]:hidden ${className}`}
            {...props}
          />

          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="text-default-400 hover:text-default-700 dark:hover:text-default-200 p-1 rounded-full hover:bg-default-200 transition-colors cursor-pointer shrink-0"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {errorMessage && isInvalid ? (
          <p className="text-[11px] font-medium text-danger animate-fade-in pl-1">{errorMessage}</p>
        ) : (description || helperText) ? (
          <p className="text-[11px] text-default-400 pl-1">{description || helperText}</p>
        ) : null}
      </div>
    );
  }
);

SearchField.displayName = 'SearchField';

export default SearchField;
