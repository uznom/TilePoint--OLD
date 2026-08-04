import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trendValue?: string;
  isPositiveTrend?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'default',
  trendValue,
  isPositiveTrend,
  className = '',
}) => {
  const badgeStyles = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-xl border border-m3-outline/20 bg-m3-surface-container-high p-5 shadow-sm transition-all duration-200 hover:border-m3-primary/30 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-m3-on-surface-variant">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black tracking-tight text-m3-on-surface">{value}</h3>
            {trendValue && (
              <span
                className={`text-xs font-bold ${
                  isPositiveTrend ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositiveTrend ? '↑' : '↓'} {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-m3-on-surface-variant/80">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-m3-primary/10 text-m3-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {badgeText && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeStyles[badgeVariant]}`}
          >
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};
