import React, { createContext, useContext } from 'react';

export type HeroRadioColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroRadioSize = 'sm' | 'md' | 'lg';

interface RadioGroupContextType {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  color?: HeroRadioColor;
  size?: HeroRadioSize;
  isDisabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export interface HeroRadioGroupProps {
  label?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  color?: HeroRadioColor;
  size?: HeroRadioSize;
  orientation?: 'horizontal' | 'vertical';
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export const HeroRadioGroup: React.FC<HeroRadioGroupProps> = ({
  label,
  name,
  value,
  defaultValue,
  onChange,
  onValueChange,
  color = 'primary',
  size = 'md',
  orientation = 'vertical',
  isDisabled = false,
  isInvalid = false,
  errorMessage,
  description,
  className = '',
  children,
  id,
}) => {
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue || '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
    onValueChange?.(val);
  };

  return (
    <RadioGroupContext.Provider
      value={{
        name,
        value: currentValue,
        onChange: handleChange,
        color,
        size,
        isDisabled,
      }}
    >
      <fieldset id={id} className={`flex flex-col gap-2 ${className}`}>
        {label && (
          <legend className="text-xs font-bold text-default-700 dark:text-default-300 mb-1">
            {label}
          </legend>
        )}
        <div
          className={`flex gap-3 ${
            orientation === 'horizontal' ? 'flex-row flex-wrap items-center' : 'flex-col'
          }`}
        >
          {children}
        </div>
        {errorMessage && isInvalid ? (
          <p className="text-[11px] font-medium text-danger animate-fade-in">{errorMessage}</p>
        ) : description ? (
          <p className="text-[11px] text-default-400">{description}</p>
        ) : null}
      </fieldset>
    </RadioGroupContext.Provider>
  );
};

export interface HeroRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  color?: HeroRadioColor;
  size?: HeroRadioSize;
  isDisabled?: boolean;
  description?: string;
  children?: React.ReactNode;
}

export const HeroRadio: React.FC<HeroRadioProps> = ({
  value,
  color,
  size,
  isDisabled,
  description,
  children,
  className = '',
  id,
  ...props
}) => {
  const group = useContext(RadioGroupContext);

  const effectiveColor = color || group?.color || 'primary';
  const effectiveSize = size || group?.size || 'md';
  const effectiveDisabled = isDisabled ?? group?.isDisabled ?? false;
  const isSelected = group ? group.value === value : props.checked;

  const getColorClasses = () => {
    switch (effectiveColor) {
      case 'secondary':
        return isSelected
          ? 'border-secondary bg-secondary'
          : 'border-default-400 dark:border-default-500 hover:border-secondary';
      case 'success':
        return isSelected
          ? 'border-success bg-success'
          : 'border-default-400 dark:border-default-500 hover:border-success';
      case 'warning':
        return isSelected
          ? 'border-warning bg-warning'
          : 'border-default-400 dark:border-default-500 hover:border-warning';
      case 'danger':
        return isSelected
          ? 'border-danger bg-danger'
          : 'border-default-400 dark:border-default-500 hover:border-danger';
      case 'default':
        return isSelected
          ? 'border-default-700 bg-default-700'
          : 'border-default-400 dark:border-default-500 hover:border-default-600';
      case 'primary':
      default:
        return isSelected
          ? 'border-primary bg-primary'
          : 'border-default-400 dark:border-default-500 hover:border-primary';
    }
  };

  const getSizeClasses = () => {
    switch (effectiveSize) {
      case 'sm':
        return { outer: 'w-4 h-4', inner: 'w-1.5 h-1.5', text: 'text-xs' };
      case 'lg':
        return { outer: 'w-6 h-6', inner: 'w-2.5 h-2.5', text: 'text-base' };
      case 'md':
      default:
        return { outer: 'w-5 h-5', inner: 'w-2 h-2', text: 'text-sm' };
    }
  };

  const sizeClass = getSizeClasses();

  return (
    <label
      id={id}
      className={`group relative inline-flex items-start gap-2.5 cursor-pointer select-none transition-opacity ${
        effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      <input
        type="radio"
        name={group?.name}
        value={value}
        checked={isSelected}
        disabled={effectiveDisabled}
        onChange={() => group?.onChange?.(value)}
        className="sr-only"
        {...props}
      />
      <div
        className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-150 ease-out mt-0.5 shrink-0 ${sizeClass.outer} ${getColorClasses()}`}
      >
        {isSelected && (
          <span className={`rounded-full bg-white transition-transform transform scale-100 ${sizeClass.inner}`} />
        )}
      </div>
      {(children || description) && (
        <div className="flex flex-col">
          {children && (
            <span className={`font-semibold text-foreground leading-tight ${sizeClass.text}`}>
              {children}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-default-400 leading-normal mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
