import React from 'react';

export type HeroSpinnerColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'white';
export type HeroSpinnerSize = 'sm' | 'md' | 'lg';

export interface HeroSpinnerProps {
  size?: HeroSpinnerSize;
  color?: HeroSpinnerColor;
  label?: string;
  className?: string;
  id?: string;
}

export const HeroSpinner: React.FC<HeroSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  label,
  className = '',
  id,
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'secondary':
        return 'text-secondary';
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-danger';
      case 'white':
        return 'text-white';
      case 'default':
        return 'text-default-500';
      case 'primary':
      default:
        return 'text-primary';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 border-2';
      case 'lg':
        return 'w-8 h-8 border-3';
      case 'md':
      default:
        return 'w-6 h-6 border-2';
    }
  };

  return (
    <div id={id} data-slot="spinner" className={`spinner inline-flex flex-col items-center justify-center gap-2 font-sans ${className}`}>
      <div
        data-slot="circle"
        className={`animate-spin rounded-full border-solid border-t-transparent ${getSizeClasses()} ${getColorClasses()} border-current`}
      />
      {label && <span data-slot="label" className="text-xs text-default-500 font-medium">{label}</span>}
    </div>
  );
};

export const Spinner = HeroSpinner;

export default HeroSpinner;
