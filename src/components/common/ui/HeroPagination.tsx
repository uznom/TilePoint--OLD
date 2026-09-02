import React from 'react';
import { HeroButton } from './HeroButton';

export interface HeroPaginationProps {
  total: number;
  page: number;
  onChange: (page: number) => void;
  siblings?: number;
  boundaries?: number;
  showControls?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export const HeroPagination: React.FC<HeroPaginationProps> = ({
  total,
  page,
  onChange,
  siblings = 1,
  boundaries = 1,
  showControls = true,
  className = '',
  size = 'sm',
  id,
}) => {
  if (total <= 1) return null;

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const generatePagination = () => {
    const totalPageNumbers = siblings * 2 + 3 + boundaries * 2;

    if (totalPageNumbers >= total) {
      return range(1, total);
    }

    const leftSiblingIndex = Math.max(page - siblings, boundaries);
    const rightSiblingIndex = Math.min(page + siblings, total - boundaries);

    const shouldShowLeftDots = leftSiblingIndex > boundaries + 2;
    const shouldShowRightDots = rightSiblingIndex < total - (boundaries + 1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblings;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, '...', total];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblings;
      const rightRange = range(total - rightItemCount + 1, total);
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, '...', ...middleRange, '...', total];
    }

    return range(1, total);
  };

  const paginationItems = generatePagination();

  return (
    <nav id={id} data-slot="pagination" className={`pagination flex items-center gap-1 select-none font-sans ${className}`} aria-label="Pagination">
      {showControls && (
        <HeroButton
          size={size}
          variant="flat"
          color="default"
          isIconOnly
          isDisabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          data-slot="prev"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </HeroButton>
      )}

      {paginationItems.map((item, idx) => {
        if (item === '...') {
          return (
            <span
              key={`dots-${idx}`}
              data-slot="dots"
              className="w-8 h-8 flex items-center justify-center text-xs text-default-400 font-bold"
            >
              ...
            </span>
          );
        }

        const pageNum = Number(item);
        const isActive = pageNum === page;

        return (
          <HeroButton
            key={`page-${pageNum}`}
            size={size}
            variant={isActive ? 'solid' : 'flat'}
            color={isActive ? 'primary' : 'default'}
            isIconOnly
            onClick={() => onChange(pageNum)}
            aria-current={isActive ? 'page' : undefined}
            data-slot="item"
          >
            {pageNum}
          </HeroButton>
        );
      })}

      {showControls && (
        <HeroButton
          size={size}
          variant="flat"
          color="default"
          isIconOnly
          isDisabled={page >= total}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          data-slot="next"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </HeroButton>
      )}
    </nav>
  );
};

export const Pagination = HeroPagination;

export default HeroPagination;

