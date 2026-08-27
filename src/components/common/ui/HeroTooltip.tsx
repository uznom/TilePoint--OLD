import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export type HeroTooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

export type HeroTooltipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'foreground';

export interface HeroTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: HeroTooltipPlacement;
  color?: HeroTooltipColor;
  delay?: number;
  closeDelay?: number;
  offset?: number;
  isDisabled?: boolean;
  showArrow?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

export const HeroTooltip: React.FC<HeroTooltipProps> = ({
  content,
  children,
  placement = 'top',
  color = 'default',
  delay = 150,
  closeDelay = 100,
  offset = 8,
  isDisabled = false,
  showArrow = true,
  className = '',
  wrapperClassName,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; transformOrigin: string } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();

    // Default calculations based on triggerRect
    let top = 0;
    let left = 0;
    let transformOrigin = 'bottom center';

    switch (placement) {
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + triggerRect.width / 2;
        transformOrigin = 'top center';
        break;
      case 'bottom-start':
        top = triggerRect.bottom + offset;
        left = triggerRect.left;
        transformOrigin = 'top left';
        break;
      case 'bottom-end':
        top = triggerRect.bottom + offset;
        left = triggerRect.right;
        transformOrigin = 'top right';
        break;
      case 'top-start':
        top = triggerRect.top - offset;
        left = triggerRect.left;
        transformOrigin = 'bottom left';
        break;
      case 'top-end':
        top = triggerRect.top - offset;
        left = triggerRect.right;
        transformOrigin = 'bottom right';
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2;
        left = triggerRect.left - offset;
        transformOrigin = 'center right';
        break;
      case 'left-start':
        top = triggerRect.top;
        left = triggerRect.left - offset;
        transformOrigin = 'top right';
        break;
      case 'left-end':
        top = triggerRect.bottom;
        left = triggerRect.left - offset;
        transformOrigin = 'bottom right';
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2;
        left = triggerRect.right + offset;
        transformOrigin = 'center left';
        break;
      case 'right-start':
        top = triggerRect.top;
        left = triggerRect.right + offset;
        transformOrigin = 'top left';
        break;
      case 'right-end':
        top = triggerRect.bottom;
        left = triggerRect.right + offset;
        transformOrigin = 'bottom left';
        break;
      case 'top':
      default:
        top = triggerRect.top - offset;
        left = triggerRect.left + triggerRect.width / 2;
        transformOrigin = 'bottom center';
        break;
    }

    setCoords({ top, left, transformOrigin });
  }, [placement, offset]);

  const handleMouseEnter = () => {
    if (isDisabled || !content) return;
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  const handleFocus = () => {
    if (isDisabled || !content) return;
    clearTimer();
    updatePosition();
    setIsOpen(true);
  };

  const handleBlur = () => {
    clearTimer();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  // Compute transform translation style based on placement
  const getTransformStyles = () => {
    switch (placement) {
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'bottom-start':
        return 'translate(0, 0)';
      case 'bottom-end':
        return 'translate(-100%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'left-start':
        return 'translate(-100%, 0)';
      case 'left-end':
        return 'translate(-100%, -100%)';
      case 'right':
        return 'translate(0, -50%)';
      case 'right-start':
        return 'translate(0, 0)';
      case 'right-end':
        return 'translate(0, -100%)';
      case 'top-start':
        return 'translate(0, -100%)';
      case 'top-end':
        return 'translate(-100%, -100%)';
      case 'top':
      default:
        return 'translate(-50%, -100%)';
    }
  };

  // Compute Arrow position classes
  const getArrowClasses = () => {
    switch (placement) {
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0';
      case 'bottom-start':
        return '-top-1 left-3 border-t-0 border-l-0';
      case 'bottom-end':
        return '-top-1 right-3 border-t-0 border-l-0';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2 border-b-0 border-l-0';
      case 'left-start':
        return '-right-1 top-2.5 border-b-0 border-l-0';
      case 'left-end':
        return '-right-1 bottom-2.5 border-b-0 border-l-0';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2 border-t-0 border-r-0';
      case 'right-start':
        return '-left-1 top-2.5 border-t-0 border-r-0';
      case 'right-end':
        return '-left-1 bottom-2.5 border-t-0 border-r-0';
      case 'top-start':
        return '-bottom-1 left-3 border-t-0 border-l-0';
      case 'top-end':
        return '-bottom-1 right-3 border-t-0 border-l-0';
      case 'top':
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0';
    }
  };

  // Color styles
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary/30';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25 border border-secondary/30';
      case 'success':
        return 'bg-success text-success-foreground shadow-lg shadow-success/25 border border-success/30';
      case 'warning':
        return 'bg-warning text-warning-foreground shadow-lg shadow-warning/25 border border-warning/30';
      case 'danger':
        return 'bg-danger text-danger-foreground shadow-lg shadow-danger/25 border border-danger/30';
      case 'foreground':
        return 'bg-foreground text-background shadow-2xl border border-divider/40';
      case 'default':
      default:
        return 'bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 shadow-2xl border border-zinc-700/60';
    }
  };

  if (isDisabled || !content) {
    return children;
  }

  return (
    <div
      ref={triggerRef}
      className={wrapperClassName || "relative inline-flex items-center"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={tooltipRef}
                id={id}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: getTransformStyles(),
                  transformOrigin: coords.transformOrigin,
                  pointerEvents: 'none',
                  zIndex: 999999,
                }}
                className={`px-2.5 py-1.5 text-[11px] font-semibold tracking-wide rounded-lg whitespace-nowrap select-none ${getColorClasses()} ${className}`}
              >
                {content}
                {showArrow && (
                  <span
                    className={`absolute w-2 h-2 rotate-45 ${getColorClasses()} ${getArrowClasses()}`}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default HeroTooltip;
