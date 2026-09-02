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
      radius="2xl"
      isHoverable
      className={`bg-content1 border border-divider p-5 relative overflow-hidden shadow-xs ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-medium text-default-500 tracking-tight">
            {title}
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground font-sans tracking-tight tabular-nums truncate">{value}</h3>
            {trendValue && (
              <HeroChip
                variant="flat"
                color={isPositiveTrend ? 'success' : 'danger'}
                size="sm"
              >
                {isPositiveTrend ? '↑' : '↓'} {trendValue}
              </HeroChip>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-default-400 font-normal">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-default-100 dark:bg-content2 text-default-600 dark:text-default-300">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {badgeText && !trendValue && (
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
