import React from 'react';

export type HeroSliderColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroSliderSize = 'sm' | 'md' | 'lg';

export interface HeroSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  color?: HeroSliderColor;
  size?: HeroSliderSize;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  isDisabled?: boolean;
  onChange?: (value: number) => void;
  className?: string;
  id?: string;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  label,
  value,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  color = 'primary',
  size = 'md',
  showValue = false,
  formatValue,
  isDisabled = false,
  onChange,
  className = '',
  id,
  ...props
}) => {
  const [internalValue, setInternalValue] = React.useState<number>(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const percentage = Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (value === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

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
        return 'bg-default-600';
      case 'primary':
      default:
        return 'bg-primary';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { track: 'h-1', thumb: 'w-3 h-3' };
      case 'lg':
        return { track: 'h-3', thumb: 'w-6 h-6' };
      case 'md':
      default:
        return { track: 'h-2', thumb: 'w-4 h-4' };
    }
  };

  const sizes = getSizeClasses();

  return (
    <div className={`flex flex-col gap-1.5 w-full ${isDisabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold text-default-700 dark:text-default-300">
          {label && <span>{label}</span>}
          {showValue && (
            <span className="text-default-500 font-sans tabular-nums font-semibold">
              {formatValue ? formatValue(currentValue) : currentValue}
            </span>
          )}
        </div>
      )}
      <div className="relative flex items-center w-full py-1">
        {/* Track background */}
        <div className={`w-full ${sizes.track} bg-default-200 dark:bg-default-100 rounded-full overflow-hidden`}>
          {/* Active track */}
          <div
            className={`h-full ${getColorClasses()} transition-all duration-75`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Hidden Range Input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={isDisabled}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          {...props}
        />
        {/* Thumb */}
        <div
          className={`absolute pointer-events-none rounded-full bg-white dark:bg-default-900 border-2 shadow-md transition-transform duration-75 -translate-x-1/2 ${sizes.thumb} border-current`}
          style={{
            left: `${percentage}%`,
            color: color === 'primary' ? 'var(--heroui-primary)' : 'inherit',
          }}
        />
      </div>
    </div>
  );
};

export default HeroSlider;
