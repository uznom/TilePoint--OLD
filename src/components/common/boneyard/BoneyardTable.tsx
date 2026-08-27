import React from 'react';
import { Boneyard } from './Boneyard';

export interface BoneyardTableProps {
  /** Number of placeholder rows to display (default: 5) */
  rows?: number;
  /** Number of columns (default: 5) */
  columns?: number;
  /** Whether to render top search / filter bar skeleton */
  hasToolbar?: boolean;
  /** Whether to render bottom pagination bar skeleton */
  hasPagination?: boolean;
  /** Extra wrapper classes */
  className?: string;
  /** Optional custom ID */
  id?: string;
}

/**
 * BoneyardTable: Skeleton placeholder for dense enterprise data tables and ledgers.
 */
export const BoneyardTable: React.FC<BoneyardTableProps> = ({
  rows = 5,
  columns = 5,
  hasToolbar = true,
  hasPagination = true,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`bg-content1 rounded-2xl border border-divider/20 p-4 space-y-4 shadow-xs ${className}`}
    >
      {/* Top Toolbar Placeholder */}
      {hasToolbar && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-divider/15">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Boneyard variant="rounded" width="w-full" height="h-9" className="rounded-xl" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Boneyard variant="rounded" width="w-24" height="h-9" className="rounded-xl" />
            <Boneyard variant="rounded" width="w-24" height="h-9" className="rounded-xl" />
          </div>
        </div>
      )}

      {/* Table Structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-divider/20">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={`th-${i}`} className="p-3">
                  <Boneyard
                    variant="text"
                    width={i === 0 ? 'w-24' : i === columns - 1 ? 'w-16' : 'w-20'}
                    height="h-3.5"
                  />
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-divider/10">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={`tr-${rIdx}`} className="hover:bg-content2/30 transition-colors">
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={`td-${rIdx}-${cIdx}`} className="p-3">
                    {cIdx === 0 ? (
                      <div className="flex items-center gap-2.5">
                        <Boneyard variant="rounded" width="w-7" height="h-7" className="rounded-lg shrink-0" />
                        <div className="space-y-1">
                          <Boneyard variant="text" width="w-28" height="h-3" />
                          <Boneyard variant="text" width="w-16" height="h-2" />
                        </div>
                      </div>
                    ) : cIdx === columns - 1 ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Boneyard variant="pill" width="w-14" height="h-6" />
                        <Boneyard variant="rounded" width="w-6" height="h-6" className="rounded-lg" />
                      </div>
                    ) : cIdx === 1 ? (
                      <Boneyard variant="pill" width="w-18" height="h-5" />
                    ) : (
                      <Boneyard variant="text" width="w-20" height="h-3" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination Placeholder */}
      {hasPagination && (
        <div className="pt-2 border-t border-divider/15 flex items-center justify-between">
          <Boneyard variant="text" width="w-32" height="h-3" />
          <div className="flex items-center gap-1.5">
            <Boneyard variant="rounded" width="w-8" height="h-8" className="rounded-lg" />
            <Boneyard variant="rounded" width="w-8" height="h-8" className="rounded-lg" />
            <Boneyard variant="rounded" width="w-8" height="h-8" className="rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BoneyardTable;
