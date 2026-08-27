import React from 'react';
import { HeroInput, HeroInputProps } from './HeroInput';

export interface HeroNumberInputProps extends Omit<HeroInputProps, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onValueChangeNumber?: (value: number | undefined) => void;
  showStepper?: boolean;
}

export const HeroNumberInput = React.forwardRef<HTMLInputElement, HeroNumberInputProps>(
  (
    {
      value,
      defaultValue,
      min,
      max,
      step = 1,
      precision,
      onValueChangeNumber,
      showStepper = true,
      isDisabled = false,
      isReadOnly = false,
      endContent,
      ...props
    },
    ref
  ) => {
    const [internalVal, setInternalVal] = React.useState<number | undefined>(defaultValue);
    const currentVal = value !== undefined ? value : internalVal;

    const formatNum = (num: number | undefined): string => {
      if (num === undefined || isNaN(num)) return '';
      if (precision !== undefined) return num.toFixed(precision);
      return String(num);
    };

    const handleStep = (direction: 'up' | 'down') => {
      if (isDisabled || isReadOnly) return;
      const base = currentVal !== undefined ? currentVal : (min || 0);
      let next = direction === 'up' ? base + step : base - step;
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;

      if (precision !== undefined) {
        next = Number(next.toFixed(precision));
      }

      if (value === undefined) setInternalVal(next);
      onValueChangeNumber?.(next);
    };

    const handleChange = (valStr: string) => {
      if (valStr === '' || valStr === '-') {
        if (value === undefined) setInternalVal(undefined);
        onValueChangeNumber?.(undefined);
        return;
      }
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        if (value === undefined) setInternalVal(parsed);
        onValueChangeNumber?.(parsed);
      }
    };

    const stepperControls = showStepper && !isReadOnly && !isDisabled && (
      <div className="flex flex-col gap-0.5 -mr-1">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep('up')}
          className="h-3 w-4 flex items-center justify-center text-default-400 hover:text-default-700 dark:hover:text-default-200 hover:bg-default-200 rounded transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep('down')}
          className="h-3 w-4 flex items-center justify-center text-default-400 hover:text-default-700 dark:hover:text-default-200 hover:bg-default-200 rounded transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );

    return (
      <HeroInput
        ref={ref}
        type="number"
        min={min}
        max={max}
        step={step}
        value={formatNum(currentVal)}
        onValueChange={handleChange}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        endContent={
          <div className="flex items-center gap-1">
            {endContent}
            {stepperControls}
          </div>
        }
        {...props}
      />
    );
  }
);

HeroNumberInput.displayName = 'HeroNumberInput';

export const NumberField = HeroNumberInput;

export default HeroNumberInput;

