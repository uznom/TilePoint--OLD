import { useState, useEffect, RefObject } from 'react';

export interface FloatingPlacementOptions {
  popoverWidth?: number;
  popoverHeight?: number;
  offset?: number;
  isOpen: boolean;
}

export function useFloatingPlacement(
  triggerRef: RefObject<HTMLElement | null>,
  { popoverWidth = 320, popoverHeight = 360, offset = 8, isOpen }: FloatingPlacementOptions
) {
  const [placement, setPlacement] = useState<{
    horizontal: 'left' | 'right' | 'center';
    vertical: 'bottom' | 'top';
  }>({ horizontal: 'left', vertical: 'bottom' });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const calculatePlacement = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Horizontal collision check
      let h: 'left' | 'right' | 'center' = 'left';
      if (viewportWidth < popoverWidth + 24) {
        h = 'center';
      } else if (rect.left + popoverWidth > viewportWidth - 16) {
        h = 'right';
      } else {
        h = 'left';
      }

      // Vertical collision check
      let v: 'bottom' | 'top' = 'bottom';
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < popoverHeight + offset && spaceAbove > popoverHeight + offset) {
        v = 'top';
      } else {
        v = 'bottom';
      }

      setPlacement({ horizontal: h, vertical: v });
    };

    calculatePlacement();
    window.addEventListener('resize', calculatePlacement);
    window.addEventListener('scroll', calculatePlacement, true);
    return () => {
      window.removeEventListener('resize', calculatePlacement);
      window.removeEventListener('scroll', calculatePlacement, true);
    };
  }, [isOpen, triggerRef, popoverWidth, popoverHeight, offset]);

  const getPositionClasses = () => {
    let classes = '';
    // Vertical
    if (placement.vertical === 'top') {
      classes += 'bottom-full mb-2 top-auto ';
    } else {
      classes += 'top-full mt-2 bottom-auto ';
    }

    // Horizontal
    if (placement.horizontal === 'right') {
      classes += 'right-0 left-auto ';
    } else if (placement.horizontal === 'center') {
      classes += 'left-1/2 -translate-x-1/2 ';
    } else {
      classes += 'left-0 right-auto ';
    }

    return classes.trim();
  };

  return { placement, getPositionClasses };
}
