import React from 'react';
import { Boneyard } from './Boneyard';

export interface BoneyardCardProps {
  /** Optional title */
  hasIcon?: boolean;
  /** Extra wrapper classes */
  className?: string;
  /** Optional custom ID */
  id?: string;
}

/**
 * BoneyardCard: Skeleton placeholder for KPI metrics, cards, and overview blocks.
 */
export const BoneyardCard: React.FC<BoneyardCardProps> = ({
  hasIcon = true,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`p-5 rounded-2xl bg-content1 border border-divider/20 shadow-xs space-y-3.5 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {hasIcon && (
            <Boneyard variant="rounded" width="w-9" height="h-9" className="rounded-xl shrink-0" />
          )}
          <div className="space-y-1">
            <Boneyard variant="text" width="w-24" height="h-3" />
            <Boneyard variant="text" width="w-16" height="h-2" />
          </div>
        </div>
        <Boneyard variant="pill" width="w-14" height="h-5" />
      </div>

      {/* Main Metric Value */}
      <div className="pt-1 space-y-1.5">
        <Boneyard variant="rounded" width="w-36" height="h-8" />
        <Boneyard variant="text" width="w-48" height="h-3" />
      </div>

      {/* Bottom Micro Divider & Trend */}
      <div className="pt-2 border-t border-divider/10 flex items-center justify-between">
        <Boneyard variant="text" width="w-20" height="h-3" />
        <Boneyard variant="text" width="w-16" height="h-3" />
      </div>
    </div>
  );
};

export default BoneyardCard;
