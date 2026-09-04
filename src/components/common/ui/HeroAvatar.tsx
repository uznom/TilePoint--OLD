import React, { useState } from 'react';

export type HeroAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type HeroAvatarRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type HeroAvatarColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

export type HeroAvatarSyncStatus =
  | 'connected'
  | 'syncing'
  | 'polling'
  | 'not connected'
  | 'disconnected'
  | 'error'
  | 'offline'
  | 'synced'
  | 'idle'
  | 'queued'
  | 'success'
  | 'warning'
  | 'danger';

export type HeroAvatarSyncVariant = 'dot' | 'ring' | 'both';
export type HeroAvatarSyncPlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface HeroAvatarProps {
  src?: string;
  name?: string;
  icon?: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  size?: HeroAvatarSize;
  radius?: HeroAvatarRadius;
  color?: HeroAvatarColor;
  isBordered?: boolean;
  isDisabled?: boolean;
  isFocusable?: boolean;
  syncStatus?: HeroAvatarSyncStatus;
  syncVariant?: HeroAvatarSyncVariant;
  syncPlacement?: HeroAvatarSyncPlacement;
  showSyncTooltip?: boolean;
  syncTitle?: string;
  className?: string;
  classNames?: {
    base?: string;
    img?: string;
    fallback?: string;
    name?: string;
    icon?: string;
    statusDot?: string;
  };
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement | HTMLButtonElement>;
  id?: string;
}

export type ResolvedSyncState = 'success' | 'warning' | 'danger';

export interface ResolvedSyncInfo {
  state: ResolvedSyncState;
  color: HeroAvatarColor;
  label: string;
}

/**
 * Resolves any DB sync status string into canonical HeroUI v3 states:
 * - connected / synced / idle -> success
 * - syncing / polling / queued -> warning
 * - not connected / disconnected / error / offline -> danger
 */
export function resolveSyncStatus(
  status?: HeroAvatarSyncStatus | string | null
): ResolvedSyncInfo | null {
  if (!status) return null;
  const normalized = status.toLowerCase().trim().replace(/[-_]/g, ' ');

  // 1. Connected: Success
  if (
    normalized === 'connected' ||
    normalized === 'synced' ||
    normalized === 'idle' ||
    normalized === 'success' ||
    normalized === 'online'
  ) {
    return {
      state: 'success',
      color: 'success',
      label: 'Database: Connected & Synced',
    };
  }

  // 2. Syncing / Polling: Warning
  if (
    normalized === 'syncing' ||
    normalized === 'polling' ||
    normalized === 'queued' ||
    normalized === 'warning' ||
    normalized === 'in progress' ||
    normalized === 'saving'
  ) {
    return {
      state: 'warning',
      color: 'warning',
      label: 'Database: Syncing / Polling in progress...',
    };
  }

  // 3. Not Connected / Disconnected / Error / Offline: Danger
  if (
    normalized === 'not connected' ||
    normalized === 'disconnected' ||
    normalized === 'error' ||
    normalized === 'offline' ||
    normalized === 'danger' ||
    normalized === 'unreachable'
  ) {
    return {
      state: 'danger',
      color: 'danger',
      label: 'Database: Not Connected / Offline',
    };
  }

  return null;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  src,
  name,
  icon,
  fallback,
  showFallback = true,
  size = 'md',
  radius = 'full',
  color = 'default',
  isBordered = false,
  isDisabled = false,
  isFocusable = false,
  syncStatus,
  syncVariant = 'both',
  syncPlacement = 'bottom-right',
  showSyncTooltip = true,
  syncTitle,
  className = '',
  classNames,
  imgProps,
  onClick,
  id,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedSync = resolveSyncStatus(syncStatus);

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary/20 text-primary';
      case 'secondary':
        return 'bg-secondary/20 text-secondary';
      case 'success':
        return 'bg-success/20 text-success';
      case 'warning':
        return 'bg-warning/20 text-warning';
      case 'danger':
        return 'bg-danger/20 text-danger';
      case 'default':
      default:
        return 'bg-gradient-to-tr from-cyan-400 via-sky-400 to-emerald-400 text-slate-900';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6 text-[10px]';
      case 'sm':
        return 'w-8 h-8 text-xs';
      case 'lg':
        return 'w-12 h-12 text-base';
      case 'xl':
        return 'w-14 h-14 text-lg';
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
    const shouldBorder = isBordered || (resolvedSync && (syncVariant === 'ring' || syncVariant === 'both'));
    if (!shouldBorder) return '';

    // If sync status is provided and syncVariant includes ring, use sync color
    if (resolvedSync && (syncVariant === 'ring' || syncVariant === 'both')) {
      switch (resolvedSync.state) {
        case 'success':
          return 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background';
        case 'warning':
          return 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background animate-pulse';
        case 'danger':
          return 'ring-2 ring-rose-500 ring-offset-2 ring-offset-background';
      }
    }

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

  const getSyncPlacementClasses = (placement: HeroAvatarSyncPlacement) => {
    switch (placement) {
      case 'top-left':
        return 'top-0 left-0 -translate-x-1/4 -translate-y-1/4';
      case 'top-right':
        return 'top-0 right-0 translate-x-1/4 -translate-y-1/4';
      case 'bottom-left':
        return 'bottom-0 left-0 -translate-x-1/4 translate-y-1/4';
      case 'bottom-right':
      default:
        return 'bottom-0 right-0 translate-x-1/4 translate-y-1/4';
    }
  };

  const getSyncDotSize = (sz: HeroAvatarSize) => {
    switch (sz) {
      case 'xs':
        return 'w-2 h-2';
      case 'sm':
        return 'w-2.5 h-2.5';
      case 'lg':
        return 'w-3.5 h-3.5';
      case 'xl':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  const renderContent = () => {
    if (src && !imageFailed) {
      return (
        <img
          src={src}
          alt={name || 'Avatar'}
          onError={() => setImageFailed(true)}
          className={`w-full h-full object-cover ${classNames?.img || ''}`}
          referrerPolicy="no-referrer"
          {...imgProps}
        />
      );
    }

    if (icon) {
      return (
        <span
          data-slot="icon"
          className={`flex items-center justify-center w-full h-full ${classNames?.icon || ''}`}
        >
          {icon}
        </span>
      );
    }

    if (name) {
      return (
        <span
          data-slot="name"
          className={`font-black uppercase tracking-wider ${classNames?.name || ''}`}
        >
          {getInitials(name)}
        </span>
      );
    }

    if (showFallback && fallback) {
      return (
        <span
          data-slot="fallback"
          className={`flex items-center justify-center w-full h-full ${classNames?.fallback || ''}`}
        >
          {fallback}
        </span>
      );
    }

    return <span>?</span>;
  };

  const renderSyncIndicator = () => {
    if (!resolvedSync || syncVariant === 'ring') return null;

    const titleText = syncTitle || (showSyncTooltip ? resolvedSync.label : undefined);
    const placementCls = getSyncPlacementClasses(syncPlacement);
    const dotSize = getSyncDotSize(size);

    return (
      <span
        data-slot="sync-indicator"
        className={`absolute z-10 flex items-center justify-center pointer-events-none select-none ${placementCls}`}
        title={titleText}
        aria-label={titleText}
      >
        {resolvedSync.state === 'warning' ? (
          <span className={`relative flex items-center justify-center ${dotSize} ${classNames?.statusDot || ''}`}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-full w-full rounded-full bg-amber-500 ring-2 ring-background animate-pulse" />
          </span>
        ) : (
          <span
            className={`relative inline-flex rounded-full ${dotSize} ${
              resolvedSync.state === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            } ring-2 ring-background ${classNames?.statusDot || ''}`}
          />
        )}
      </span>
    );
  };

  const tooltipTitle = syncTitle || (showSyncTooltip && resolvedSync ? resolvedSync.label : name);

  return (
    <div
      id={id}
      data-slot="avatar-container"
      data-sync-status={resolvedSync?.state}
      title={tooltipTitle}
      tabIndex={isFocusable ? 0 : undefined}
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${
        isDisabled ? 'opacity-45 pointer-events-none' : ''
      } ${isFocusable ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary' : ''}`}
      onClick={onClick}
    >
      <div
        data-slot="avatar"
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold transition-all ${getColorClasses()} ${getSizeClasses()} ${getRadiusClasses()} ${getBorderClasses()} ${classNames?.base || ''} ${className}`}
      >
        {renderContent()}
      </div>

      {renderSyncIndicator()}
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
  const remainingCount = total
    ? total - visibleChildren.length
    : max && childrenArray.length > max
    ? childrenArray.length - max
    : 0;

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

