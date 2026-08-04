import { useState, useMemo } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  paginatedItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canNextPage: boolean;
  canPrevPage: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

/**
 * Custom hook to handle array pagination cleanly.
 */
export function usePagination<T>(
  items: T[],
  options?: UsePaginationOptions
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10 } = options || {};

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page remains within valid range
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const setPage = (page: number) => {
    const valid = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(valid);
  };

  const setPageSize = (size: number) => {
    const newSize = Math.max(1, size);
    setPageSizeState(newSize);
    setCurrentPage(1);
  };

  const nextPage = () => {
    if (safePage < totalPages) setCurrentPage(safePage + 1);
  };

  const prevPage = () => {
    if (safePage > 1) setCurrentPage(safePage - 1);
  };

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    paginatedItems,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    canNextPage: safePage < totalPages,
    canPrevPage: safePage > 1,
    startIndex,
    endIndex,
    totalItems,
  };
}
