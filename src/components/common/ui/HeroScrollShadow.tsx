import React, { useRef, useState, useEffect } from 'react';

export type HeroScrollShadowOrientation = 'vertical' | 'horizontal';

export interface HeroScrollShadowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: HeroScrollShadowOrientation;
  hideScrollBar?: boolean;
  offset?: number;
  size?: number;
  className?: string;
}

export const HeroScrollShadow = React.forwardRef<HTMLDivElement, HeroScrollShadowProps>(
  (
    {
      children,
      orientation = 'vertical',
      hideScrollBar = false,
      offset = 0,
      size = 32,
      className = '',
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const containerRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    const [hasTopShadow, setHasTopShadow] = useState(false);
    const [hasBottomShadow, setHasBottomShadow] = useState(false);
    const [hasLeftShadow, setHasLeftShadow] = useState(false);
    const [hasRightShadow, setHasRightShadow] = useState(false);

    const handleScroll = React.useCallback(() => {
      const el = containerRef.current;
      if (!el) return;

      if (orientation === 'vertical') {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;

        setHasTopShadow(scrollTop > offset);
        setHasBottomShadow(scrollTop + clientHeight < scrollHeight - offset);
      } else {
        const scrollLeft = el.scrollLeft;
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;

        setHasLeftShadow(scrollLeft > offset);
        setHasRightShadow(scrollLeft + clientWidth < scrollWidth - offset);
      }
    }, [orientation, offset, containerRef]);

    useEffect(() => {
      handleScroll();
      const el = containerRef.current;
      if (!el) return;

      el.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);

      return () => {
        el.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }, [handleScroll, containerRef]);

    return (
      <div data-slot="scroll-shadow" className="scroll-shadow relative overflow-hidden">
        {/* Scroll Container */}
        <div
          ref={containerRef}
          data-slot="container"
          className={`${
            orientation === 'vertical' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'
          } ${hideScrollBar ? 'scrollbar-none' : ''} ${className}`}
          {...props}
        >
          {children}
        </div>

        {/* Top Shadow */}
        {orientation === 'vertical' && (
          <div
            data-slot="top-shadow"
            className={`pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent transition-opacity duration-200 z-10 ${
              hasTopShadow ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Bottom Shadow */}
        {orientation === 'vertical' && (
          <div
            data-slot="bottom-shadow"
            className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent transition-opacity duration-200 z-10 ${
              hasBottomShadow ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Left Shadow */}
        {orientation === 'horizontal' && (
          <div
            data-slot="left-shadow"
            className={`pointer-events-none absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 z-10 ${
              hasLeftShadow ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Right Shadow */}
        {orientation === 'horizontal' && (
          <div
            data-slot="right-shadow"
            className={`pointer-events-none absolute top-0 bottom-0 right-0 w-6 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 z-10 ${
              hasRightShadow ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
    );
  }
);

HeroScrollShadow.displayName = 'HeroScrollShadow';

export const ScrollShadow = HeroScrollShadow;

export default HeroScrollShadow;
