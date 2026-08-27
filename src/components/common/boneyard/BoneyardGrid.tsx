import React from 'react';
import { Boneyard } from './Boneyard';

export interface BoneyardGridProps {
  /** Total number of card items (default: 6) */
  count?: number;
  /** Extra wrapper classes */
  className?: string;
  /** Optional custom ID */
  id?: string;
}

/**
 * BoneyardGrid: Skeleton placeholder for product catalogs, tile shelves, and gallery cards.
 */
export const BoneyardGrid: React.FC<BoneyardGridProps> = ({
  count = 6,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`grid-skel-${idx}`}
          className="p-3 bg-content1 rounded-2xl border border-divider/20 shadow-xs space-y-2.5 flex flex-col justify-between"
        >
          {/* Top Aspect Ratio Media Box */}
          <div className="space-y-2">
            <Boneyard
              variant="rounded"
              height="h-28"
              className="w-full rounded-xl"
            />
            {/* Title & SKU */}
            <div className="space-y-1 pt-0.5">
              <Boneyard variant="text" width="w-4/5" height="h-3" />
              <Boneyard variant="text" width="w-1/2" height="h-2.5" />
            </div>
          </div>

          {/* Price & Action Footer */}
          <div className="pt-2 border-t border-divider/10 flex items-center justify-between">
            <Boneyard variant="text" width="w-14" height="h-3.5" />
            <Boneyard variant="rounded" width="w-7" height="h-7" className="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BoneyardGrid;
