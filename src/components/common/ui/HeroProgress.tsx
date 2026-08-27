import React from 'react';

export type HeroProgressColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroProgressSize = 'sm' | 'md' | 'lg';
export type HeroProgressRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface HeroProgressProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  isIndeterminate?: boolean;
  label?: React.ReactNode;
  showValueLabel?: boolean;
  formatValue?: (value: number) => string;
  color?: HeroProgressColor;
  size?: HeroProgressSize;
  radius?: HeroProgressRadius;
  className?: string;
  id?: string;
}

export const HeroProgress: React.FC<HeroProgressProps> = ({
  value = 0,
  minValue = 0,
  maxValue = 100,
  isIndeterminate = false,
  label,
  showValueLabel = false,
  formatValue,
  color = 'primary',
  size = 'md',
  radius = 'full',
  className = '',
  id,
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

  const getRadiusClasses = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-small';
      case 'md':
        return 'rounded-medium';
      case 'lg':
        return 'rounded-large';
      case 'full':
      default:
        return 'rounded-full';
    }
  };

  return (
    <div id={id} className={`flex flex-col gap-1.5 w-full ${className}`}>
      {(label || showValueLabel) && (
        <div className="flex items-center justify-between text-xs font-bold text-default-700 dark:text-default-300">
          {label && <span>{label}</span>}
          {showValueLabel && !isIndeterminate && (
            <span className="text-default-500 font-mono">
              {formatValue ? formatValue(value) : `${Math.round(percentage)}%`}
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full overflow-hidden bg-default-200 dark:bg-default-100 ${getSizeClasses()} ${getRadiusClasses()}`}
      >
        {isIndeterminate ? (
          <div
            className={`h-full w-1/3 ${getColorClasses()} animate-pulse rounded-full transition-all duration-300`}
            style={{
              animation: 'indeterminate 1.5s infinite linear',
            }}
          />
        ) : (
          <div
            className={`h-full ${getColorClasses()} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default HeroProgress;
