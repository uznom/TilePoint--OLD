import { useState, useRef, useEffect, UIEvent, useCallback, useMemo } from 'react';

interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 5,
}: UseVirtualListOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.clientHeight > 0) {
        setContainerHeight((prev) => (prev !== el.clientHeight ? el.clientHeight : prev));
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { startIndex, endIndex, visibleIndices, paddingTop, paddingBottom, totalHeight } =
    useMemo(() => {
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(
        Math.max(0, itemCount - 1),
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );

      const indices: number[] = [];
      if (itemCount > 0) {
        for (let i = start; i <= end && i < itemCount; i++) {
          indices.push(i);
        }
      }

      const top = start * itemHeight;
      const bottom = Math.max(0, (itemCount - 1 - end) * itemHeight);
      const total = itemCount * itemHeight;

      return {
        startIndex: start,
        endIndex: end,
        visibleIndices: indices,
        paddingTop: top,
        paddingBottom: bottom,
        totalHeight: total,
      };
    }, [scrollTop, itemHeight, overscan, itemCount, containerHeight]);

  return {
    containerRef,
    handleScroll,
    startIndex,
    endIndex,
    visibleIndices,
    paddingTop,
    paddingBottom,
    totalHeight,
  };
}
