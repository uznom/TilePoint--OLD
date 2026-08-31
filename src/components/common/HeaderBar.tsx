import React from 'react';
import { LucideIcon } from 'lucide-react';
import { HeroChip } from './ui/HeroChip';

export interface HeaderBarProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  };
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
  className = '',
}) => {
  const getBadgeVariant = () => {
    switch (badge?.variant) {
      case 'secondary':
        return 'secondary';
      case 'accent':
        return 'warning';
      case 'outline':
        return 'outline';
      case 'primary':
      default:
        return 'primary';
    }
  };

  return (
    <div
      id={id}
      className={`bg-content1 border border-divider/25 flex flex-col gap-4 rounded-2xl p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-foreground">{title}</h2>
            {badge && (
              <HeroChip variant={getBadgeVariant()} size="sm">
                {badge.text}
              </HeroChip>
            )}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-default-500">{subtitle}</p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};

export default HeaderBar;
