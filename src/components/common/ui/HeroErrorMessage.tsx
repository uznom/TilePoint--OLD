import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface HeroErrorMessageProps {
  message?: React.ReactNode;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  id?: string;
}

export const HeroErrorMessage: React.FC<HeroErrorMessageProps> = ({
  message,
  children,
  showIcon = true,
  className = '',
  id,
}) => {
  const content = message || children;
  if (!content) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`flex items-center gap-1.5 text-[11px] font-semibold text-rose-500 animate-fade-in ${className}`}
    >
      {showIcon && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="leading-tight">{content}</span>
    </div>
  );
};
