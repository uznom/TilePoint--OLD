import React from 'react';
import { HeroButtonVariant, HeroButtonColor, HeroButtonSize, HeroButtonRadius } from './HeroButton';

export interface HeroButtonGroupProps {
  children: React.ReactNode;
  variant?: HeroButtonVariant;
  color?: HeroButtonColor;
  size?: HeroButtonSize;
  radius?: HeroButtonRadius;
  isDisabled?: boolean;
  fullWidth?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  id?: string;
}

export const HeroButtonGroup: React.FC<HeroButtonGroupProps> = ({
  children,
  variant,
  color,
  size,
  radius = 'md',
  isDisabled,
  fullWidth = false,
  orientation = 'horizontal',
  className = '',
  id,
}) => {
  const getRadiusClass = () => {
    switch (radius) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-md';
      case 'lg':
        return 'rounded-2xl';
      case 'full':
        return 'rounded-full';
      case 'md':
      default:
        return 'rounded-xl';
    }
  };

  return (
    <div
      id={id}
      role="group"
      className={`inline-flex ${
        orientation === 'vertical' ? 'flex-col' : 'flex-row'
      } ${fullWidth ? 'w-full' : ''} ${getRadiusClass()} overflow-hidden border border-divider/30 divide-${
        orientation === 'vertical' ? 'y' : 'x'
      } divide-divider/25 ${className}`}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          variant: (child.props as any).variant || variant,
          color: (child.props as any).color || color,
          size: (child.props as any).size || size,
          disabled: (child.props as any).disabled ?? isDisabled,
          className: `!rounded-none !border-none ${fullWidth ? 'flex-1' : ''} ${(child.props as any).className || ''}`,
        } as any);
      })}
    </div>
  );
};
