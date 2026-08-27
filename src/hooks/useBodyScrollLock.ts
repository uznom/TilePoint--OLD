import { useEffect } from 'react';

let lockCount = 0;

/**
 * Custom hook to lock body scrolling when a modal, drawer, or dialog is open.
 * Supports nested and multiple concurrent modals safely with reference counting.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    lockCount++;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Measure scrollbar width to prevent layout shift
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('modal-open');

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.paddingRight = originalPaddingRight || '';
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [isLocked]);
}
