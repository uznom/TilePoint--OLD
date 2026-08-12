import React from 'react';

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

  const statusStyles: Record<string, { bg: string; text: string; border: string; dotColor: string }> = {
    active: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    completed: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    approved: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    pending: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dotColor: 'bg-amber-400',
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dotColor: 'bg-amber-400',
    },
    in_transit: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      dotColor: 'bg-cyan-400',
    },
    info: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      dotColor: 'bg-cyan-400',
    },
    suspended: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    cancelled: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    danger: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    draft: {
      bg: 'bg-m3-surface-low',
      text: 'text-m3-on-surface-variant',
      border: 'border-m3-outline-variant/50',
      dotColor: 'bg-zinc-400',
    },
  };

  const style = statusStyles[normStatus] || {
    bg: 'bg-m3-surface-low',
    text: 'text-m3-on-surface-variant',
    border: 'border-m3-outline-variant/50',
    dotColor: 'bg-zinc-400',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-xs',
  };

  const displayLabel = label || status.replace(/_/g, ' ').toUpperCase();

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold tracking-wider uppercase transition-all ${
        style.bg
      } ${style.text} ${style.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${style.dotColor}`} />}
      {displayLabel}
    </span>
  );
};
