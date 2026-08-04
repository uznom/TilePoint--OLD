import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  const badgeClasses = {
    primary: 'bg-m3-primary/10 text-m3-primary border-m3-primary/30',
    secondary: 'bg-m3-secondary/10 text-m3-secondary border-m3-secondary/30',
    accent: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    outline: 'border-m3-outline text-m3-on-surface-variant',
  };

  return (
    <div
      id={id}
      className={`flex flex-col gap-4 rounded-2xl border border-m3-outline/20 bg-m3-surface-container-high/90 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-m3-primary/15 text-m3-primary shadow-inner">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black tracking-tight text-m3-on-surface">{title}</h2>
            {badge && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                  badgeClasses[badge.variant || 'primary']
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-m3-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};
