/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  id
}) => {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShow(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Compute position coordinates/classes for the tooltip box
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-3';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-3';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-3';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-3';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--m3-surface-container-high)] border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-[var(--m3-surface-container-high)] border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-[var(--m3-surface-container-high)] border-t-transparent border-b-transparent border-l-transparent';
      case 'top':
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-[var(--m3-surface-container-high)] border-l-transparent border-r-transparent border-b-transparent';
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
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: position === 'top' ? 2 : position === 'bottom' ? -2 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={`absolute ${getPositionClasses()} z-[1000] w-64 pointer-events-none select-none`}
          >
            {/* Expressive M3 Container */}
            <div 
              style={{
                boxShadow: '0 8px 30px rgba(var(--m3-primary-rgb, 21, 94, 239), 0.12), 0 2px 8px var(--m3-primary-container-shadow, rgba(0,0,0,0.08))',
                backgroundColor: 'var(--m3-surface-container-high, #1e2025)',
                borderColor: 'var(--m3-outline-variant, rgba(255,255,255,0.15))'
              }}
              className="px-4 py-3 rounded-2xl border text-left flex flex-col gap-1 backdrop-blur-xl bg-opacity-95"
            >
              {/* Header Title if provided */}
              {title && (
                <div 
                  style={{ color: 'var(--m3-primary, #0d9384)' }} 
                  className="font-sans text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {title}
                </div>
              )}
              {/* Tooltip Content Body */}
              <div 
                style={{ color: 'var(--m3-on-surface, #ffffff)' }} 
                className="font-sans text-[11px] leading-relaxed font-medium"
              >
                {content}
              </div>

              {/* Expressive Hint Indicator */}
              <div 
                style={{ color: 'var(--m3-on-surface-variant, #a1a1aa)' }} 
                className="font-mono text-[8px] uppercase tracking-wider mt-1 text-right"
              >
                Expressive Help Hub
              </div>
            </div>

            {/* M3 Triangular Caret Indicator */}
            <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
