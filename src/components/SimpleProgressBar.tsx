import React from 'react';

interface SimpleProgressBarProps {
  isLoading?: boolean;
  className?: string;
}

/**
 * Minimalist, clutter-free animated progress bar below the browser URL/header bar.
 * Designed with smooth continuous GPU-accelerated motion that never freezes.
 */
export const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({
  isLoading = true,
  className = '',
}) => {
  if (!isLoading) return null;

  return (
    <div
      role="progressbar"
      aria-label="System processing"
      aria-busy="true"
      className={`w-full h-1 bg-default-100 overflow-hidden relative simple-progress-bar ${className}`}
    >
      <div className="simple-progress-indicator h-full w-full bg-gradient-to-r from-primary via-emerald-500 to-primary" />
    </div>
  );
};

