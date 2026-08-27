import React from 'react';
import { LucideIcon } from 'lucide-react';
import { HeroCard } from './ui/HeroCard';
import { HeroChip } from './ui/HeroChip';

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
  const getChipVariant = () => {
    switch (badgeVariant) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      case 'info':
        return 'info';
      case 'default':
      default:
        return 'neutral';
    }
  };

  return (
    <HeroCard
      id={id}
      variant="bordered"
      isHoverable
      className={`bg-content1 border border-divider/25 p-5 relative overflow-hidden shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-default-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black tracking-tight text-foreground">{value}</h3>
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
            <p className="text-xs text-default-500/80">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {badgeText && (
        <div className="mt-3 flex items-center gap-1.5">
          <HeroChip variant={getChipVariant()} size="sm">
            {badgeText}
          </HeroChip>
        </div>
      )}
    </HeroCard>
  );
};

export default MetricCard;
