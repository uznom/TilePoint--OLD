import React from 'react';

export type HeroBadgeVariant = 'solid' | 'flat' | 'faded' | 'shadow';
export type HeroBadgeColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type HeroBadgePlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type HeroBadgeShape = 'circle' | 'rectangle';

export interface HeroBadgeProps {
  children: React.ReactNode;
  content?: React.ReactNode;
  variant?: HeroBadgeVariant;
  color?: HeroBadgeColor;
  placement?: HeroBadgePlacement;
  shape?: HeroBadgeShape;
  isInvisible?: boolean;
  isDot?: boolean;
  className?: string;
}

export const HeroBadge: React.FC<HeroBadgeProps> = ({
  children,
  content,
  variant: _variant = 'solid',
  color = 'danger',
  placement = 'top-right',
  shape: _shape = 'rectangle',
  isInvisible = false,
  isDot = false,
  className = '',
}) => {
  if (isInvisible) return <>{children}</>;

  const getPlacementClasses = () => {
    switch (placement) {
      case 'top-left':
        return 'top-0 left-0 -translate-x-1/2 -translate-y-1/2';
      case 'bottom-right':
        return 'bottom-0 right-0 translate-x-1/2 translate-y-1/2';
      case 'bottom-left':
        return 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2';
      case 'top-right':
      default:
        return 'top-0 right-0 translate-x-1/2 -translate-y-1/2';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary text-primary-foreground';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground';
      case 'success':
        return 'bg-success text-success-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'danger':
        return 'bg-danger text-danger-foreground';
      case 'default':
      default:
        return 'bg-default text-default-foreground';
    }
  };

  const badgeContent = isDot ? (
    <span className={`h-2.5 w-2.5 rounded-full border-2 border-background ${getColorClasses()} ${className}`} />
  ) : (
    <span
      className={`min-w-5 h-5 px-1 text-[10px] font-black rounded-full border-2 border-background flex items-center justify-center ${getColorClasses()} ${className}`}
    >
      {content}
    </span>
  );

  return (
    <div className="relative inline-flex shrink-0">
      {children}
      <span className={`absolute z-10 flex items-center justify-center ${getPlacementClasses()}`}>
        {badgeContent}
      </span>
    </div>
  );
};

export default HeroBadge;
