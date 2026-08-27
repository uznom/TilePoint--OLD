import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { HeroButton } from './ui/HeroButton';

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
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-default-200/30 bg-content1/40 p-10 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>

      {description && (
        <p className="max-w-md text-xs font-medium text-default-500 mb-6">
          {description}
        </p>
      )}

      {action && (
        <HeroButton
          variant="primary"
          size="md"
          onClick={action.onClick}
          startIcon={ActionIcon ? <ActionIcon className="h-4 w-4" /> : undefined}
          className="shadow-sm"
        >
          {action.label}
        </HeroButton>
      )}
    </div>
  );
};

export default EmptyState;
