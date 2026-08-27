import React from 'react';
import { HeroButton } from './common/ui/HeroButton';

export interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'color'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'slate' | 'flat';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  value?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  loadingText,
  icon,
  disabled,
  fullWidth = false,
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <HeroButton
      variant={variant}
      size={size}
      isLoading={isLoading}
      loadingText={loadingText}
      startIcon={icon}
      disabled={disabled}
      fullWidth={fullWidth}
      className={className}
      {...props}
    >
      {children}
    </HeroButton>
  );
};

export default ActionButton;
