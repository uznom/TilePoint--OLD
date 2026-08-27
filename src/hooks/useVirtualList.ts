import { useState, useRef, useEffect, UIEvent, useCallback } from 'react';

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

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    Math.max(0, itemCount - 1),
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleIndices: number[] = [];
  if (itemCount > 0) {
    for (let i = startIndex; i <= endIndex && i < itemCount; i++) {
      visibleIndices.push(i);
    }
  }

  const paddingTop = startIndex * itemHeight;
  const paddingBottom = Math.max(0, (itemCount - 1 - endIndex) * itemHeight);

  return {
    containerRef,
    handleScroll,
    startIndex,
    endIndex,
    visibleIndices,
    paddingTop,
    paddingBottom,
    totalHeight: itemCount * itemHeight,
  };
}
