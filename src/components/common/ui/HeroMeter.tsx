import React from 'react';
import { Label } from './HeroForm';

export type MeterColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type MeterSize = 'sm' | 'md' | 'lg';

export interface MeterProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  showValueLabel?: boolean;
  formatOptions?: Intl.NumberFormatOptions;
  color?: MeterColor;
  size?: MeterSize;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const Meter: React.FC<MeterProps> = ({
  value = 0,
  minValue = 0,
  maxValue = 100,
  label,
  valueLabel,
  showValueLabel = true,
  formatOptions,
  color = 'primary',
  size = 'md',
  className = '',
  id,
  'aria-label': ariaLabel,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100));

  const getColorClasses = () => {
    switch (color) {
      case 'secondary':
        return 'bg-secondary';
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'danger':
        return 'bg-danger';
      case 'default':
        return 'bg-default-700 dark:bg-default-300';
      case 'primary':
      default:
        return 'bg-primary';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-1.5';
      case 'lg':
        return 'h-4';
      case 'md':
      default:
        return 'h-2.5';
    }
  };

  const formattedValue = React.useMemo(() => {
    if (valueLabel) return valueLabel;
    if (formatOptions) {
      return new Intl.NumberFormat(undefined, formatOptions).format(value);
    }
    return `${Math.round(percentage)}%`;
  }, [value, valueLabel, formatOptions, percentage]);

  return (
    <div
      id={id}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-label={typeof label === 'string' ? label : ariaLabel || 'Meter'}
      className={`flex flex-col gap-1.5 w-full ${className}`}
    >
      {(label || showValueLabel) && (
        <div className="flex items-center justify-between text-xs font-bold text-default-700 dark:text-default-300">
          {label && (typeof label === 'string' ? <Label>{label}</Label> : label)}
          {showValueLabel && (
            <span className="text-default-500 font-mono text-[11px]">
              {formattedValue}
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full overflow-hidden bg-default-200 dark:bg-default-100/50 rounded-full ${getSizeClasses()}`}
      >
        <div
          className={`h-full ${getColorClasses()} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

Meter.displayName = 'Meter';

export default Meter;
