import React from 'react';

interface SimpleProgressBarProps {
  isLoading?: boolean;
  className?: string;
}

/**
 * Minimalist, clutter-free animated progress bar.
 * Designed without metadata, text, or percentages.
 */
export const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({
  isLoading = true,
  className = '',
}) => {
  if (!isLoading) return null;

  return (
    <div className={`w-full h-1 bg-m3-outline-variant/20 overflow-hidden relative ${className}`}>
      <div className="h-full bg-gradient-to-r from-m3-primary via-emerald-500 to-m3-primary w-full animate-[shimmer_1.5s_infinite_linear] origin-left" style={{
        animation: 'progressIndeterminate 1.5s infinite ease-in-out'
      }} />
      <style>{`
        @keyframes progressIndeterminate {
          0% {
            transform: translateX(-100%) scaleX(0.2);
          }
          50% {
            transform: translateX(0%) scaleX(0.6);
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
          }
        }
      `}</style>
    </div>
  );
};
