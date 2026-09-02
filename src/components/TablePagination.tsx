/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroButton } from "./common/ui/HeroButton";

/**
 * Custom React Hook to compute page size dynamically based on available screen height.
 * This guarantees tables and lists maximize their size to fit any resolution (Tablet, Desktop, 4K)
 * without requiring vertical scrolling of the main page viewport.
 */
export function useResponsivePageSize(rowHeight = 48, offsetHeight = 360, defaultPageSize = 8) {
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === "undefined") return defaultPageSize;
    const available = window.innerHeight - offsetHeight;
    return Math.max(Math.floor(available / rowHeight), 4);
  });

  useEffect(() => {
    const handleResize = () => {
      const available = window.innerHeight - offsetHeight;
      setPageSize(Math.max(Math.floor(available / rowHeight), 4));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rowHeight, offsetHeight]);

  return pageSize;
}

export interface TableAutoPageSizeOptions {
  rowHeight?: number;
  minRows?: number;
  maxRows?: number;
  paddingOffset?: number;
  bottomBuffer?: number;
}

/**
 * React Hook that calculates the available screen/viewport height for table components
 * and dynamically adjusts the row count per page to ensure optimal display without vertical scrolling.
 */
export function useTableAutoPageSize(
  containerRef?: React.RefObject<HTMLElement | null>,
  options: TableAutoPageSizeOptions = {}
) {
  const {
    rowHeight = 52,
    minRows = 4,
    maxRows = 50,
    paddingOffset = 340,
    bottomBuffer = 110,
  } = options;

  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return 8;
    return Math.max(Math.floor((window.innerHeight - paddingOffset) / rowHeight), minRows);
  });

  useEffect(() => {
    const calculatePageSize = () => {
      if (typeof window === "undefined") return;
      let availableHeight = window.innerHeight - paddingOffset;

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const remainingScreenHeight = window.innerHeight - rect.top - bottomBuffer;
        if (remainingScreenHeight > 100) {
          availableHeight = remainingScreenHeight;
        }
      }

      const calculated = Math.floor(availableHeight / rowHeight);
      const fittedRows = Math.min(Math.max(calculated, minRows), maxRows);
      setPageSize((prev) => (prev !== fittedRows ? fittedRows : prev));
    };

    calculatePageSize();

    window.addEventListener("resize", calculatePageSize);

    return () => {
      window.removeEventListener("resize", calculatePageSize);
    };
  }, [containerRef, rowHeight, minRows, maxRows, paddingOffset, bottomBuffer]);

  return pageSize;
}

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemName = "entries",
  className = "",
}) => {
  const [, setThemeTick] = useState(0);

  // Re-render immediately on dynamic theme switch
  useEffect(() => {
    const handleSync = () => setThemeTick((t) => t + 1);
    window.addEventListener("tilepoint-theme-updated", handleSync);
    return () => window.removeEventListener("tilepoint-theme-updated", handleSync);
  }, []);

  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safePage <= 3) {
        pages.push(1, 2, 3, 4, totalPages);
      } else if (safePage >= totalPages - 2) {
        pages.push(1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, safePage - 1, safePage, safePage + 1, totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-6 mb-8 border-t border-divider/20 text-xs font-medium text-default-500 font-sans ${className}`}>
      <div>
        Showing <span className="text-primary font-bold font-mono">{startItem}</span> to{" "}
        <span className="text-primary font-bold font-mono">{endItem}</span> of{" "}
        <span className="text-primary font-bold font-mono">{totalItems}</span> {itemName}
      </div>
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-200/50 dark:border-white/5">
        <HeroButton
          variant="flat"
          size="sm"
          isIconOnly
          radius="full"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          className="min-w-8 h-8 rounded-full"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </HeroButton>

        {getPageNumbers().map((p, idx, arr) => {
          const isGap = idx > 0 && p - arr[idx - 1] > 1;
          const isActive = safePage === p;
          return (
            <React.Fragment key={p}>
              {isGap && <span className="px-1 text-default-400 font-mono">...</span>}
              <HeroButton
                color={isActive ? "primary" : "default"}
                variant={isActive ? "solid" : "light"}
                size="sm"
                isIconOnly
                radius="full"
                onClick={() => onPageChange(p)}
                className={`min-w-8 h-8 rounded-full text-center font-bold text-xs ${
                  isActive ? "shadow-[0_2px_8px_rgba(0,111,238,0.25)]" : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {p}
              </HeroButton>
            </React.Fragment>
          );
        })}

        <HeroButton
          variant="flat"
          size="sm"
          isIconOnly
          radius="full"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          className="min-w-8 h-8 rounded-full"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </HeroButton>
      </div>
    </div>
  );
};
