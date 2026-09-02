import React, { useState, useEffect } from 'react';
import { Check, Minus } from 'lucide-react';

export type HeroCheckboxColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
export type HeroCheckboxSize = 'sm' | 'md' | 'lg';
export type HeroCheckboxRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  children?: React.ReactNode;
  label?: React.ReactNode;
  description?: React.ReactNode;
  color?: HeroCheckboxColor;
  size?: HeroCheckboxSize;
  radius?: HeroCheckboxRadius;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onValueChange?: (isSelected: boolean) => void;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
}

export const HeroCheckbox = React.forwardRef<HTMLInputElement, HeroCheckboxProps>(
  (
    {
      children,
      label,
      description,
      color = 'primary',
      size = 'md',
      radius = 'md',
      isSelected,
      defaultSelected,
      onValueChange,
      isIndeterminate = false,
      isDisabled = false,
      isInvalid = false,
      errorMessage,
      className = '',
      id,
      checked,
      defaultChecked,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    const effectiveDisabled = disabled ?? isDisabled;
    const isControlled = checked !== undefined || isSelected !== undefined;
    const initialChecked = checked ?? isSelected ?? defaultChecked ?? defaultSelected ?? false;

    const [internalChecked, setInternalChecked] = useState<boolean>(initialChecked);

    useEffect(() => {
      if (isControlled) {
        setInternalChecked(Boolean(checked ?? isSelected));
      }
    }, [isControlled, checked, isSelected]);

    const currentChecked = isControlled ? Boolean(checked ?? isSelected) : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (effectiveDisabled) return;
      const nextVal = e.target.checked;
      if (!isControlled) {
        setInternalChecked(nextVal);
      }
      onChange?.(e);
      onValueChange?.(nextVal);
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return {
            box: 'w-4 h-4 text-[10px]',
            icon: 'w-3 h-3',
            label: 'text-xs',
            desc: 'text-[10px]',
            gap: 'gap-2',
          };
        case 'lg':
          return {
            box: 'w-6 h-6 text-sm',
            icon: 'w-4 h-4',
            label: 'text-base',
            desc: 'text-xs',
            gap: 'gap-3',
          };
        case 'md':
        default:
          return {
            box: 'w-5 h-5 text-xs',
            icon: 'w-3.5 h-3.5',
            label: 'text-xs sm:text-sm',
            desc: 'text-[11px]',
            gap: 'gap-2.5',
          };
      }
    };

    const getRadiusClasses = () => {
      switch (radius) {
        case 'none':
          return 'rounded-none';
        case 'sm':
          return 'rounded';
        case 'lg':
          return 'rounded-xl';
        case 'full':
          return 'rounded-full';
        case 'md':
        default:
          return 'rounded-lg';
      }
    };

    const getCheckedColorClasses = () => {
      if (isInvalid) {
        return 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/20';
      }
      switch (color) {
        case 'secondary':
          return 'border-secondary bg-secondary text-secondary-foreground shadow-sm shadow-secondary/25/20';
        case 'success':
          return 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20';
        case 'warning':
          return 'border-amber-500 bg-amber-500 text-black shadow-sm shadow-amber-500/20';
        case 'danger':
          return 'border-rose-600 bg-rose-600 text-white shadow-sm shadow-rose-600/20';
        case 'default':
          return 'border-zinc-600 bg-zinc-600 text-white shadow-sm';
        case 'primary':
        default:
          return 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25/25';
      }
    };

    const sizeCls = getSizeClasses();
    const radiusCls = getRadiusClasses();
    const displayLabel = children ?? label;

    return (
      <div data-slot="checkbox-group" className={`inline-flex flex-col ${className}`}>
        <label
          htmlFor={checkboxId}
          data-slot="checkbox"
          data-selected={currentChecked ? 'true' : undefined}
          data-disabled={effectiveDisabled ? 'true' : undefined}
          className={`checkbox group relative inline-flex items-start ${sizeCls.gap} cursor-pointer select-none ${
            effectiveDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <div className="relative flex items-center justify-center pt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              checked={currentChecked}
              disabled={effectiveDisabled}
              onChange={handleChange}
              className="peer sr-only"
              {...props}
            />
            {/* Custom Checkbox Frame */}
            <div
              data-slot="wrapper"
              className={`checkbox__box flex items-center justify-center transition-all duration-200 border-2 ${sizeCls.box} ${radiusCls} 
                ${
                  currentChecked || isIndeterminate
                    ? getCheckedColorClasses()
                    : `border-divider/60 bg-background hover:border-primary/70 dark:border-zinc-600 ${
                        isInvalid ? '!border-rose-500 !bg-rose-500/10' : ''
                      }`
                }
                peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-focus-visible:ring-primary`}
            >
              {isIndeterminate ? (
                <Minus data-slot="icon" className={`checkbox__icon ${sizeCls.icon} stroke-[3.5]`} />
              ) : currentChecked ? (
                <Check data-slot="icon" className={`checkbox__icon ${sizeCls.icon} stroke-[3.5] animate-in zoom-in-75 duration-150`} />
              ) : null}
            </div>
          </div>

          {(displayLabel || description) && (
            <div data-slot="label-wrapper" className="flex flex-col min-w-0">
              {displayLabel && (
                <span
                  data-slot="label"
                  className={`checkbox__label font-semibold text-foreground transition-colors group-hover:text-primary ${sizeCls.label} ${
                    isInvalid ? 'text-rose-500' : ''
                  }`}
                >
                  {displayLabel}
                </span>
              )}
              {description && (
                <span data-slot="description" className={`text-default-500/70 leading-normal ${sizeCls.desc}`}>
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {isInvalid && errorMessage && (
          <span data-slot="error-message" className="text-[10.5px] font-semibold text-rose-500 mt-1 pl-7">
            {errorMessage}
          </span>
        )}
      </div>
    );
  }
);

HeroCheckbox.displayName = 'HeroCheckbox';

export const Checkbox = HeroCheckbox;

export default HeroCheckbox;
