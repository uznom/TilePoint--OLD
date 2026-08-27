import React from 'react';
import { HeroChip, HeroChipVariant } from './ui/HeroChip';

export type StatusType =
  | 'active'
  | 'pending'
  | 'completed'
  | 'approved'
  | 'cancelled'
  | 'suspended'
  | 'in_transit'
  | 'warning'
  | 'danger'
  | 'info'
  | 'draft'
  | string;

export interface StatusBadgeProps {
  id?: string;
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  id,
  status,
  label,
  size = 'md',
  dot = true,
  className = '',
}) => {
  const normStatus = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  const getVariant = (): HeroChipVariant => {
    switch (normStatus) {
      case 'active':
      case 'completed':
      case 'approved':
        return 'success';
      case 'pending':
      case 'warning':
        return 'warning';
      case 'suspended':
      case 'cancelled':
      case 'danger':
        return 'danger';
      case 'in_transit':
      case 'info':
        return 'info';
      case 'draft':
      default:
        return 'neutral';
    }
  };

  const displayLabel = label || status.replace(/_/g, ' ').toUpperCase();

  return (
    <HeroChip
      id={id}
      variant={getVariant()}
      size={size}
      dot={dot}
      className={`rounded-full ${className}`}
    >
      {displayLabel}
    </HeroChip>
  );
};

export default StatusBadge;
