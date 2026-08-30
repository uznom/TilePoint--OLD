/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface ExpressiveTooltipProps {
  children: React.ReactNode;
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  id?: string;
}

export const ExpressiveTooltip: React.FC<ExpressiveTooltipProps> = ({
  children,
  content,
  title,
  position = 'top',
  id,
}) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offset = 10;

    let top: number;
    let left: number;

    switch (position) {
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
      case 'top':
      default:
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setShow(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(false);
    }, 150);
  };

  useEffect(() => {
    if (!show) return;
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
  }, [show, updatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getTransformStyles = () => {
    switch (position) {
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
      case 'top':
      default:
        return 'translate(-50%, -100%)';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return '-top-1.5 left-1/2 -translate-x-1/2 border-b-content3 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return '-right-1.5 top-1/2 -translate-y-1/2 border-l-content3 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return '-left-1.5 top-1/2 -translate-y-1/2 border-r-content3 border-t-transparent border-b-transparent border-l-transparent';
      case 'top':
      default:
        return '-bottom-1.5 left-1/2 -translate-x-1/2 border-t-content3 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      id={id}
    >
      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {show && coords && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: getTransformStyles(),
                  zIndex: 999999,
                }}
                className="w-64 pointer-events-none select-none"
              >
                {/* Expressive Container */}
                <div className="relative px-4 py-3 rounded-2xl border border-divider/40 bg-content3 text-foreground text-left flex flex-col gap-1 shadow-2xl backdrop-blur-xl">
                  {/* Header Title if provided */}
                  {title && (
                    <div className="font-sans text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {title}
                    </div>
                  )}
                  {/* Tooltip Content Body */}
                  <div className="font-sans text-[11px] leading-relaxed font-medium text-foreground">
                    {content}
                  </div>

                  {/* Expressive Hint Indicator */}
                  <div className="text-[8px] uppercase tracking-wider mt-1 text-right text-default-400">
                    Expressive Help Hub
                  </div>

                  {/* Caret Indicator */}
                  <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
