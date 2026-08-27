import React from 'react';

export type HeroSelectVariant = 'flat' | 'bordered' | 'faded' | 'underlined';
export type HeroSelectColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroSelectSize = 'sm' | 'md' | 'lg';
export type HeroSelectRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface SelectItemProps {
  key?: React.Key;
  value?: string | number;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, disabled, children, className = '' }) => {
  return (
    <option value={value} disabled={disabled} className={`bg-content1 dark:bg-[#18181B] text-foreground ${className}`}>
      {children}
    </option>
  );
};
SelectItem.displayName = 'SelectItem';

export interface SelectSectionProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export const SelectSection: React.FC<SelectSectionProps> = ({ title, children, className = '' }) => {
  return (
    <optgroup label={title} className={`bg-content1 dark:bg-[#18181B] text-default-500 font-bold ${className}`}>
      {children}
    </optgroup>
  );
};
SelectSection.displayName = 'SelectSection';

export interface HeroSelectItem {
  key: string | number;
  label: string;
  value?: string | number;
  disabled?: boolean;
}

export interface HeroSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  variant?: HeroSelectVariant;
  color?: HeroSelectColor;
  size?: HeroSelectSize;
  radius?: HeroSelectRadius;
  startContent?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
  items?: HeroSelectItem[];
  selectedKeys?: Iterable<React.Key>;
  defaultSelectedKeys?: Iterable<React.Key>;
  onSelectionChange?: (keys: any) => void;
  onValueChange?: (value: string) => void;
  id?: string;
}


export const HeroSelect = React.forwardRef<HTMLSelectElement, HeroSelectProps>(
  (
    {
      label,
      placeholder = 'Select an option',
      helperText,
      errorMessage,
      isInvalid = false,
      isRequired = false,
      isDisabled = false,
      variant = 'bordered',
      size = 'md',
      radius = 'md',
      startContent,
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      items,
      onValueChange,
      id,
      value,
      defaultValue,
      onChange,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `hero-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const effectiveDisabled = disabled ?? isDisabled;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
          return 'rounded-full';
        case 'md':
        default:
          return 'rounded-medium';
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
          {startContent && <div className="shrink-0 text-default-400 flex items-center">{startContent}</div>}

          <select
            ref={ref}
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            disabled={effectiveDisabled}
            className={`w-full h-full bg-transparent text-foreground outline-none border-none p-0 focus:ring-0 text-inherit font-medium cursor-pointer appearance-none pr-6 ${className}`}
            {...props}
          >
            {placeholder && !defaultValue && !value && (
              <option value="" disabled className="bg-content1 dark:bg-[#18181B] text-default-400">
                {placeholder}
              </option>
            )}
            {items
              ? items.map((item) => (
                  <option
                    key={item.key}
                    value={item.value !== undefined ? item.value : item.key}
                    disabled={item.disabled}
                    className="bg-content1 dark:bg-[#18181B] text-foreground"
                  >
                    {item.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom Chevron icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {errorMessage && isInvalid ? (
          <p className="text-[11px] font-medium text-danger animate-fade-in pl-1">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-[11px] text-default-400 pl-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

HeroSelect.displayName = 'HeroSelect';

export const Select = HeroSelect;

export default HeroSelect;

