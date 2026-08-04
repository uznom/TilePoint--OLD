import React from 'react';
import { SkeletalLoader } from './SkeletalLoader';

export interface PageLoadingFallbackProps {
  message?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message = "Loading Module...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 space-y-6">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-m3-surface-container-high/60 rounded-xl animate-pulse" />
          <div className="h-8 w-24 bg-m3-surface-container-high/60 rounded-xl animate-pulse" />
        </div>
        <SkeletalLoader />
      </div>
      <p className="text-xs font-semibold tracking-wider text-m3-on-surface-variant uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};
