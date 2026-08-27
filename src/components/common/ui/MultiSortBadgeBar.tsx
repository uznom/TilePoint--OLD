import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import { SortDescriptor } from '../../../lib/multiSortHelper';

export interface MultiSortBadgeBarProps {
  sortDescriptors: SortDescriptor[];
  onRemoveSort: (column: string) => void;
  onClearSort: () => void;
  columnLabels?: Record<string, string>;
  className?: string;
}

export const MultiSortBadgeBar: React.FC<MultiSortBadgeBarProps> = ({
  sortDescriptors,
  onRemoveSort,
  onClearSort,
  columnLabels = {},
  className = '',
}) => {
  if (!sortDescriptors || sortDescriptors.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 py-1 px-2.5 bg-primary/5 rounded-xl border border-primary/20 text-xs animate-fade-in ${className}`}
    >
      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-primary tracking-wider shrink-0 mr-1">
        <ArrowUpDown className="h-3 w-3" />
        <span>Multi-Sort:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {sortDescriptors.map((sd, index) => {
          const label = columnLabels[sd.column] || sd.column;
          const isAsc = sd.direction === 'ascending';

          return (
            <span
              key={sd.column}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-content1 border border-primary/30 text-[10px] font-bold text-foreground shadow-2xs"
            >
              {sortDescriptors.length > 1 && (
                <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-black flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
              )}
              <span>{label}</span>
              {isAsc ? (
                <ArrowUp className="h-2.5 w-2.5 text-emerald-500" />
              ) : (
                <ArrowDown className="h-2.5 w-2.5 text-sky-500" />
              )}
              <button
                type="button"
                onClick={() => onRemoveSort(sd.column)}
                className="hover:text-rose-500 text-default-400 p-0.5 rounded-md transition-colors cursor-pointer"
                title={`Remove ${label} sort`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          );
        })}
      </div>

      {sortDescriptors.length > 0 && (
        <button
          type="button"
          onClick={onClearSort}
          className="ml-auto text-[9.5px] font-bold uppercase tracking-wider text-default-400 hover:text-rose-500 underline underline-offset-2 transition-colors cursor-pointer shrink-0"
        >
          Reset Sort
        </button>
      )}
    </div>
  );
};
