/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  id?: string;
}

/**
 * HeroUI v3 Switch Component (1:1 with heroui/v3 switch.css)
 */
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
    const [isHovered, setIsHovered] = useState<boolean>(false);

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

    const displayLabel = children ?? label;

    return (
      <div
        className={`switch switch--${size} switch--${color} ${className}`}
        data-selected={currentChecked ? 'true' : undefined}
        data-disabled={effectiveDisabled ? 'true' : undefined}
        data-pressed={isPressed ? 'true' : undefined}
        data-hovered={isHovered ? 'true' : undefined}
      >
        <label
          htmlFor={switchId}
          className="switch__content"
          data-slot="switch-content"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          onMouseDown={() => !effectiveDisabled && setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onTouchStart={() => !effectiveDisabled && setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
        >
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            checked={currentChecked}
            disabled={effectiveDisabled}
            onChange={handleChange}
            className="sr-only"
            aria-checked={currentChecked}
            aria-disabled={effectiveDisabled}
            {...props}
          />

          {/* HeroUI v3 Switch Control (Track) */}
          <span
            data-slot="control"
            className="switch__control"
          >
            {/* Start Content (e.g. Moon / Sun Icon) */}
            {startContent && (
              <span
                data-slot="start-content"
                className={`absolute left-1 flex items-center justify-center transition-opacity duration-200 z-0 text-[10px] ${
                  currentChecked ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {startContent}
              </span>
            )}

            {/* End Content */}
            {endContent && (
              <span
                data-slot="end-content"
                className={`absolute right-1 flex items-center justify-center transition-opacity duration-200 z-0 text-[10px] text-muted ${
                  currentChecked ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                {endContent}
              </span>
            )}

            {/* HeroUI v3 Switch Thumb (Pill / Capsule 1.375 : 1 ratio) */}
            <span
              data-slot="thumb"
              className="switch__thumb"
            >
              {thumbIcon &&
                thumbIcon({
                  isSelected: currentChecked,
                  className: 'w-3 h-3 text-current transition-transform duration-200',
                })}
            </span>
          </span>

          {/* HeroUI v3 Switch Label */}
          {displayLabel && (
            <span data-slot="label" className="switch__label">
              {displayLabel}
            </span>
          )}
        </label>

        {/* HeroUI v3 Field Description below */}
        {description && (
          <span data-slot="description" className="switch__description">
            {description}
          </span>
        )}
      </div>
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
    <div id={id} role="group" className={`flex flex-col gap-2.5 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-foreground select-none tracking-tight">
          {label}
        </span>
      )}
      {description && (
        <span className="text-[11px] text-muted leading-normal -mt-1">
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
