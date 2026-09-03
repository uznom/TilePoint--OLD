import React, { useState, useEffect } from 'react';

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
    const [isHovered, setIsHovered] = useState<boolean>(false);
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

    const displayLabel = children ?? label;

    return (
      <div
        data-slot="checkbox"
        data-selected={currentChecked ? 'true' : undefined}
        data-indeterminate={isIndeterminate ? 'true' : undefined}
        data-disabled={effectiveDisabled ? 'true' : undefined}
        data-invalid={isInvalid ? 'true' : undefined}
        data-hovered={isHovered ? 'true' : undefined}
        data-pressed={isPressed ? 'true' : undefined}
        className={`checkbox checkbox--${color} checkbox--${size} ${
          effectiveDisabled ? 'checkbox--disabled' : ''
        } ${className}`}
      >
        <label
          htmlFor={checkboxId}
          data-slot="checkbox-content"
          data-hovered={isHovered ? 'true' : undefined}
          data-pressed={isPressed ? 'true' : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          className="checkbox__content group"
        >
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={currentChecked}
            disabled={effectiveDisabled}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />

          {/* HeroUI v3 Checkbox Control (Square Button with animated pseudo-element) */}
          <span
            data-slot="control"
            className="checkbox__control"
          >
            <span
              data-slot="indicator"
              className="checkbox__indicator"
            >
              {isIndeterminate ? (
                <svg
                  data-slot="checkbox-default-indicator--indeterminate"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 stroke-current"
                >
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : currentChecked ? (
                <svg
                  data-slot="checkbox-default-indicator--checkmark"
                  viewBox="0 0 17 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3"
                >
                  <path
                    d="m3.5 9.5 3.5 3.5 6.5-7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
          </span>

          {/* Label Text */}
          {displayLabel && (
            <span
              data-slot="label"
              className={`checkbox__label ${isInvalid ? 'text-danger' : ''}`}
            >
              {displayLabel}
            </span>
          )}
        </label>

        {/* Field-level description */}
        {description && (
          <span
            data-slot="description"
            className="checkbox__description"
          >
            {description}
          </span>
        )}

        {/* Field error message */}
        {isInvalid && errorMessage && (
          <span
            data-slot="field-error"
            className="text-xs text-danger ps-7"
          >
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
