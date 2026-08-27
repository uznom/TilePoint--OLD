import React from 'react';

export type HeroAvatarSize = 'sm' | 'md' | 'lg';
export type HeroAvatarRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type HeroAvatarColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

export interface HeroAvatarProps {
  src?: string;
  name?: string;
  icon?: React.ReactNode;
  size?: HeroAvatarSize;
  radius?: HeroAvatarRadius;
  color?: HeroAvatarColor;
  isBordered?: boolean;
  className?: string;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  src,
  name,
  icon,
  size = 'md',
  radius = 'full',
  color = 'default',
  isBordered = false,
  className = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-xs';
      case 'lg':
        return 'w-12 h-12 text-base';
      case 'md':
      default:
        return 'w-10 h-10 text-sm';
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

  const getBorderClasses = () => {
    if (!isBordered) return '';
    switch (color) {
      case 'primary':
        return 'ring-2 ring-primary ring-offset-2 ring-offset-background';
      case 'secondary':
        return 'ring-2 ring-secondary ring-offset-2 ring-offset-background';
      case 'success':
        return 'ring-2 ring-success ring-offset-2 ring-offset-background';
      case 'warning':
        return 'ring-2 ring-warning ring-offset-2 ring-offset-background';
      case 'danger':
        return 'ring-2 ring-danger ring-offset-2 ring-offset-background';
      case 'default':
      default:
        return 'ring-2 ring-default-400 ring-offset-2 ring-offset-background';
    }
  };

  const getInitials = (str?: string) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-default-200 text-default-700 font-bold select-none ${getSizeClasses()} ${getRadiusClasses()} ${getBorderClasses()} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : icon ? (
        icon
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};

export const Avatar = HeroAvatar;

export interface AvatarGroupProps {
  children?: React.ReactNode;
  max?: number;
  total?: number;
  size?: HeroAvatarSize;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max,
  total,
  size = 'md',
  className = '',
}) => {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray;
  const remainingCount = total ? total - visibleChildren.length : max && childrenArray.length > max ? childrenArray.length - max : 0;

  return (
    <div className={`flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visibleChildren.map((child, idx) => (
        <div key={idx} className="ring-2 ring-background rounded-full">
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="ring-2 ring-background rounded-full">
          <HeroAvatar name={`+${remainingCount}`} size={size} />
        </div>
      )}
    </div>
  );
};
AvatarGroup.displayName = 'AvatarGroup';

export default HeroAvatar;

