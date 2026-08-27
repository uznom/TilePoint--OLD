import React, { useState, useEffect } from 'react';

export type HeroSwitchColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
export type HeroSwitchSize = 'sm' | 'md' | 'lg';

export interface HeroSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  children?: React.ReactNode;
  label?: React.ReactNode;
  description?: React.ReactNode;
  color?: HeroSwitchColor;
  size?: HeroSwitchSize;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onValueChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  thumbIcon?: (props: { isSelected: boolean; className: string }) => React.ReactNode;
  className?: string;
}

export const HeroSwitch = React.forwardRef<HTMLInputElement, HeroSwitchProps>(
  (
    {
      children,
      label,
      description,
      color = 'primary',
      size = 'md',
      isSelected,
      defaultSelected,
      onValueChange,
      isDisabled = false,
      startContent,
      endContent,
      thumbIcon,
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
    const switchId = id || generatedId;

    const effectiveDisabled = disabled ?? isDisabled;
    const isControlled = checked !== undefined || isSelected !== undefined;
    const initialChecked = checked ?? isSelected ?? defaultChecked ?? defaultSelected ?? false;

    const [internalChecked, setInternalChecked] = useState<boolean>(initialChecked);
    const [isPressed, setIsPressed] = useState<boolean>(false);

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
            track: 'w-10 h-6 px-1',
            thumb: isPressed ? 'w-5 h-4' : 'w-4 h-4',
            thumbTranslate: currentChecked ? 'translate-x-4' : 'translate-x-0',
            label: 'text-xs',
            desc: 'text-[10px]',
            iconSize: 'w-2.5 h-2.5',
            startPos: 'left-1.5',
            endPos: 'right-1.5',
          };
        case 'lg':
          return {
            track: 'w-16 h-9 px-1.5',
            thumb: isPressed ? 'w-7 h-6' : 'w-6 h-6',
            thumbTranslate: currentChecked ? 'translate-x-7' : 'translate-x-0',
            label: 'text-base',
            desc: 'text-xs',
            iconSize: 'w-4 h-4',
            startPos: 'left-2.5',
            endPos: 'right-2.5',
          };
        case 'md':
        default:
          return {
            track: 'w-12 h-7 px-1',
            thumb: isPressed ? 'w-6 h-5' : 'w-5 h-5',
            thumbTranslate: currentChecked ? 'translate-x-5' : 'translate-x-0',
            label: 'text-sm',
            desc: 'text-[11px]',
            iconSize: 'w-3 h-3',
            startPos: 'left-2',
            endPos: 'right-2',
          };
      }
    };

    const getActiveTrackColor = () => {
      if (!currentChecked) {
        return 'bg-default-200 hover:bg-default-300 dark:bg-default-100 dark:hover:bg-default-200 text-default-600';
      }
      switch (color) {
        case 'secondary':
          return 'bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm shadow-secondary/30';
        case 'success':
          return 'bg-success hover:bg-success/90 text-success-foreground shadow-sm shadow-success/30';
        case 'warning':
          return 'bg-warning hover:bg-warning/90 text-warning-foreground shadow-sm shadow-warning/30';
        case 'danger':
          return 'bg-danger hover:bg-danger/90 text-danger-foreground shadow-sm shadow-danger/30';
        case 'default':
          return 'bg-default-700 hover:bg-default-800 dark:bg-default-400 dark:hover:bg-default-500 text-default-foreground shadow-sm';
        case 'primary':
        default:
          return 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/30';
      }
    };

    const sizeCls = getSizeClasses();
    const trackColorCls = getActiveTrackColor();
    const displayLabel = children ?? label;

    return (
      <label
        htmlFor={switchId}
        onMouseDown={() => !effectiveDisabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => !effectiveDisabled && setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`group relative inline-flex items-center justify-between gap-3 cursor-pointer select-none tap-highlight-transparent ${
          effectiveDisabled ? 'opacity-disabled cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
      >
        <div className="relative inline-flex items-center shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            checked={currentChecked}
            disabled={effectiveDisabled}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          {/* HeroUI v3 Switch Track */}
          <div
            className={`relative flex items-center justify-start rounded-full transition-all duration-250 ease-out box-border
              ${sizeCls.track} ${trackColorCls}
              peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-focus-visible:ring-primary`}
          >
            {/* Start Content / End Content inside HeroUI track */}
            {startContent && (
              <span
                className={`absolute ${sizeCls.startPos} flex items-center justify-center transition-all duration-200 z-0 ${sizeCls.iconSize} ${
                  currentChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                }`}
              >
                {startContent}
              </span>
            )}
            {endContent && (
              <span
                className={`absolute ${sizeCls.endPos} flex items-center justify-center transition-all duration-200 z-0 ${sizeCls.iconSize} ${
                  currentChecked ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100 text-default-500'
                }`}
              >
                {endContent}
              </span>
            )}

            {/* HeroUI v3 Switch Thumb */}
            <div
              className={`relative z-10 rounded-full bg-white dark:bg-foreground text-background shadow-md transition-all duration-250 ease-out flex items-center justify-center origin-center
                ${sizeCls.thumb} ${sizeCls.thumbTranslate}`}
            >
              {thumbIcon &&
                thumbIcon({
                  isSelected: currentChecked,
                  className: `${sizeCls.iconSize} text-current transition-transform duration-200`,
                })}
            </div>
          </div>
        </div>

        {(displayLabel || description) && (
          <div className="flex flex-col min-w-0">
            {displayLabel && (
              <span className={`font-medium text-foreground transition-colors group-hover:text-primary ${sizeCls.label}`}>
                {displayLabel}
              </span>
            )}
            {description && (
              <span className={`text-default-500 leading-normal ${sizeCls.desc}`}>
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

HeroSwitch.displayName = 'HeroSwitch';

export const Switch = HeroSwitch;

export interface SwitchGroupProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export const SwitchGroup: React.FC<SwitchGroupProps> = ({
  label,
  description,
  children,
  className = '',
  id,
}) => {
  return (
    <div id={id} role="group" className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-bold text-default-700 dark:text-default-300 select-none">
          {label}
        </span>
      )}
      {description && (
        <span className="text-[11px] text-default-500 leading-normal -mt-1">
          {description}
        </span>
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
};
SwitchGroup.displayName = 'SwitchGroup';

export { Label } from './HeroForm';

export default HeroSwitch;

