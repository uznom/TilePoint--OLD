import React from 'react';
import { HeroSkeleton } from './common/ui/HeroSkeleton';
import { HeroCard } from './common/ui/HeroCard';

export interface PageLoadingFallbackProps {
  message?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message = "Loading Module...",
}) => {
  return (
    <div className="flex flex-col items-start justify-start w-full min-h-[calc(100vh-140px)] p-2 sm:p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="w-full space-y-6">
        {/* Top Header Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="space-y-2">
            <HeroSkeleton className="w-64 h-8 rounded-xl" />
            <HeroSkeleton className="w-96 h-4 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <HeroSkeleton className="w-28 h-10 rounded-xl" />
            <HeroSkeleton className="w-36 h-10 rounded-xl" />
          </div>
        </div>

        {/* Responsive Metric KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 w-full">
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
          <HeroCard className="p-5 bg-content1 rounded-2xl border border-divider/40 space-y-3">
            <div className="flex items-center justify-between">
              <HeroSkeleton className="h-4 w-28 rounded-md" />
              <HeroSkeleton className="h-8 w-8 rounded-xl" />
            </div>
            <HeroSkeleton className="h-8 w-36 rounded-lg" />
            <HeroSkeleton className="h-3 w-20 rounded-md" />
          </HeroCard>
        </div>

        {/* Full Screen Main Table / Workspace Card */}
        <HeroCard className="p-6 bg-content1 rounded-2xl border border-divider/40 space-y-4 w-full flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider/20">
            <HeroSkeleton className="h-6 w-52 rounded-lg" />
            <div className="flex items-center gap-2">
              <HeroSkeleton className="h-9 w-48 rounded-xl" />
              <HeroSkeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <HeroSkeleton className="h-10 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
            <HeroSkeleton className="h-14 w-full rounded-xl" />
          </div>
        </HeroCard>
      </div>

      <div className="w-full flex items-center justify-center pt-2">
        <p className="text-xs font-bold tracking-wider text-default-500 uppercase animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default PageLoadingFallback;
