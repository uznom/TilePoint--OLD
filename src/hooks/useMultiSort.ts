import { useState, useCallback } from 'react';
import { SortDescriptor, SortDirection, sortWithDescriptors } from '../lib/multiSortHelper';

export interface UseMultiSortOptions<T = any> {
  initialSort?: SortDescriptor[];
  customGetters?: Record<string, (item: T) => any>;
  enableMultiSortByDefault?: boolean;
}

export function useMultiSort<T = any>(options?: UseMultiSortOptions<T>) {
  const [sortDescriptors, setSortDescriptors] = useState<SortDescriptor[]>(options?.initialSort || []);
  const enableMultiByDefault = options?.enableMultiSortByDefault ?? false;

  const handleSort = useCallback(
    (column: string, e?: React.MouseEvent | boolean) => {
      const isMulti = typeof e === 'boolean' ? e : (e?.shiftKey || enableMultiByDefault);

      setSortDescriptors((prev) => {
        const existingIdx = prev.findIndex((d) => d.column === column);

        if (isMulti) {
          // Multi-column sorting mode
          if (existingIdx === -1) {
            // Add column ascending to priority queue
            return [...prev, { column, direction: 'ascending' }];
          }
          const current = prev[existingIdx];
          if (current.direction === 'ascending') {
            // Cycle to descending
            const updated = [...prev];
            updated[existingIdx] = { column, direction: 'descending' };
            return updated;
          } else {
            // Remove from multi-sort queue
            return prev.filter((_, idx) => idx !== existingIdx);
          }
        } else {
          // Single-column sort or primary toggle
          if (prev.length === 1 && prev[0].column === column) {
            if (prev[0].direction === 'ascending') {
              return [{ column, direction: 'descending' }];
            } else {
              return [];
            }
          } else {
            return [{ column, direction: 'ascending' }];
          }
        }
      });
    },
    [enableMultiByDefault]
  );

  const getSortDirection = useCallback(
    (column: string): SortDirection => {
      const found = sortDescriptors.find((d) => d.column === column);
      return found ? found.direction : 'none';
    },
    [sortDescriptors]
  );

  const getSortRank = useCallback(
    (column: string): number | null => {
      if (sortDescriptors.length <= 1) return null;
      const idx = sortDescriptors.findIndex((d) => d.column === column);
      return idx >= 0 ? idx + 1 : null;
    },
    [sortDescriptors]
  );

  const removeSort = useCallback((column: string) => {
    setSortDescriptors((prev) => prev.filter((d) => d.column !== column));
  }, []);

  const clearSort = useCallback(() => {
    setSortDescriptors([]);
  }, []);

  const sortData = useCallback(
    (data: T[], dynamicGetters?: Record<string, (item: T) => any>): T[] => {
      return sortWithDescriptors(data, sortDescriptors, dynamicGetters || options?.customGetters);
    },
    [sortDescriptors, options?.customGetters]
  );

  return {
    sortDescriptors,
    setSortDescriptors,
    handleSort,
    getSortDirection,
    getSortRank,
    removeSort,
    clearSort,
    sortData,
    isSorted: sortDescriptors.length > 0,
    sortCount: sortDescriptors.length,
  };
}
