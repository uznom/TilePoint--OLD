import React from 'react';
import { Boneyard } from './Boneyard';
import { BoneyardCard } from './BoneyardCard';
import { BoneyardTable } from './BoneyardTable';

export interface BoneyardDashboardProps {
  /** Optional custom ID */
  id?: string;
  /** Extra wrapper classes */
  className?: string;
}

/**
 * BoneyardDashboard: Comprehensive skeleton loader for the entire Dashboard view.
 */
export const BoneyardDashboard: React.FC<BoneyardDashboardProps> = ({
  id,
  className = '',
}) => {
  return (
    <div id={id} className={`space-y-6 animate-fade-in ${className}`}>
      {/* Top Welcome & Telemetry Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-content1 border border-divider/20 shadow-xs">
        <div className="flex items-center gap-3">
          <Boneyard variant="rounded" width="w-11" height="h-11" className="rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Boneyard variant="text" width="w-48" height="h-4" />
            <Boneyard variant="text" width="w-32" height="h-3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Boneyard variant="pill" width="w-28" height="h-8" />
          <Boneyard variant="rounded" width="w-8" height="h-8" className="rounded-xl" />
        </div>
      </div>

      {/* 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BoneyardCard />
        <BoneyardCard />
        <BoneyardCard />
        <BoneyardCard />
      </div>

      {/* Mid Chart Section & Side Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Skeleton */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-content1 border border-divider/20 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Boneyard variant="text" width="w-36" height="h-4" />
              <Boneyard variant="text" width="w-24" height="h-2.5" />
            </div>
            <Boneyard variant="pill" width="w-20" height="h-6" />
          </div>
          <Boneyard variant="rounded" height="h-64" className="w-full rounded-xl" />
        </div>

        {/* Side Mini Ledger */}
        <div className="p-5 rounded-2xl bg-content1 border border-divider/20 space-y-3.5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <Boneyard variant="text" width="w-32" height="h-4" />
            <div className="space-y-2.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`side-${i}`} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-divider/10">
                  <div className="space-y-1">
                    <Boneyard variant="text" width="w-20" height="h-3" />
                    <Boneyard variant="text" width="w-14" height="h-2" />
                  </div>
                  <Boneyard variant="text" width="w-12" height="h-3" />
                </div>
              ))}
            </div>
          </div>
          <Boneyard variant="rounded" width="w-full" height="h-9" className="rounded-xl mt-2" />
        </div>
      </div>

      {/* Bottom Data Table Skeleton */}
      <BoneyardTable rows={5} columns={5} />
    </div>
  );
};

export default BoneyardDashboard;
