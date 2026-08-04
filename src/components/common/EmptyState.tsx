import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id,
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  const ActionIcon = action?.icon;

  return (
    <div
      id={id}
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-m3-outline/30 bg-m3-surface-container-low/40 p-10 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-primary/10 text-m3-primary mb-4">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold text-m3-on-surface mb-1">{title}</h3>

      {description && (
        <p className="max-w-md text-xs font-medium text-m3-on-surface-variant mb-6">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-xl bg-m3-primary px-4 py-2.5 text-xs font-bold text-m3-on-primary shadow-sm hover:bg-m3-primary/90 transition-all cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
};
